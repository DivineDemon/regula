import {
  type ContentRelevanceModel,
  filterContentByRelevance,
  learnRelevanceFromTarget,
  prioritizeContentSources,
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
    [key: string]: unknown; // Allow additional metadata properties
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
 * Check if URL points to a document
 */
function isDocumentUrl(url: string): boolean {
  const docExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".xml",
    ".json",
    ".txt",
  ];
  return docExtensions.some((ext) => url.toLowerCase().endsWith(ext));
}

/**
 * Check if URL/page is likely a link page (document library, archive, etc.)
 */
function isLinkPage(url: string, html?: string): boolean {
  // Check URL patterns
  const urlPatterns = [
    /document/i,
    /download/i,
    /resource/i,
    /library/i,
    /archive/i,
    /publication/i,
    /regulation/i,
    /compliance/i,
    /guideline/i,
    /policy/i,
  ];
  if (urlPatterns.some((pattern) => pattern.test(url))) {
    return true;
  }

  // Check HTML content if available
  if (html) {
    const contentPatterns = [
      /document.*library/i,
      /download.*section/i,
      /resource.*center/i,
      /archive.*page/i,
    ];
    if (contentPatterns.some((pattern) => pattern.test(html))) {
      return true;
    }
  }

  return false;
}

/**
 * Discover content through link pages
 * Finds pages that contain links to PDFs/documents
 */
async function discoverViaLinkPages(
  targetUrl: string,
  maxPages = 20,
): Promise<ContentSource[]> {
  const sources: ContentSource[] = [];
  const visited = new Set<string>();
  const queue: string[] = [targetUrl];

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl || visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      const result = await crawlUrl(currentUrl);
      const html = result.content;

      // Extract all links
      const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
      const links: string[] = [];
      let match: RegExpExecArray | null = linkRegex.exec(html);
      while (match !== null) {
        try {
          const linkUrl = new URL(match[1], currentUrl).href;
          links.push(linkUrl);
        } catch {
          // Invalid URL, skip
        }
        match = linkRegex.exec(html);
      }

      // Categorize links
      for (const linkUrl of links) {
        // Direct document links
        if (isDocumentUrl(linkUrl)) {
          const docType = linkUrl.toLowerCase().endsWith(".pdf")
            ? ("pdf" as const)
            : linkUrl.toLowerCase().endsWith(".json")
              ? ("api" as const)
              : linkUrl.toLowerCase().endsWith(".xml")
                ? ("api" as const)
                : ("html" as const);

          sources.push({
            url: linkUrl,
            type: docType,
            discoveredAt: new Date(),
            metadata: { source: "link_page", parentUrl: currentUrl },
          });
        }
        // Pages that might contain more links
        else if (isLinkPage(linkUrl, html) && !visited.has(linkUrl)) {
          queue.push(linkUrl);
        }
      }
    } catch (error) {
      console.warn(`Failed to crawl link page ${currentUrl}:`, error);
    }
  }

  return sources;
}

/**
 * Link page discovery strategy
 */
const linkPageStrategy: DiscoveryStrategy = {
  name: "link_page_crawl",
  priority: 8,
  confidence: async (url) => {
    // High confidence if URL looks like a document library
    return /(document|library|resource|archive|publication)/i.test(url)
      ? 0.8
      : 0.3;
  },
  discover: async (targetUrl) => {
    return discoverViaLinkPages(targetUrl);
  },
};

/**
 * Extract URLs from JSON API response
 */
function extractUrlsFromJsonApi(
  data: unknown,
  baseUrl: string,
): ContentSource[] {
  const sources: ContentSource[] = [];

  // Handle various JSON API structures
  const items = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "items" in data
      ? (data as { items: unknown[] }).items
      : data && typeof data === "object" && "data" in data
        ? (data as { data: unknown[] }).data
        : data && typeof data === "object" && "results" in data
          ? (data as { results: unknown[] }).results
          : [];

  for (const item of items) {
    if (item && typeof item === "object") {
      const url =
        "url" in item
          ? String(item.url)
          : "link" in item
            ? String(item.link)
            : "document_url" in item
              ? String(item.document_url)
              : "pdf_url" in item
                ? String(item.pdf_url)
                : null;

      if (url) {
        try {
          const absoluteUrl = new URL(url, baseUrl).href;
          const isPdf = absoluteUrl.toLowerCase().endsWith(".pdf");
          sources.push({
            url: absoluteUrl,
            type: isPdf ? ("pdf" as const) : ("html" as const),
            discoveredAt: new Date(),
            metadata: {
              title:
                "title" in item
                  ? String(item.title)
                  : "name" in item
                    ? String(item.name)
                    : undefined,
            },
          });
        } catch {
          // Invalid URL, skip
        }
      }
    }
  }

  return sources;
}

/**
 * Extract URLs from RSS/Atom feed
 */
function extractUrlsFromFeed(xml: string, baseUrl: string): ContentSource[] {
  const sources: ContentSource[] = [];

  // RSS feed pattern
  const rssItemPattern =
    /<item[^>]*>[\s\S]*?<link[^>]*>([^<]+)<\/link>[\s\S]*?<\/item>/gi;
  let match: RegExpExecArray | null = rssItemPattern.exec(xml);
  while (match !== null) {
    try {
      const linkUrl = new URL(match[1], baseUrl).href;
      sources.push({
        url: linkUrl,
        type: "html",
        discoveredAt: new Date(),
      });
    } catch {
      // Invalid URL, skip
    }
    match = rssItemPattern.exec(xml);
  }

  // Atom feed pattern
  const atomEntryPattern =
    /<entry[^>]*>[\s\S]*?<link[^>]+href=["']([^"']+)["'][^>]*\/?>[\s\S]*?<\/entry>/gi;
  match = atomEntryPattern.exec(xml);
  while (match !== null) {
    try {
      const linkUrl = new URL(match[1], baseUrl).href;
      sources.push({
        url: linkUrl,
        type: "html",
        discoveredAt: new Date(),
      });
    } catch {
      // Invalid URL, skip
    }
  }

  return sources;
}

/**
 * Discover content via API endpoints
 * Handles: REST APIs, GraphQL, RSS/Atom feeds, JSON APIs
 */
async function discoverViaApiEndpoints(
  baseUrl: string,
): Promise<ContentSource[]> {
  const sources: ContentSource[] = [];

  // Common API patterns
  const apiPatterns = [
    "/api/documents",
    "/api/regulations",
    "/api/publications",
    "/api/v1/documents",
    "/documents.json",
    "/regulations.json",
    "/feed.xml",
    "/rss.xml",
    "/atom.xml",
    "/api/feed",
  ];

  for (const pattern of apiPatterns) {
    try {
      const apiUrl = new URL(pattern, baseUrl).href;
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json, application/xml" },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("json")) {
        const json = await response.json();
        sources.push(...extractUrlsFromJsonApi(json, apiUrl));
      } else if (contentType.includes("xml")) {
        const xml = await response.text();
        sources.push(...extractUrlsFromFeed(xml, apiUrl));
      }
    } catch (error) {
      // API endpoint doesn't exist or failed, continue
      console.debug(`API endpoint ${pattern} not available:`, error);
    }
  }

  return sources;
}

/**
 * API endpoint discovery strategy
 */
const apiEndpointStrategy: DiscoveryStrategy = {
  name: "api_endpoint_discovery",
  priority: 7,
  confidence: async () => {
    // Medium confidence - many sites have APIs
    return 0.5;
  },
  discover: async (targetUrl) => {
    return discoverViaApiEndpoints(new URL(targetUrl).origin);
  },
};

/**
 * Extract documents from archives (ZIP, RAR, etc.)
 * Note: Requires library like 'yauzl' or 'adm-zip' for full implementation
 */
async function extractFromArchive(
  archiveUrl: string,
): Promise<ContentSource[]> {
  const sources: ContentSource[] = [];

  // Check if URL is an archive
  if (!/\.(zip|rar|7z|tar)$/i.test(archiveUrl)) {
    return sources;
  }

  // For now, we'll detect archives but note that extraction requires a library
  // In a full implementation, you would:
  // 1. Download the archive
  // 2. Extract entries using a library like 'yauzl' or 'adm-zip'
  // 3. Filter for document files
  // 4. Create content sources for each document

  console.warn(
    `Archive detected at ${archiveUrl}. Archive extraction requires additional library (e.g., 'yauzl' or 'adm-zip').`,
  );

  // Return the archive URL as a source so it can be crawled
  // The system will attempt to crawl it, and Firecrawl might handle it
  sources.push({
    url: archiveUrl,
    type: "html", // Treat as HTML for now
    discoveredAt: new Date(),
    metadata: {
      archive: true,
      note: "Archive extraction requires additional library",
    },
  });

  return sources;
}

/**
 * Archive extraction discovery strategy
 */
const archiveStrategy: DiscoveryStrategy = {
  name: "archive_extraction",
  priority: 6,
  confidence: async (url) => {
    return /\.(zip|rar|7z|tar)$/i.test(url) ? 0.9 : 0;
  },
  discover: async (targetUrl) => {
    return extractFromArchive(targetUrl);
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
  linkPageStrategy,
  apiEndpointStrategy,
  archiveStrategy,
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

  // Step 5: Prioritize sources by relevance
  const prioritizedSources = prioritizeContentSources(
    uniqueSources.map((s) => ({
      url: s.url,
      type: s.type,
      metadata: s.metadata,
    })),
    targetConfig,
  );

  // Map back to ContentSource format
  const prioritizedContentSources = prioritizedSources.map((prioritized) => {
    const original = uniqueSources.find((s) => s.url === prioritized.url);
    return (
      original || {
        url: prioritized.url,
        type: (prioritized.type as "html" | "pdf" | "api" | "feed") || "html",
        discoveredAt: new Date(),
        metadata: prioritized.metadata,
      }
    );
  });

  // Limit sources to prevent excessive processing (prioritize most relevant)
  // Take top 500 sources after prioritization to balance coverage and performance
  const limitedSources = prioritizedContentSources.slice(0, 500);

  if (prioritizedContentSources.length > 500) {
    console.log(
      `Limiting sources from ${prioritizedContentSources.length} to 500 for performance (prioritized by relevance)`,
    );
  }

  // Step 5: Build content graph
  return buildContentGraphFromSources(
    limitedSources,
    targetUrl,
    relevanceModel,
  );
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

  // Limit pages to crawl (efficiency) - prioritize pages that might link to PDFs
  // For large sites, we limit to 50 pages to avoid excessive crawling
  const pagesToCrawl = pageSources.slice(0, 50);

  if (pageSources.length > 50) {
    console.log(
      `Limiting page crawl from ${pageSources.length} to 50 pages for efficiency`,
    );
  }

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
