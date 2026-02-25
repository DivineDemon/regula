export type TargetRelevanceConfig = {
  /**
   * Free-form keywords that indicate relevance for this target.
   * Used against URL text primarily (fast, no extra crawling).
   */
  keywords?: string[];

  /**
   * Optional domain-specific metadata. Treated as extra keywords.
   */
  jurisdiction?: string;
  category?: string;

  /**
   * Extra allow/deny patterns (regex strings). Deny patterns win.
   */
  includeUrlPatterns?: string[];
  excludeUrlPatterns?: string[];

  /**
   * Whether to boost PDF URLs.
   * Defaults to true.
   */
  preferPdf?: boolean;
};

export type UrlRelevanceInput = {
  url: string;
};

function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

function splitKeywords(s: string | undefined): string[] {
  if (!s) return [];
  // Split on commas and whitespace.
  return s
    .split(/[,\n\r\t ]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeKeywords(config?: TargetRelevanceConfig): string[] {
  const kws = new Set<string>();
  for (const k of config?.keywords ?? []) {
    for (const part of splitKeywords(k)) kws.add(part.toLowerCase());
  }
  for (const part of splitKeywords(config?.jurisdiction))
    kws.add(part.toLowerCase());
  for (const part of splitKeywords(config?.category))
    kws.add(part.toLowerCase());
  return Array.from(kws);
}

function looksLikePdf(url: string): boolean {
  if (/\.pdf(?:$|[?#&])/i.test(url)) return true;
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();
    if (p.includes("/pdf/") || p.endsWith("/pdf") || p.includes("/txt/pdf/"))
      return true;
    for (const [k, v] of u.searchParams.entries()) {
      const kl = k.toLowerCase();
      const vl = v.toLowerCase();
      if (kl === "format" && vl === "pdf") return true;
      if (vl.includes(".pdf")) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function defaultExcludePatterns(): RegExp[] {
  // Generic infinite-space / non-content patterns.
  const patterns = [
    "/search",
    "/login",
    "/logout",
    "/signin",
    "/signup",
    "/account",
    "/admin",
    "/wp-admin",
    "/cart",
    "/checkout",
    "/privacy",
    "/terms",
    "/sitemap",
    "/robots.txt",
    "/api/",
    // assets
    "\\.(css|js|png|jpg|jpeg|gif|svg|ico|webp)(?:$|[?#&])",
    // data URLs / base64 payloads
    "base64,",
    // obvious trackers
    "doubleclick\\.net",
    "googletagmanager\\.com",
    "google-analytics\\.com",
  ];

  return patterns.map((p) => new RegExp(p, "i"));
}

function compileExtraPatterns(patterns?: string[]): RegExp[] {
  if (!patterns) return [];
  const out: RegExp[] = [];
  for (const p of patterns) {
    const r = safeRegex(p);
    if (r) out.push(r);
  }
  return out;
}

export function makeUrlRelevanceScorer(
  config?: TargetRelevanceConfig,
): (url: string) => number {
  const keywords = normalizeKeywords(config);
  const include = compileExtraPatterns(config?.includeUrlPatterns);
  const exclude = [
    ...defaultExcludePatterns(),
    ...compileExtraPatterns(config?.excludeUrlPatterns),
  ];
  const preferPdf = config?.preferPdf ?? true;

  return (url: string): number => {
    const u = url.toLowerCase();

    // Exclude wins immediately.
    for (const r of exclude) {
      if (r.test(u)) return -10_000;
    }

    let score = 0;

    // Includes add a strong boost.
    for (const r of include) {
      if (r.test(u)) score += 500;
    }

    // PDF boost (common canonical doc form).
    if (preferPdf && looksLikePdf(u)) score += 400;

    // Keyword matching in URL.
    for (const kw of keywords) {
      if (!kw) continue;
      if (u.includes(kw)) score += 120;
    }

    // Generic compliance-ish hints.
    const genericHints = [
      "advisory",
      "bulletin",
      "guidance",
      "regulation",
      "policy",
      "rule",
      "directive",
      "circular",
      "notice",
      "compliance",
      "aml",
      "kyc",
      "sanctions",
    ];
    for (const h of genericHints) {
      if (u.includes(h)) score += 35;
    }

    // Light preference for shorter URLs (often canonical).
    score += Math.max(0, 20 - Math.min(20, u.length / 20));

    return score;
  };
}
