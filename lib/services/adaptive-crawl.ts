import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentGraphs } from "@/lib/db/schema";
import {
  type ContentGraph,
  type ContentNode,
  discoverContentIntelligently,
} from "./content-discovery";
import {
  enrichGraphWithVersionFamilies,
  rankGoalDocuments,
} from "./content-graph";
import type { CrawlResult } from "./crawler";
import { crawlUrl } from "./crawler";
import {
  adaptStrategyForPattern,
  compareContentGraphs,
  detectUpdatePattern,
  type GraphDiff,
  getLatestContentGraph,
  storeContentGraph,
} from "./pattern-detection";

import {
  adaptiveCrawlPriorityMultiplier,
  getTargetSourceReliability,
} from "./source-reliability";
import { storeVersion } from "./versions";

function nodeRecencyScoreForCrawl(node: ContentNode): number {
  const t = node.metadata?.lastModified
    ? new Date(node.metadata.lastModified).getTime()
    : new Date(node.lastSeen).getTime();
  const ageMs = Date.now() - t;
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  if (ageMs <= 0) return 1;
  if (ageMs >= oneYear) return 0;
  return 1 - ageMs / oneYear;
}

export type { GraphDiff };

/**
 * Enhanced crawl using adaptive content discovery
 */
export async function adaptiveCrawlTarget(params: {
  targetId: string;
  organizationId: string;
  targetUrl: string;
  targetConfig: {
    url: string;
    label: string;
    jurisdiction?: string;
    category?: string;
  };
}): Promise<{
  success: boolean;
  contentGraph: ContentGraph;
  versionsCreated: number;
  changesDetected: boolean;
  graphDiff?: GraphDiff;
}> {
  const { targetId, organizationId, targetUrl, targetConfig } = params;

  const sourceReliability = await getTargetSourceReliability(targetId);
  const relComposite = sourceReliability.composite;

  // Step 1: Get or create content graph
  const previousGraph = await getLatestContentGraph(targetId);
  const isFirstCrawl = !previousGraph;

  // Step 2: Discover content intelligently
  let contentGraph = await discoverContentIntelligently(
    targetUrl,
    targetConfig,
  );

  // Enrich graph with version_of edges from version families before storing
  contentGraph = enrichGraphWithVersionFamilies(contentGraph);

  // Step 3: Get detected pattern and adapt strategy
  const patternInfo = await detectUpdatePattern(targetId);
  const strategy = adaptStrategyForPattern(patternInfo.pattern);

  // Step 4: Crawl discovered content based on strategy
  // Use reduced limits for first crawl to avoid timeouts
  const maxPdfs = isFirstCrawl ? 10 : 100;
  const maxPages = isFirstCrawl
    ? 5
    : strategy.pagesToCrawl > 0
      ? strategy.pagesToCrawl
      : 0;

  const versionsCreated: Array<{ id: string; contentHash: string }> = [];
  const crawlResults: Array<{ url: string; result: CrawlResult }> = [];

  // Rank goal documents (distance, relevance, recency, doc confidence)
  const goalDocs = rankGoalDocuments(contentGraph, targetConfig);
  const goalDocsByPriority = [...goalDocs].sort((a, b) => {
    const pa = adaptiveCrawlPriorityMultiplier({
      goalDocumentScore: a.score,
      recencyScore: a.recencyScore,
      targetReliabilityComposite: relComposite,
    });
    const pb = adaptiveCrawlPriorityMultiplier({
      goalDocumentScore: b.score,
      recencyScore: b.recencyScore,
      targetReliabilityComposite: relComposite,
    });
    return pb - pa;
  });

  // Crawl PDFs directly if strategy says so; use goal-doc ranking when available
  if (strategy.directPdfUrls) {
    const pdfGoals = goalDocsByPriority.filter((g) => g.node.type === "pdf");
    const pdfNodes =
      pdfGoals.length > 0
        ? pdfGoals.map((g) => g.node)
        : [...contentGraph.nodes.filter((n) => n.type === "pdf")].sort(
            (n1, n2) => {
              const r1 = nodeRecencyScoreForCrawl(n1);
              const r2 = nodeRecencyScoreForCrawl(n2);
              const p1 = adaptiveCrawlPriorityMultiplier({
                goalDocumentScore: 0.5,
                recencyScore: r1,
                targetReliabilityComposite: relComposite,
              });
              const p2 = adaptiveCrawlPriorityMultiplier({
                goalDocumentScore: 0.5,
                recencyScore: r2,
                targetReliabilityComposite: relComposite,
              });
              return p2 - p1;
            },
          );
    const nodesToCrawl = pdfNodes.slice(0, maxPdfs);

    if (isFirstCrawl && pdfNodes.length > maxPdfs) {
      console.log(
        `First crawl: Limiting PDF crawl from ${pdfNodes.length} to ${maxPdfs} to avoid timeout`,
      );
    }

    for (const pdfNode of nodesToCrawl) {
      try {
        const result = await crawlUrl(pdfNode.url, {
          respectRobotsTxt: true,
          includePdfs: true,
          extractPdfContent: true,
        });

        crawlResults.push({ url: pdfNode.url, result });

        // Store version
        const version = await storeVersion({
          targetId,
          crawlResult: result,
          organizationId,
        });

        versionsCreated.push(version);
      } catch (error) {
        console.warn(`Failed to crawl PDF: ${pdfNode.url}`, error);
      }
    }
  }

  // Crawl pages if strategy says so
  if (maxPages > 0) {
    const pageNodes = [
      ...contentGraph.nodes.filter((n) => n.type === "page"),
    ].sort((n1, n2) => {
      const r1 = nodeRecencyScoreForCrawl(n1);
      const r2 = nodeRecencyScoreForCrawl(n2);
      const p1 = adaptiveCrawlPriorityMultiplier({
        goalDocumentScore: 0.5,
        recencyScore: r1,
        targetReliabilityComposite: relComposite,
      });
      const p2 = adaptiveCrawlPriorityMultiplier({
        goalDocumentScore: 0.5,
        recencyScore: r2,
        targetReliabilityComposite: relComposite,
      });
      return p2 - p1;
    });
    const nodesToCrawl = pageNodes.slice(0, maxPages);

    if (isFirstCrawl && pageNodes.length > maxPages) {
      console.log(
        `First crawl: Limiting page crawl from ${pageNodes.length} to ${maxPages} to avoid timeout`,
      );
    }

    for (const pageNode of nodesToCrawl) {
      try {
        const result = await crawlUrl(pageNode.url, {
          respectRobotsTxt: true,
          includePdfs: true,
          extractPdfContent: true,
        });

        crawlResults.push({ url: pageNode.url, result });

        // Store version
        const version = await storeVersion({
          targetId,
          crawlResult: result,
          organizationId,
        });

        versionsCreated.push(version);
      } catch (error) {
        console.warn(`Failed to crawl page: ${pageNode.url}`, error);
      }
    }
  }

  // Step 5: Store content graph (includes links_to, contains, version_of edges)
  const sitemapSource = await getSitemapSourceForTarget(targetUrl);
  await storeContentGraph(targetId, contentGraph, sitemapSource);

  // Step 6: Compare graphs to detect changes
  let changesDetected = false;
  let graphDiff: GraphDiff | undefined;

  if (previousGraph) {
    graphDiff = compareContentGraphs(previousGraph, contentGraph);

    // Detect if there are meaningful changes
    changesDetected =
      graphDiff.addedNodes.length > 0 ||
      graphDiff.removedNodes.length > 0 ||
      graphDiff.modifiedNodes.length > 0;
  } else {
    // First crawl - all nodes are "new"
    changesDetected = contentGraph.nodes.length > 0;
    graphDiff = {
      addedNodes: contentGraph.nodes,
      removedNodes: [],
      modifiedNodes: [],
      structuralChanges: {
        newEdges: contentGraph.edges.map((e) => ({
          from: e.from,
          to: e.to,
        })),
        removedEdges: [],
      },
    };
  }

  return {
    success: true,
    contentGraph,
    versionsCreated: versionsCreated.length,
    changesDetected,
    graphDiff,
  };
}

/**
 * Get sitemap source URL for target (if available)
 */
async function getSitemapSourceForTarget(
  targetUrl: string,
): Promise<string | undefined> {
  try {
    const { discoverSitemapComplete } = await import("./sitemap-discovery");
    const result = await discoverSitemapComplete(new URL(targetUrl).origin);
    return result?.source.url;
  } catch {
    return undefined;
  }
}

/**
 * Check if target needs content graph refresh
 */
export async function shouldRefreshContentGraph(
  targetId: string,
): Promise<boolean> {
  const [latestGraph] = await db
    .select()
    .from(contentGraphs)
    .where(eq(contentGraphs.targetId, targetId))
    .orderBy(desc(contentGraphs.lastAnalyzed))
    .limit(1);

  if (!latestGraph) {
    return true; // No graph exists, need to create
  }

  // Refresh if graph is older than 7 days
  const daysSinceLastAnalysis =
    (Date.now() - latestGraph.lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceLastAnalysis > 7;
}
