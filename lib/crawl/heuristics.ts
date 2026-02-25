function safeParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function looksLikePdf(url: string): boolean {
  return /\.pdf(?:$|[?#&])/i.test(url);
}

export function isFincenUrl(url: string): boolean {
  const u = safeParseUrl(url);
  return u?.hostname.toLowerCase().endsWith("fincen.gov") ?? false;
}

/**
 * FinCEN-specific priority score to help surface:
 * - advisory detail pages (often under `/resources/advisories/`)
 * - linked PDFs (often under `/system/files/` or similar)
 *
 * Higher is better.
 */
export function fincenPriorityScore(url: string): number {
  const u = safeParseUrl(url);
  if (!u) return 0;
  if (!isFincenUrl(url) && !looksLikePdf(url)) {
    // still allow PDFs hosted elsewhere, but generally don't boost other origins
    return 0;
  }

  const host = u.hostname.toLowerCase();
  const path = (u.pathname || "/").toLowerCase();
  const full = url.toLowerCase();
  const filename = path.split("/").pop() ?? "";

  let score = 0;

  // Strongest: PDFs (often the canonical artifact we want).
  if (looksLikePdf(url)) score += 1000;
  if (path.startsWith("/system/files/")) score += 900;
  if (path.includes("/sites/default/files/")) score += 800;

  // Advisory-specific boosts: we want advisories, not every FinCEN PDF.
  const isAdvisoryLike =
    path.includes("/advisory/") ||
    path.startsWith("/resources/advisories/") ||
    full.includes("fincen-advisory") ||
    filename.includes("advisory");
  if (isAdvisoryLike) score += 600;

  // Deboost common non-advisory PDF buckets that otherwise score highly.
  // Examples: SAR technical instruction PDFs, generic guidance, shared assets, etc.
  if (path.includes("/system/files/shared/")) score -= 900;
  if (path.includes("/system/files/guidance/")) score -= 700;

  // Advisory detail pages.
  if (path.startsWith("/resources/advisories/")) score += 850;
  if (full.includes("fincen-advisory")) score += 850;

  // Advisory index / section pages.
  if (path.startsWith("/resources/advisoriesbulletinsfact-sheets/"))
    score += 650;
  if (path === "/resources/advisoriesbulletinsfact-sheets/advisories")
    score += 700;

  // Mild boost: anything else under /resources/ (keeps crawl focused).
  if (path.startsWith("/resources/")) score += 100;

  // Light deboost for obvious non-content nav.
  if (
    path.startsWith("/search") ||
    path.startsWith("/sitemap") ||
    path.startsWith("/about") ||
    path.startsWith("/news-room")
  ) {
    score -= 200;
  }

  // Prefer shorter URLs when all else equal (often cleaner canonical pages).
  score += Math.max(0, 30 - Math.min(30, url.length / 10));

  // Small host-based boost to keep fincen.gov ahead of other origins.
  if (host.endsWith("fincen.gov")) score += 50;

  return score;
}

export function fincenPagePriority(url: string): number {
  // For page crawling, advisory pages should be favored heavily, but PDFs won't be enqueued as pages anyway.
  return fincenPriorityScore(url);
}

export function fincenDocPriority(url: string): number {
  // For doc fetching, ensure PDFs and system file links are fetched earliest.
  return fincenPriorityScore(url);
}
