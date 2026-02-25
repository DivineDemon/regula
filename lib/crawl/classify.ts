import type { Crawl4AIResult } from "./crawl4ai";
import { canonicalizeUrl } from "./url";

export type ResourceKind = "page" | "document" | "unknown";

export type DocumentKind =
  | "pdf"
  | "markdown"
  | "xml"
  | "json"
  | "text"
  | "binary"
  | "unknown";

export type Classification = {
  /**
   * High-level resource classification used by the crawler.
   */
  kind: ResourceKind;
  /**
   * When `kind === "document"`, a best-effort subtype.
   */
  docKind?: DocumentKind;
  /**
   * A short explanation for debugging / logs.
   */
  reason: string;
};

export type ClassifyUrlOptions = {
  /**
   * If true, treat common "download-ish" endpoints as documents even without
   * a file extension.
   * Defaults to true.
   */
  allowDownloadPathHeuristics?: boolean;
};

const DOC_EXT_TO_KIND: Record<string, DocumentKind> = {
  pdf: "pdf",
  md: "markdown",
  markdown: "markdown",
  txt: "text",
  text: "text",
  csv: "text",
  tsv: "text",
  json: "json",
  xml: "xml",
  yml: "text",
  yaml: "text",
  zip: "binary",
  gz: "binary",
  tgz: "binary",
};

function safeUrlParse(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

function lowerFileExtensionFromPath(pathname: string): string | null {
  const last = pathname.split("/").pop() ?? "";
  if (!last) return null;
  // Ignore dotfiles / ".well-known"
  if (last.startsWith(".") && !last.includes(".", 1)) return null;
  const idx = last.lastIndexOf(".");
  if (idx <= 0 || idx === last.length - 1) return null;
  return last.slice(idx + 1).toLowerCase();
}

function urlLooksLikePdf(url: string): boolean {
  // Catch common cases where extension is in path or appears in a query value.
  if (/\.pdf(?:$|[?#&])/i.test(url)) return true;

  // Handle common "PDF endpoint" patterns without a `.pdf` suffix (e.g. EUR-Lex).
  const parsed = safeUrlParse(url);
  if (!parsed) return false;

  const p = parsed.pathname.toLowerCase();
  if (p.includes("/pdf/") || p.endsWith("/pdf") || p.includes("/txt/pdf/"))
    return true;

  // Some endpoints use a query param to signal PDF format.
  for (const [k, v] of parsed.searchParams.entries()) {
    const kl = k.toLowerCase();
    const vl = v.toLowerCase();
    if (kl === "format" && vl === "pdf") return true;
    if (vl.includes(".pdf")) return true;
  }

  return false;
}

function looksLikePdfMagicBytes(text: string | undefined): boolean {
  if (!text) return false;
  const head = text.trimStart().slice(0, 16);
  return head.startsWith("%PDF-");
}

function looksLikeHtml(html: string | undefined): boolean {
  if (!html) return false;
  const s = html.trimStart().toLowerCase();
  return (
    s.startsWith("<!doctype html") ||
    s.startsWith("<html") ||
    s.includes("<html")
  );
}

function looksLikeMarkdown(md: string | undefined): boolean {
  if (!md) return false;
  const s = md.trim();
  if (!s) return false;

  // Heuristics: markdown is likely when we see markdown constructs early.
  const head = s.slice(0, 2000);
  if (/^#{1,6}\s+\S+/m.test(head)) return true;
  if (/^\s*[-*+]\s+\S+/m.test(head)) return true;
  if (/\[[^\]]+\]\([^)]+\)/.test(head)) return true;
  if (/```/.test(head)) return true;

  // If it has very little angle-bracket markup, that also leans markdown/text.
  const angleCount = (head.match(/[<>]/g) ?? []).length;
  return angleCount < 10 && head.length > 200;
}

function classifyByUrlHint(
  url: string,
  opts?: ClassifyUrlOptions,
): Classification | null {
  const parsed = safeUrlParse(url);
  const pathname = parsed?.pathname ?? "";

  // Strong PDF hint should win even if it's in the query.
  if (urlLooksLikePdf(url)) {
    return { kind: "document", docKind: "pdf", reason: "url-hint:.pdf" };
  }

  const ext = lowerFileExtensionFromPath(pathname);
  if (ext && ext in DOC_EXT_TO_KIND) {
    const docKind = DOC_EXT_TO_KIND[ext];
    if (!docKind) return null;
    return {
      kind: "document",
      docKind,
      reason: `url-hint:.${ext}`,
    };
  }

  const allowDownload = opts?.allowDownloadPathHeuristics ?? true;
  if (allowDownload) {
    const p = pathname.toLowerCase();
    if (
      p.includes("/download") ||
      p.includes("/downloads/") ||
      p.includes("/attachment") ||
      p.includes("/attachments/")
    ) {
      return {
        kind: "document",
        docKind: "unknown",
        reason: "url-hint:download-path",
      };
    }
  }

  return null;
}

/**
 * Classify a URL as a `page` vs `document` vs `unknown` using URL hints.
 */
export function classifyUrl(
  url: string,
  opts?: ClassifyUrlOptions,
): Classification {
  const hinted = classifyByUrlHint(url, opts);
  if (hinted) return hinted;
  return { kind: "unknown", reason: "url-hint:none" };
}

export type ClassifyCrawlResultOptions = ClassifyUrlOptions & {
  /**
   * If true, prefer classifying by Crawl4AI content signals over URL hints.
   * Defaults to false (URL hints win when strong, like .pdf).
   */
  preferContentSignals?: boolean;
};

/**
 * Classify based on Crawl4AI output signals + URL hints.
 *
 * Intended behavior:
 * - Strong URL hints (e.g. `.pdf`) classify as document immediately.
 * - Otherwise, use content signals:
 *   - HTML -> page
 *   - PDF magic bytes -> document(pdf)
 *   - Markdown-without-HTML -> document(markdown)
 */
export function classifyCrawlResult(
  result: Crawl4AIResult,
  opts?: ClassifyCrawlResultOptions,
): Classification {
  const bestUrl = result.finalUrl ?? result.requestedUrl;

  // 1) URL hints (extensions/download-ish paths).
  // Important: some sources (e.g. raw markdown URLs) may be wrapped by Crawl4AI
  // into HTML, but are still best treated as documents for our pipeline.
  const urlHint = classifyByUrlHint(bestUrl, opts);
  const preferContentSignals = opts?.preferContentSignals ?? false;

  // If URL strongly indicates a specific document type (extension), treat it as
  // a document even if Crawl4AI returns HTML wrappers.
  if (
    urlHint?.kind === "document" &&
    urlHint.docKind &&
    urlHint.docKind !== "unknown"
  ) {
    return { ...urlHint, reason: `${urlHint.reason}+bestUrl` };
  }

  // If URL hint is a strong PDF hint and caller does not prefer content signals,
  // short-circuit early.
  if (urlHint && urlHint.docKind === "pdf" && !preferContentSignals) {
    return { ...urlHint, reason: `${urlHint.reason}+bestUrl` };
  }

  // 2) Content-based signals.
  if (
    looksLikePdfMagicBytes(result.html) ||
    looksLikePdfMagicBytes(result.content) ||
    looksLikePdfMagicBytes(result.markdown)
  ) {
    return {
      kind: "document",
      docKind: "pdf",
      reason: "crawl4ai:pdf-magic-bytes",
    };
  }

  if (looksLikeHtml(result.html)) {
    return { kind: "page", reason: "crawl4ai:html" };
  }

  if (result.markdown && !result.html && looksLikeMarkdown(result.markdown)) {
    return {
      kind: "document",
      docKind: "markdown",
      reason: "crawl4ai:markdown-without-html",
    };
  }

  // Some endpoints return plain text without HTML; if URL hinted "document", keep it.
  if (urlHint && urlHint.kind === "document") {
    return { ...urlHint, reason: `${urlHint.reason}+fallback` };
  }

  // If Crawl4AI returns no HTML but does return content, treat as unknown doc-ish.
  if (!result.html && result.content && result.content.trim().length > 0) {
    return { kind: "unknown", reason: "crawl4ai:text-only" };
  }

  return { kind: "unknown", reason: "crawl4ai:insufficient-signals" };
}

export type DiscoveredCandidate = {
  /**
   * Canonical (preferred) URL for the candidate.
   */
  url: string;
  /**
   * Optional classification if known.
   */
  classification?: Classification;
};

export type CanonicalSelection = {
  /**
   * The selected canonical document candidate.
   */
  canonical: DiscoveredCandidate;
  /**
   * Why the candidate was selected.
   */
  reason: string;
};

function inferPdfCandidate(candidate: DiscoveredCandidate): boolean {
  if (
    candidate.classification?.kind === "document" &&
    candidate.classification.docKind === "pdf"
  )
    return true;
  return urlLooksLikePdf(candidate.url);
}

function normalizeCandidateUrl(raw: string): string {
  return canonicalizeUrl(raw) ?? raw;
}

function dedupeCandidates(cands: DiscoveredCandidate[]): DiscoveredCandidate[] {
  const seen = new Set<string>();
  const out: DiscoveredCandidate[] = [];
  for (const c of cands) {
    const key = normalizeCandidateUrl(c.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...c, url: key });
  }
  return out;
}

/**
 * Canonical selection policy for multi-hop flows:
 *
 * **pdf_only**: when any PDF is discoverable among candidates, select a PDF as
 * the canonical stored version; keep pages as graph nodes for traversal.
 */
export function selectCanonicalDocPdfOnly(
  candidates: DiscoveredCandidate[],
): CanonicalSelection | null {
  const uniq = dedupeCandidates(candidates).filter((c) => !!c.url);
  if (uniq.length === 0) return null;

  const pdfs = uniq.filter(inferPdfCandidate);
  if (pdfs.length > 0) {
    // Stable choice: prefer shortest URL, then lexicographic.
    pdfs.sort(
      (a, b) => a.url.length - b.url.length || a.url.localeCompare(b.url),
    );
    const first = pdfs[0];
    if (!first) return null;
    return { canonical: first, reason: "pdf_only:pdf-discoverable" };
  }

  // No PDF found: prefer a known document (markdown/text/etc), otherwise first candidate.
  const docs = uniq.filter((c) => c.classification?.kind === "document");
  if (docs.length > 0) {
    docs.sort(
      (a, b) => a.url.length - b.url.length || a.url.localeCompare(b.url),
    );
    const first = docs[0];
    if (!first) return null;
    return { canonical: first, reason: "pdf_only:no-pdf-fallback-document" };
  }

  uniq.sort(
    (a, b) => a.url.length - b.url.length || a.url.localeCompare(b.url),
  );
  const first = uniq[0];
  if (!first) return null;
  return { canonical: first, reason: "pdf_only:no-pdf-fallback-first" };
}
