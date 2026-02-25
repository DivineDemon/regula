export type CanonicalizeUrlOptions = {
  /**
   * If provided, relative URLs and protocol-relative URLs (`//host/path`)
   * will be resolved against this base URL.
   */
  baseUrl?: string;

  /**
   * If true, remove the trailing slash for non-root paths.
   * Defaults to false (some sites treat `/x` and `/x/` differently).
   */
  stripTrailingSlash?: boolean;

  /**
   * Query keys to always drop (case-insensitive).
   */
  dropQueryKeys?: string[];
};

const DEFAULT_DROP_QUERY_KEYS = [
  // Google / general tracking
  "gclid",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "yclid",
  "igshid",
  "fbclid",
  "_gl",
  "_ga",
  // Mail / marketing
  "mc_cid",
  "mc_eid",
];

const DROP_QUERY_PREFIXES = [
  "utm_", // utm_source, utm_medium, etc.
  "pk_", // matomo/piwik: pk_campaign, pk_kwd, ...
  "spm", // used on some large sites
  "vero_", // vero marketing
  "trk", // generic "trk" / "trkCampaign" patterns
  "ref_", // ref_src, ref_url, etc.
];

function looksLikeSkippableScheme(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return (
    s === "" ||
    s === "#" ||
    s.startsWith("#") ||
    s.startsWith("javascript:") ||
    s.startsWith("mailto:") ||
    s.startsWith("tel:") ||
    s.startsWith("sms:") ||
    s.startsWith("data:") ||
    s.startsWith("about:") ||
    s.startsWith("blob:")
  );
}

function decodeHtmlEntitiesMinimal(input: string): string {
  // Enough to handle common `href="...&amp;..."` cases.
  return input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizePathname(pathname: string): string {
  // Collapse duplicate slashes (but keep leading slash).
  return pathname.replace(/\/{2,}/g, "/");
}

function stripDefaultPort(u: URL): void {
  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  ) {
    u.port = "";
  }
}

function stripTrailingSlash(u: URL): void {
  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/g, "");
  }
}

function shouldDropQueryKey(
  keyLower: string,
  dropKeysLower: Set<string>,
): boolean {
  if (dropKeysLower.has(keyLower)) return true;
  if (keyLower.startsWith("utm_")) return true;
  for (const prefix of DROP_QUERY_PREFIXES) {
    if (keyLower.startsWith(prefix)) return true;
  }
  return false;
}

function normalizeQuery(u: URL, opts?: CanonicalizeUrlOptions): void {
  const dropKeys = new Set<string>(
    [...DEFAULT_DROP_QUERY_KEYS, ...(opts?.dropQueryKeys ?? [])].map((k) =>
      k.toLowerCase(),
    ),
  );

  if (!u.search) return;

  // Preserve duplicate keys (URLSearchParams supports them).
  const params = new URLSearchParams(u.search);
  const kept: Array<[string, string]> = [];

  for (const [k, v] of params.entries()) {
    const keyLower = k.toLowerCase();
    if (shouldDropQueryKey(keyLower, dropKeys)) continue;
    kept.push([k, v]);
  }

  // Sort for stable canonical form.
  kept.sort(([aK, aV], [bK, bV]) => {
    const kcmp = aK.localeCompare(bK);
    if (kcmp !== 0) return kcmp;
    return aV.localeCompare(bV);
  });

  u.search = "";
  for (const [k, v] of kept) u.searchParams.append(k, v);
}

/**
 * Canonicalize a URL for dedupe:
 * - resolves relative links (when `baseUrl` provided)
 * - strips fragments
 * - normalizes host casing and default ports
 * - collapses repeated slashes
 * - drops common tracking query params + sorts query params for stability
 */
export function canonicalizeUrl(
  rawUrl: string,
  opts?: CanonicalizeUrlOptions,
): string | null {
  if (looksLikeSkippableScheme(rawUrl)) return null;
  const cleaned = decodeHtmlEntitiesMinimal(rawUrl.trim());

  let u: URL;
  try {
    if (opts?.baseUrl) u = new URL(cleaned, opts.baseUrl);
    else u = new URL(cleaned);
  } catch {
    return null;
  }

  // We only keep http(s) for graph crawl.
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  stripDefaultPort(u);

  u.pathname = normalizePathname(u.pathname);

  normalizeQuery(u, opts);

  const strip = opts?.stripTrailingSlash ?? false;
  if (strip) stripTrailingSlash(u);

  return u.toString();
}

export function resolveUrl(
  baseUrl: string,
  candidate: string,
  opts?: Omit<CanonicalizeUrlOptions, "baseUrl">,
): string | null {
  return canonicalizeUrl(candidate, { ...opts, baseUrl });
}

export function dedupeUrls(urls: Iterable<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}
