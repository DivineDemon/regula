import {
  fincenDocPriority,
  fincenPagePriority,
  fincenPriorityScore,
} from "./heuristics";
import { makeUrlRelevanceScorer } from "./relevance";
import { runIsolated } from "./run";
import { logInfo } from "./utils";

type DemoTarget = {
  name: string;
  url: string;
};

const targets: DemoTarget[] = [
  {
    name: "direct-doc (raw github markdown)",
    url: "https://raw.githubusercontent.com/DivineDemon/regula-compliance-test/refs/heads/main/README.md",
  },
  {
    name: "index-to-detail-to-pdf (FinCEN advisories index)",
    url: "https://www.fincen.gov/resources/advisoriesbulletinsfact-sheets/advisories",
  },
];

async function runOne(target: DemoTarget): Promise<void> {
  logInfo("Running demo target", { name: target.name, url: target.url });

  const isFincen = target.url.includes("fincen.gov/");

  if (isFincen) {
    // Demo-only preset: the core system supports arbitrary configs; this just
    // provides a strong configuration for FinCEN advisories.
    const relevance = makeUrlRelevanceScorer({
      keywords: ["fincen", "advisory", "fin-"],
      jurisdiction: "US",
      category: "AML",
      // Keep it tight: advisories + system PDF files.
      includeUrlPatterns: [
        "^https://www\\.fincen\\.gov/resources/advisories/",
        "^https://www\\.fincen\\.gov/system/files/.*\\.pdf",
      ],
      excludeUrlPatterns: ["/system/files/shared/", "/system/files/guidance/"],
      preferPdf: true,
    });

    await runIsolated(target.url, {
      graph: {
        budgets: {
          // Tuned budgets for FinCEN demo (avoid crawling the entire site).
          maxDepth: 3,
          maxPages: 60,
          maxWallTimeMs: 120_000,
          maxDocs: 200,
        },
        scope: {
          sameOriginPagesOnly: true,
          allowCrossOriginDocs: true,
          // Keep traversal focused under /resources/ while still allowing multi-hop.
          pagePathPrefix: "/resources/",
        },
        // FinCEN-specific best-first crawl ordering.
        pagePriority: fincenPagePriority,
        // Generic relevance scorer (configurable per target).
        // We keep the old heuristic available, but the demo now uses the generic scorer.
        docRelevanceScore: (u) =>
          Math.max(fincenPriorityScore(u), relevance(u)),
        minDocRelevanceScore: 800,
      },
      docs: {
        // Fetch likely-PDF docs early.
        docPriority: fincenDocPriority,
        maxDocsToFetch: 20,
        writeDocTxt: true,
        concurrency: 2,
      },
    });
    return;
  }

  // Direct doc demo: keep budgets tiny; we mostly want to fetch the doc itself.
  await runIsolated(target.url, {
    graph: {
      budgets: {
        maxDepth: 0,
        maxPages: 1,
        maxWallTimeMs: 60_000,
        maxDocs: 10,
      },
      scope: {
        sameOriginPagesOnly: true,
        allowCrossOriginDocs: true,
      },
    },
    docs: {
      maxDocsToFetch: 5,
      writeDocTxt: true,
      concurrency: 2,
    },
  });
}

async function main(): Promise<void> {
  for (const t of targets) {
    // run sequentially to keep output readable
    await runOne(t);
  }
}

main();
