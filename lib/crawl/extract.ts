import { canonicalizeUrl, dedupeUrls, resolveUrl } from "./url";

export type ExtractedLinkSource = "html" | "markdown" | "text";

export type ExtractedLink = {
  /**
   * Canonical, absolute URL after resolution + normalization.
   */
  url: string;
  /**
   * Raw href/URL fragment found in the source content.
   */
  raw: string;
  /**
   * Where we found it (HTML anchor, markdown link, or bare text).
   */
  source: ExtractedLinkSource;
};

export type ExtractLinksInput = {
  baseUrl: string;
  html?: string;
  markdown?: string;
  textFallback?: string;
};

export type ExtractLinksOutput = {
  links: ExtractedLink[];
  urls: string[];
};

function uniqByUrlKeepFirst(links: ExtractedLink[]): ExtractedLink[] {
  const seen = new Set<string>();
  const out: ExtractedLink[] = [];
  for (const l of links) {
    if (seen.has(l.url)) continue;
    seen.add(l.url);
    out.push(l);
  }
  return out;
}

function normalizeCandidate(raw: string): string {
  // Most common HTML entity occurrence is &amp; in query strings.
  return raw.trim().replace(/&amp;/gi, "&");
}

function shouldSkipResolvedUrl(url: string): boolean {
  // Some sites embed giant base64 payloads in pseudo-URLs like:
  //   /image/png;base64,AAAA...
  // These are not crawl targets and can cause upstream crawler failures.
  if (!url) return true;
  if (url.length > 2000) return true; // defensive
  const lower = url.toLowerCase();
  if (lower.includes("base64,")) return true;
  if (lower.includes("image/") && lower.includes("base64")) return true;
  return false;
}

function extractFromHtml(baseUrl: string, html: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];

  // Prefer DOM parsing when available (Bun supports DOM APIs when lib includes DOM).
  // Fallback to regex if DOMParser isn't present at runtime for some reason.
  const hasDomParser =
    typeof (globalThis as unknown as { DOMParser?: unknown }).DOMParser ===
    "function";

  if (hasDomParser) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const anchors = Array.from(doc.querySelectorAll("a[href], area[href]"));
      for (const el of anchors) {
        const href = el.getAttribute("href");
        if (!href) continue;
        const resolved = resolveUrl(baseUrl, normalizeCandidate(href));
        if (!resolved) continue;
        if (shouldSkipResolvedUrl(resolved)) continue;
        out.push({ url: resolved, raw: href, source: "html" });
      }
      return out;
    } catch {
      // fall through to regex parser
    }
  }

  // Regex fallback: capture href value in <a ... href="..."> / <a ... href='...'> / <a ... href=...>
  const hrefRe =
    /<(?:a|area)\b[^>]*?\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'<>`]+))[^>]*>/gi;
  let m: RegExpExecArray | null = hrefRe.exec(html);
  while (m !== null) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    if (!raw) continue;
    const resolved = resolveUrl(baseUrl, normalizeCandidate(raw));
    if (!resolved) continue;
    if (shouldSkipResolvedUrl(resolved)) continue;
    out.push({ url: resolved, raw, source: "html" });
    m = hrefRe.exec(html);
  }

  return out;
}

function extractMarkdownDefinitions(markdown: string): Map<string, string> {
  // [id]: https://example.com "optional title"
  const defs = new Map<string, string>();
  const defRe = /^\s*\[([^\]]+)\]:\s*(\S+)(?:\s+["'(].*)?$/gim;
  let m: RegExpExecArray | null = defRe.exec(markdown);
  while (m !== null) {
    const id = (m[1] ?? "").trim().toLowerCase();
    const url = (m[2] ?? "").trim();
    if (!id || !url) continue;
    defs.set(id, url);
    m = defRe.exec(markdown);
  }
  return defs;
}

function extractFromMarkdown(
  baseUrl: string,
  markdown: string,
): ExtractedLink[] {
  const out: ExtractedLink[] = [];
  const defs = extractMarkdownDefinitions(markdown);

  // Inline: [text](url) or [text](<url>)
  const inlineRe = /\[[^\]]*?\]\(\s*<?([^\s>")]+)[^)]*\)/g;
  let m: RegExpExecArray | null = inlineRe.exec(markdown);
  while (m !== null) {
    const raw = m[1] ?? "";
    if (!raw) continue;
    const resolved = resolveUrl(baseUrl, normalizeCandidate(raw));
    if (!resolved) continue;
    if (shouldSkipResolvedUrl(resolved)) continue;
    out.push({ url: resolved, raw, source: "markdown" });
    m = inlineRe.exec(markdown);
  }

  // Reference-style: [text][id]
  const refRe = /\[[^\]]*?\]\[([^\]]+)\]/g;
  m = refRe.exec(markdown);
  while (m !== null) {
    const id = (m[1] ?? "").trim().toLowerCase();
    const defUrl = id ? defs.get(id) : undefined;
    if (!defUrl) continue;
    const resolved = resolveUrl(baseUrl, normalizeCandidate(defUrl));
    if (!resolved) continue;
    if (shouldSkipResolvedUrl(resolved)) continue;
    out.push({ url: resolved, raw: defUrl, source: "markdown" });
    m = refRe.exec(markdown);
  }

  // Autolinks: <https://example.com>
  const autoRe = /<((?:https?:\/\/)[^>\s]+)>/g;
  m = autoRe.exec(markdown);
  while (m !== null) {
    const raw = m[1] ?? "";
    if (!raw) continue;
    const resolved = canonicalizeUrl(raw);
    if (!resolved) continue;
    if (shouldSkipResolvedUrl(resolved)) continue;
    out.push({ url: resolved, raw, source: "markdown" });
    m = autoRe.exec(markdown);
  }

  return out;
}

function extractFromText(text: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];
  // Low priority: only absolute http(s) URLs.
  const urlRe = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
  let m: RegExpExecArray | null = urlRe.exec(text);
  while (m !== null) {
    const raw = m[0] ?? "";
    if (!raw) continue;
    const resolved = canonicalizeUrl(raw);
    if (!resolved) continue;
    out.push({ url: resolved, raw, source: "text" });
    m = urlRe.exec(text);
  }
  return out;
}

/**
 * Extract outbound links from HTML and/or Markdown and/or fallback text.
 * - Resolves relative links against `baseUrl`
 * - Canonicalizes URLs (drops fragments + common tracking params)
 * - Deduplicates results by canonical URL
 */
export function extractLinks(input: ExtractLinksInput): ExtractLinksOutput {
  const links: ExtractedLink[] = [];

  if (input.html) links.push(...extractFromHtml(input.baseUrl, input.html));
  if (input.markdown)
    links.push(...extractFromMarkdown(input.baseUrl, input.markdown));
  if (input.textFallback) links.push(...extractFromText(input.textFallback));

  const uniqueLinks = uniqByUrlKeepFirst(links);
  const urls = dedupeUrls(uniqueLinks.map((l) => l.url));

  return { links: uniqueLinks, urls };
}
