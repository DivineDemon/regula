import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentGraphs } from "@/lib/db/schema";
import {
  type ContentGraph,
  discoverContentIntelligently,
} from "./content-discovery";
import type { CrawlResult } from "./firecrawl";
import { crawlUrl } from "./firecrawl";
import {
  adaptStrategyForPattern,
  compareContentGraphs,
  detectUpdatePattern,
  type GraphDiff,
  getLatestContentGraph,
  storeContentGraph,
} from "./pattern-detection";
import { storeVersion } from "./versions";

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

  // Step 1: Get or create content graph
  const previousGraph = await getLatestContentGraph(targetId);
  const _isFirstCrawl = !previousGraph;

  // Step 2: Discover content intelligently
  const contentGraph = await discoverContentIntelligently(
    targetUrl,
    targetConfig,
  );

  // Step 3: Get detected pattern and adapt strategy
  const patternInfo = await detectUpdatePattern(targetId);
  const strategy = adaptStrategyForPattern(patternInfo.pattern);

  // Step 4: Crawl discovered content based on strategy
  const versionsCreated: Array<{ id: string; contentHash: string }> = [];
  const crawlResults: Array<{ url: string; result: CrawlResult }> = [];

  // Crawl PDFs directly if strategy says so
  if (strategy.directPdfUrls) {
    const pdfNodes = contentGraph.nodes.filter((n) => n.type === "pdf");
    for (const pdfNode of pdfNodes.slice(0, 100)) {
      // Limit to 100 PDFs per crawl
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
  if (strategy.pagesToCrawl > 0) {
    const pageNodes = contentGraph.nodes.filter((n) => n.type === "page");
    for (const pageNode of pageNodes.slice(0, strategy.pagesToCrawl)) {
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

  // Step 5: Store content graph
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
    .orderBy(contentGraphs.lastAnalyzed)
    .limit(1);

  if (!latestGraph) {
    return true; // No graph exists, need to create
  }

  // Refresh if graph is older than 7 days
  const daysSinceLastAnalysis =
    (Date.now() - latestGraph.lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceLastAnalysis > 7;
}
