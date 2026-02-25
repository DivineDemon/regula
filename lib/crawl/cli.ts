import { deriveAutoHtmlDocumentPolicy } from "./auto-policy";
import {
  makeUrlRelevanceScorer,
  type TargetRelevanceConfig,
} from "./relevance";
import { runIsolated } from "./run";
import { logError, logInfo } from "./utils";

function usage(): never {
  console.error(
    [
      "Usage: bun run start -- <url> [--keywords k1,k2] [--jurisdiction X] [--category Y] [--include re] [--exclude re] [--minDocScore N]",
      "                     [--promoteHtmlDocs 1] [--htmlDocInclude re] [--htmlDocExclude re] [--htmlDocKeywords k1,k2] [--minHtmlDocScore N]",
      "                     [--maxPages N] [--maxDepth N] [--maxDocs N] [--maxWallTimeMs N]",
      "",
      "Examples:",
      "  bun run start -- https://example.com/policy --keywords regulation,policy,compliance --jurisdiction US --minDocScore 200",
      '  bun run start -- https://example.com --include "^https://example.com/docs/" --exclude "/search"',
      '  bun run start -- https://csrc.nist.gov/publications/sp --promoteHtmlDocs 1 --htmlDocInclude "/pubs/" --htmlDocKeywords "nist,sp,800" --minHtmlDocScore 300',
    ].join("\n"),
  );
  process.exit(1);
}

function getFlagValue(args: string[], name: string): string | undefined {
  const key = `--${name}`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a) continue;
    if (a === key) return args[i + 1];
    if (a.startsWith(`${key}=`)) return a.slice(key.length + 1);
  }
  return undefined;
}

function getFlagValues(args: string[], name: string): string[] {
  const key = `--${name}`;
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a) continue;
    if (a === key) {
      const v = args[i + 1];
      if (v) out.push(v);
      continue;
    }
    if (a.startsWith(`${key}=`)) out.push(a.slice(key.length + 1));
  }
  return out;
}

function getFlagNumber(args: string[], name: string): number | undefined {
  const raw = getFlagValue(args, name);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseTargetConfig(args: string[]): {
  config: TargetRelevanceConfig;
  minDocScore?: number;
} {
  const keywords = getFlagValue(args, "keywords");
  const jurisdiction = getFlagValue(args, "jurisdiction");
  const category = getFlagValue(args, "category");
  const includeUrlPatterns = getFlagValues(args, "include");
  const excludeUrlPatterns = getFlagValues(args, "exclude");
  const minDocScoreRaw = getFlagValue(args, "minDocScore");
  const minDocScore = minDocScoreRaw ? Number(minDocScoreRaw) : undefined;

  const config: TargetRelevanceConfig = {
    keywords: keywords ? [keywords] : [],
    jurisdiction: jurisdiction || undefined,
    category: category || undefined,
    includeUrlPatterns:
      includeUrlPatterns.length > 0 ? includeUrlPatterns : undefined,
    excludeUrlPatterns:
      excludeUrlPatterns.length > 0 ? excludeUrlPatterns : undefined,
    preferPdf: true,
  };

  return {
    config,
    minDocScore: Number.isFinite(minDocScore) ? minDocScore : undefined,
  };
}

function getFlagBool(args: string[], name: string): boolean {
  const key = `--${name}`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a) continue;
    if (a === key) return true;
    if (a.startsWith(`${key}=`)) {
      const v = a
        .slice(key.length + 1)
        .trim()
        .toLowerCase();
      return v === "1" || v === "true" || v === "yes" || v === "y";
    }
  }
  return false;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  const rootUrl = args[0];
  if (!rootUrl) usage();

  const { config, minDocScore } = parseTargetConfig(args);
  const relevance = makeUrlRelevanceScorer(config);

  logInfo("Running isolated crawler", { rootUrl, config, minDocScore });

  // Keep Crawl4AI interactions bounded so a single slow site doesn't stall runs indefinitely.
  const clientOptions = {
    requestTimeoutMs: 20_000,
    maxAttempts: 1,
    retryBaseDelayMs: 0,
    retryMaxDelayMs: 0,
    pollIntervalMs: 2_000,
    maxPolls: 10,
    debug: process.env.CRAWL4AI_DEBUG === "1",
  } as const;

  const promoteHtmlDocs = getFlagBool(args, "promoteHtmlDocs");
  const htmlDocInclude = getFlagValues(args, "htmlDocInclude");
  const htmlDocExclude = getFlagValues(args, "htmlDocExclude");
  const htmlDocKeywords = getFlagValue(args, "htmlDocKeywords");
  const minHtmlDocScoreRaw = getFlagValue(args, "minHtmlDocScore");
  const minHtmlDocScore = minHtmlDocScoreRaw
    ? Number(minHtmlDocScoreRaw)
    : undefined;

  const maxPages = getFlagNumber(args, "maxPages");
  const maxDepth = getFlagNumber(args, "maxDepth");
  const maxDocs = getFlagNumber(args, "maxDocs");
  const maxWallTimeMs = getFlagNumber(args, "maxWallTimeMs");

  // Fully-automatic default: enable HTML-doc promotion with host-aware heuristics.
  // If caller explicitly provides `--promoteHtmlDocs` or any htmlDoc* overrides, those win.
  const autoHtmlPolicy = deriveAutoHtmlDocumentPolicy(rootUrl, config);
  const hasManualHtmlPolicy =
    promoteHtmlDocs ||
    htmlDocInclude.length > 0 ||
    htmlDocExclude.length > 0 ||
    !!htmlDocKeywords ||
    typeof minHtmlDocScore === "number";

  await runIsolated(rootUrl, {
    graph: {
      budgets: {
        // Keep defaults conservative so `bun run demo` remains reasonable.
        maxPages: typeof maxPages === "number" ? maxPages : 15,
        maxDepth: typeof maxDepth === "number" ? maxDepth : 1,
        maxWallTimeMs:
          typeof maxWallTimeMs === "number" ? maxWallTimeMs : 60_000,
        maxDocs: typeof maxDocs === "number" ? maxDocs : 120,
      },
      scope: {
        // Enforce: same-origin page expansion.
        sameOriginPagesOnly: true,
        // Allow: cross-origin docs discovered from in-scope pages.
        allowCrossOriginDocs: true,
      },
      clientOptions,
      // Use the same relevance scorer for page ordering (best-first) to reach
      // likely document hubs faster, especially on HTML-first ecosystems.
      pagePriority: relevance,
      docRelevanceScore: relevance,
      // A conservative default: allow most docs unless caller asks to prune harder.
      minDocRelevanceScore:
        typeof minDocScore === "number" ? minDocScore : undefined,
      htmlDocumentPolicy: {
        ...(hasManualHtmlPolicy
          ? {
              enabled: promoteHtmlDocs,
              includeUrlPatterns:
                htmlDocInclude.length > 0 ? htmlDocInclude : undefined,
              excludeUrlPatterns:
                htmlDocExclude.length > 0 ? htmlDocExclude : undefined,
              keywords: htmlDocKeywords ? [htmlDocKeywords] : config.keywords,
              minScore: Number.isFinite(minHtmlDocScore)
                ? minHtmlDocScore
                : undefined,
            }
          : autoHtmlPolicy),
      },
    },
    docs: {
      // Keep reasonably bounded for single target runs.
      writeDocTxt: true,
      concurrency: 3,
      clientOptions,
    },
    relevanceConfig: config,
  });
}

main().catch((err: unknown) => {
  logError("Unhandled error", {
    err: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
