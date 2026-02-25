import type { HtmlDocumentPolicy } from "./graph";
import type { TargetRelevanceConfig } from "./relevance";

function safeUrlParse(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

function splitTokens(s: string): string[] {
  return s
    .split(/[^a-zA-Z0-9]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs));
}

function hostKeywords(hostname: string): string[] {
  // Avoid super-noisy tokens like "www".
  return splitTokens(hostname.toLowerCase()).filter((t) => t !== "www");
}

/**
 * Build an automatic HTML-document promotion policy.
 *
 * Goal: work out-of-the-box with only a target URL, while staying conservative
 * (budgets still enforce safety).
 */
export function deriveAutoHtmlDocumentPolicy(
  rootUrl: string,
  relevanceConfig?: TargetRelevanceConfig,
): HtmlDocumentPolicy {
  const u = safeUrlParse(rootUrl);
  const host = (u?.hostname ?? "").toLowerCase();

  // Baseline excludes: avoid infinite navigation pages.
  const excludeUrlPatterns = [
    "/search",
    "/login",
    "/signin",
    "/signup",
    "\\?page=",
    "\\?sort=",
    "\\?q=",
    "\\?query=",
    "\\?filter=",
    "\\?from=",
    "\\?to=",
  ];

  // Base keywords come from real-app fields in the future (jurisdiction/category/label);
  // in isolated mode we only have URL, so we include host tokens as weak hints.
  const keywords = uniq([
    ...(relevanceConfig?.keywords ?? []),
    ...hostKeywords(host),
  ]);

  // Host-aware includes: these are safe because they target known stable publication
  // URL spaces (still best-effort; budgets cap expansion).
  const includeUrlPatterns: string[] = [];
  let minScore = 380; // conservative default

  if (host === "csrc.nist.gov") {
    // NIST CSRC is HTML-first and uses /pubs/* and /publications/* heavily.
    includeUrlPatterns.push("/pubs/", "/publications/");
    // Lower threshold so title/url hints can promote pages.
    minScore = 220;
  } else if (host.endsWith(".gov.uk")) {
    includeUrlPatterns.push("/guidance/", "/government/publications/");
    minScore = 260;
  } else if (host.endsWith(".gov")) {
    includeUrlPatterns.push(
      "/guidance",
      "/regulation",
      "/regulations",
      "/publications",
      "/publication",
      "/policy",
    );
    minScore = 300;
  }

  return {
    enabled: true,
    includeUrlPatterns:
      includeUrlPatterns.length > 0 ? includeUrlPatterns : undefined,
    excludeUrlPatterns,
    keywords,
    minScore,
  };
}
