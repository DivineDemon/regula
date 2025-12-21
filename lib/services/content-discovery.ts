import {
  type ContentRelevanceModel,
  filterContentByRelevance,
  learnRelevanceFromTarget,
  type TargetConfig,
} from "./content-relevance";
import { crawlUrl } from "./firecrawl";
import {
  discoverSitemapComplete,
  type SitemapEntry,
} from "./sitemap-discovery";
import { generateContentHash } from "./versions";

/**
 * Content source
 */
export interface ContentSource {
  url: string;
  type: "html" | "pdf" | "api" | "feed";
  fingerprint?: string;
  discoveredAt: Date;
  metadata?: {
    title?: string;
    lastModified?: Date;
    size?: number;
    section?: string;
  };
}

/**
 * Discovery strategy
 */
export interface DiscoveryStrategy {
  name: string;
  priority: number; // Higher = try first
  discover: (targetUrl: string) => Promise<ContentSource[]>;
  confidence: (targetUrl: string) => Promise<number>; // 0-1, how likely to work
}

/**
 * Content graph node
 */
export interface ContentNode {
  id: string;
  url: string;
  type: "page" | "pdf" | "document";
  fingerprint: string;
  discoveredAt: Date;
  lastSeen: Date;
  status: "active" | "removed" | "modified";
  metadata?: {
    title?: string;
    lastModified?: Date;
    size?: number;
  };
}

/**
 * Content graph edge
 */
export interface ContentEdge {
  from: string; // Node ID
  to: string; // Node ID
  relationship: "links_to" | "contains" | "version_of";
}

/**
 * Content graph
 */
export interface ContentGraph {
  rootUrl: string;
  nodes: ContentNode[];
  edges: ContentEdge[];
  lastAnalyzed: Date;
}

/**
 * Sitemap-based discovery strategy
 */
const sitemapStrategy: DiscoveryStrategy = {
  name: "sitemap_via_robots",
  priority: 10,
  confidence: async (url) => {
    try {
      const robotsUrl = new URL("/robots.txt", url).href;
      const robots = await fetch(robotsUrl);
      return robots.ok ? 0.9 : 0;
    } catch {
      return 0;
    }
  },
  discover: async (targetUrl) => {
    const baseUrl = new URL(targetUrl).origin;
    const result = await discoverSitemapComplete(baseUrl);

    if (!result) {
      return [];
    }

    return result.entries.map((entry) => ({
      url: entry.url,
      type: entry.url.toLowerCase().endsWith(".pdf")
        ? ("pdf" as const)
        : ("html" as const),
      discoveredAt: entry.lastmod || new Date(),
      metadata: {
        title: entry.metadata?.title,
        lastModified: entry.lastmod,
      },
    }));
  },
};

/**
 * RSS feed discovery strategy
 */
const rssFeedStrategy: DiscoveryStrategy = {
  name: "rss_feed",
  priority: 8,
  confidence: async (url) => {
    const feedPaths = ["/feed", "/rss", "/atom", "/feed.xml", "/rss.xml"];
    for (const path of feedPaths) {
      try {
        const feed = await fetch(new URL(path, url).href, { method: "HEAD" });
        if (feed.ok) return 0.8;
      } catch {}
    }
    return 0;
  },
  discover: async (_targetUrl) => {
    // TODO: Implement RSS feed parsing
    return [];
  },
};

/**
 * Breadth-first crawl discovery strategy (fallback)
 */
const breadthFirstStrategy: DiscoveryStrategy = {
  name: "breadth_first_crawl",
  priority: 5,
  confidence: async () => 0.5, // Always available as fallback
  discover: async (targetUrl) => {
    // Crawl target page and extract links
    const targetContent = await crawlUrl(targetUrl);
    const links = extractLinks(targetContent.content);

    return links
      .filter((link) => {
        try {
          const linkUrl = new URL(link.url, targetUrl);
          const targetUrlObj = new URL(targetUrl);
          // Only same-domain links
          return linkUrl.origin === targetUrlObj.origin;
        } catch {
          return false;
        }
      })
      .map((link) => ({
        url: new URL(link.url, targetUrl).href,
        type: link.url.toLowerCase().endsWith(".pdf")
          ? ("pdf" as const)
          : ("html" as const),
        discoveredAt: new Date(),
      }));
  },
};

/**
 * Extract links from HTML content
 */
function extractLinks(content: string): Array<{ url: string; text: string }> {
  const links: Array<{ url: string; text: string }> = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  match = linkRegex.exec(content);
  while (match !== null) {
    links.push({
      url: match[1],
      text: match[2].replace(/<[^>]+>/g, "").trim(),
    });
    match = linkRegex.exec(content);
  }

  return links;
}

/**
 * All available strategies
 */
const strategies: DiscoveryStrategy[] = [
  sitemapStrategy,
  rssFeedStrategy,
  breadthFirstStrategy,
];

/**
 * Select best strategies based on target characteristics
 */
async function selectDiscoveryStrategies(
  targetUrl: string,
): Promise<DiscoveryStrategy[]> {
  // Evaluate each strategy
  const strategyScores = await Promise.all(
    strategies.map(async (strategy) => ({
      strategy,
      confidence: await strategy.confidence(targetUrl),
      priority: strategy.priority,
    })),
  );

  // Sort by combined score (confidence * priority)
  strategyScores.sort(
    (a, b) => b.confidence * b.priority - a.confidence * a.priority,
  );

  // Select top strategies (at least 2 for redundancy)
  const selected = strategyScores
    .filter((s) => s.confidence > 0.3)
    .slice(0, 3)
    .map((s) => s.strategy);

  // Always include fallback strategy
  if (!selected.some((s) => s.name === "breadth_first_crawl")) {
    const fallback = strategies.find((s) => s.name === "breadth_first_crawl");
    if (fallback) selected.push(fallback);
  }

  return selected;
}

/**
 * Multi-strategy discovery with intelligent fallback
 */
export async function discoverContentAdaptively(
  targetUrl: string,
  targetConfig: TargetConfig,
): Promise<ContentGraph> {
  // Step 1: Learn relevance model from target
  const relevanceModel = await learnRelevanceFromTarget(
    targetUrl,
    targetConfig,
  );

  // Step 2: Select best discovery strategies
  const selectedStrategies = await selectDiscoveryStrategies(targetUrl);

  // Step 3: Try each strategy in order
  const allSources: ContentSource[] = [];
  const strategyResults: Array<{
    strategy: string;
    sources: ContentSource[];
    success: boolean;
  }> = [];

  for (const strategy of selectedStrategies) {
    try {
      const sources = await strategy.discover(targetUrl);

      // Filter by relevance
      const sitemapEntries: SitemapEntry[] = sources.map((s) => ({
        url: s.url,
        type: "url",
        lastmod: s.discoveredAt,
      }));

      const relevantEntries = filterContentByRelevance(
        sitemapEntries,
        relevanceModel,
      );

      const relevantSources = relevantEntries.map((e) => ({
        url: e.url,
        type: e.url.toLowerCase().endsWith(".pdf")
          ? ("pdf" as const)
          : ("html" as const),
        discoveredAt: e.lastmod || new Date(),
        metadata: e.metadata,
      }));

      strategyResults.push({
        strategy: strategy.name,
        sources: relevantSources,
        success: relevantSources.length > 0,
      });

      allSources.push(...relevantSources);

      // If we got good results, we can stop early
      if (relevantSources.length > 10) {
        console.log(
          `Strategy ${strategy.name} found ${relevantSources.length} sources, using it`,
        );
        break;
      }
    } catch (error) {
      console.warn(`Strategy ${strategy.name} failed:`, error);
      strategyResults.push({
        strategy: strategy.name,
        sources: [],
        success: false,
      });
    }
  }

  // Step 4: Deduplicate and merge results
  const uniqueSources = deduplicateSources(allSources);

  // Step 5: Build content graph
  return buildContentGraphFromSources(uniqueSources, targetUrl, relevanceModel);
}

/**
 * Deduplicate content sources
 */
function deduplicateSources(sources: ContentSource[]): ContentSource[] {
  const seen = new Set<string>();
  const unique: ContentSource[] = [];

  for (const source of sources) {
    if (!seen.has(source.url)) {
      seen.add(source.url);
      unique.push(source);
    }
  }

  return unique;
}

/**
 * Build content graph from sources
 */
async function buildContentGraphFromSources(
  sources: ContentSource[],
  targetUrl: string,
  _relevanceModel: ContentRelevanceModel,
): Promise<ContentGraph> {
  const nodes: ContentNode[] = [];
  const edges: ContentEdge[] = [];

  // Process PDFs directly
  const pdfSources = sources.filter((s) => s.type === "pdf");

  for (const pdfSource of pdfSources) {
    // Generate fingerprint (could be URL + lastmod, or actual content hash)
    const fingerprint = await generateFingerprint(pdfSource.url);

    nodes.push({
      id: generateNodeId(pdfSource.url),
      url: pdfSource.url,
      type: "pdf",
      fingerprint,
      discoveredAt: pdfSource.discoveredAt,
      lastSeen: new Date(),
      status: "active",
      metadata: pdfSource.metadata,
    });
  }

  // Process pages that might contain PDFs (nested structure)
  const pageSources = sources.filter((s) => s.type === "html");

  // Limit pages to crawl (efficiency)
  const pagesToCrawl = pageSources.slice(0, 50);

  for (const pageSource of pagesToCrawl) {
    try {
      const pageContent = await crawlUrl(pageSource.url);
      const pdfLinks = extractPdfLinks(pageContent.content);

      // Create page node
      const pageNode: ContentNode = {
        id: generateNodeId(pageSource.url),
        url: pageSource.url,
        type: "page",
        fingerprint: generateContentHash(pageContent.content),
        discoveredAt: new Date(),
        lastSeen: new Date(),
        status: "active",
        metadata: {
          title: pageContent.metadata.title,
        },
      };
      nodes.push(pageNode);

      // Link to PDFs found on this page
      for (const pdfLink of pdfLinks) {
        const pdfNode = nodes.find((n) => n.url === pdfLink.url);
        if (pdfNode) {
          edges.push({
            from: pageNode.id,
            to: pdfNode.id,
            relationship: "links_to",
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to crawl page: ${pageSource.url}`, error);
    }
  }

  return {
    rootUrl: targetUrl,
    nodes,
    edges,
    lastAnalyzed: new Date(),
  };
}

/**
 * Extract PDF links from content
 */
function extractPdfLinks(
  content: string,
): Array<{ url: string; text: string }> {
  const links = extractLinks(content);
  return links.filter((link) => link.url.toLowerCase().endsWith(".pdf"));
}

/**
 * Generate node ID from URL
 */
function generateNodeId(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}${urlObj.pathname}`
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 100);
  } catch {
    return url.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 100);
  }
}

/**
 * Generate fingerprint for URL (simple implementation)
 */
async function generateFingerprint(url: string): Promise<string> {
  // For now, use URL + current date as fingerprint
  // In production, could fetch HEAD request and use last-modified header
  try {
    const response = await fetch(url, { method: "HEAD" });
    const lastModified = response.headers.get("last-modified");
    if (lastModified) {
      return `${url}:${lastModified}`;
    }
  } catch {}
  return url;
}

/**
 * Main entry point: Discover and filter content for user's target
 */
export async function discoverContentIntelligently(
  targetUrl: string,
  targetConfig: TargetConfig,
): Promise<ContentGraph> {
  return discoverContentAdaptively(targetUrl, targetConfig);
}
