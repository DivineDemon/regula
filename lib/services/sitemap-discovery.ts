import { crawlUrl } from "./firecrawl";

/**
 * Sitemap source information
 */
export interface SitemapSource {
  url: string;
  type: "xml" | "html" | "json" | "robots_txt";
  format: "sitemap" | "sitemap_index" | "html_list" | "json_ld";
  discoveredAt: Date;
}

/**
 * Sitemap entry
 */
export interface SitemapEntry {
  url: string;
  lastmod?: Date;
  changefreq?: string;
  priority?: number;
  type: "url" | "sitemap_index";
  metadata?: {
    section?: string;
    title?: string;
  };
}

/**
 * Pagination information
 */
export interface PaginatedSitemapInfo {
  baseUrl: string;
  paginationPattern: "query_param" | "path_segment" | "link_based";
  paramName?: string; // 'page', 'p', 'offset', etc.
  currentPage: number;
  totalPages?: number;
  nextPageUrl?: string;
}

/**
 * Robots.txt information
 */
export interface RobotsTxtInfo {
  sitemaps: string[];
  crawlDelay?: number;
  disallowedPaths: string[];
  allowedPaths: string[];
  userAgents: string[];
}

/**
 * Discover sitemap in multiple formats
 */
export async function discoverSitemapMultiFormat(
  baseUrl: string,
): Promise<SitemapSource | null> {
  const discoveryStrategies = [
    // Strategy 1: Check robots.txt for sitemap reference
    async () => {
      try {
        const robotsUrl = new URL("/robots.txt", baseUrl).href;
        const robotsTxt = await fetch(robotsUrl).then((r) => r.text());
        const sitemapMatches = robotsTxt.match(/Sitemap:\s*(.+)/gi);
        if (sitemapMatches && sitemapMatches.length > 0) {
          const sitemapUrl = sitemapMatches[0].split(":")[1].trim();
          const type = await detectSitemapType(sitemapUrl);
          if (type) {
            return {
              url: sitemapUrl,
              type,
              format: "sitemap" as const,
              discoveredAt: new Date(),
            };
          }
        }
      } catch {}
      return null;
    },

    // Strategy 2: Try standard XML sitemap paths
    async () => {
      const xmlPaths = [
        "/sitemap.xml",
        "/sitemap_index.xml",
        "/sitemap/sitemap.xml",
        "/sitemaps/sitemap.xml",
        "/sitemap1.xml",
      ];

      for (const path of xmlPaths) {
        try {
          const url = new URL(path, baseUrl).href;
          const response = await fetch(url, { method: "HEAD" });
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("xml")
          ) {
            return {
              url,
              type: "xml" as const,
              format: "sitemap" as const,
              discoveredAt: new Date(),
            };
          }
        } catch {}
      }
      return null;
    },

    // Strategy 3: Try HTML sitemap pages
    async () => {
      const htmlPaths = [
        "/sitemap",
        "/sitemap.html",
        "/sitemap/index.html",
        "/site-map",
        "/sitemap.php",
        "/sitemap/page",
      ];

      for (const path of htmlPaths) {
        try {
          const url = new URL(path, baseUrl).href;
          const response = await fetch(url, { method: "HEAD" });
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("html")
          ) {
            // Verify it's actually a sitemap page
            const html = await fetch(url).then((r) => r.text());
            if (isHtmlSitemap(html)) {
              return {
                url,
                type: "html" as const,
                format: "html_list" as const,
                discoveredAt: new Date(),
              };
            }
          }
        } catch {}
      }
      return null;
    },
  ];

  // Try each strategy in order
  for (const strategy of discoveryStrategies) {
    const result = await strategy();
    if (result) return result;
  }

  return null;
}

/**
 * Detect sitemap type from URL or content
 */
async function detectSitemapType(
  url: string,
): Promise<"xml" | "html" | "json" | null> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("xml")) return "xml";
    if (contentType.includes("html")) return "html";
    if (contentType.includes("json")) return "json";

    // Fallback: check URL extension
    if (url.endsWith(".xml")) return "xml";
    if (url.endsWith(".html") || url.endsWith(".htm")) return "html";
    if (url.endsWith(".json")) return "json";

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if HTML page is actually a sitemap
 */
function isHtmlSitemap(html: string): boolean {
  // Check for common sitemap indicators
  const indicators = [
    /sitemap/i,
    /site.?map/i,
    /all.?pages/i,
    /page.?index/i,
    /site.?index/i,
  ];

  const hasIndicator = indicators.some((regex) => regex.test(html));

  // Check for high link density (sitemaps have many links)
  const linkCount = (html.match(/<a[^>]+href=/gi) || []).length;
  const isHighLinkDensity = linkCount > 10;

  // Check for organized link structure (lists, tables)
  const hasListStructure = /<ul|<ol|<table/.test(html);

  return hasIndicator && isHighLinkDensity && hasListStructure;
}

/**
 * Parse robots.txt and extract all sitemap references
 */
export async function parseRobotsTxt(
  robotsUrl: string,
): Promise<RobotsTxtInfo> {
  const robotsTxt = await fetch(robotsUrl).then((r) => r.text());
  const baseUrl = new URL(robotsUrl).origin;

  const info: RobotsTxtInfo = {
    sitemaps: [],
    disallowedPaths: [],
    allowedPaths: [],
    userAgents: [],
  };

  const lines = robotsTxt.split("\n").map((line) => line.trim());
  let _currentUserAgent = "*";

  for (const line of lines) {
    // Skip comments and empty lines
    if (!line || line.startsWith("#")) continue;

    // Parse directive
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    switch (directive) {
      case "user-agent":
        _currentUserAgent = value;
        if (!info.userAgents.includes(value)) {
          info.userAgents.push(value);
        }
        break;

      case "sitemap": {
        // Handle both absolute and relative URLs
        const sitemapUrl = resolveRobotsUrl(value, baseUrl);
        if (sitemapUrl && !info.sitemaps.includes(sitemapUrl)) {
          info.sitemaps.push(sitemapUrl);
        }
        break;
      }

      case "disallow":
        if (value && value !== "/") {
          info.disallowedPaths.push(value);
        }
        break;

      case "allow":
        if (value) {
          info.allowedPaths.push(value);
        }
        break;

      case "crawl-delay": {
        const delay = parseFloat(value);
        if (!Number.isNaN(delay)) {
          info.crawlDelay = delay;
        }
        break;
      }
    }
  }

  return info;
}

/**
 * Resolve relative URLs in robots.txt
 */
function resolveRobotsUrl(urlOrPath: string, baseUrl: string): string | null {
  try {
    // If it's already an absolute URL
    if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
      return urlOrPath;
    }

    // If it starts with /, it's a path on the same domain
    if (urlOrPath.startsWith("/")) {
      return new URL(urlOrPath, baseUrl).href;
    }

    // Relative path
    return new URL(urlOrPath, `${baseUrl}/`).href;
  } catch {
    return null;
  }
}

/**
 * Detect if sitemap is paginated
 */
export async function detectPaginationEnhanced(
  sitemapUrl: string,
): Promise<PaginatedSitemapInfo | null> {
  const url = new URL(sitemapUrl);

  // Check if URL already has pagination
  const commonPageParams = ["page", "p", "offset", "start", "index"];
  for (const param of commonPageParams) {
    if (url.searchParams.has(param)) {
      const pageNum = parseInt(url.searchParams.get(param) || "1", 10);

      // Test if page 2 exists
      const testUrl = new URL(sitemapUrl);
      testUrl.searchParams.set(param, "2");

      try {
        const testResponse = await fetch(testUrl.href, { method: "HEAD" });
        if (testResponse.ok) {
          return {
            baseUrl: `${url.origin}${url.pathname}`,
            paginationPattern: "query_param",
            paramName: param,
            currentPage: pageNum,
          };
        }
      } catch {}
    }
  }

  // Try fetching first page and analyzing content
  try {
    const content = await fetch(sitemapUrl).then((r) => r.text());

    // Check for pagination indicators in content
    const paginationIndicators = [
      /page\s+(\d+)\s+of\s+(\d+)/i,
      /showing\s+\d+[-\s]+\d+\s+of\s+(\d+)/i,
      /total[:\s]+(\d+)\s+pages?/i,
      /(\d+)\s+results?/i,
    ];

    for (const pattern of paginationIndicators) {
      const match = content.match(pattern);
      if (match) {
        const totalPages = parseInt(match[match.length - 1], 10);
        if (totalPages > 1) {
          // Try to determine param name by checking common patterns
          const testParams = ["page", "p"];
          for (const param of testParams) {
            const testUrl = new URL(sitemapUrl);
            testUrl.searchParams.set(param, "2");
            try {
              const testResponse = await fetch(testUrl.href, {
                method: "HEAD",
              });
              if (testResponse.ok) {
                return {
                  baseUrl: `${url.origin}${url.pathname}`,
                  paginationPattern: "query_param",
                  paramName: param,
                  currentPage: 1,
                  totalPages,
                };
              }
            } catch {}
          }
        }
      }
    }

    // Check for next page links
    const nextLink = findNextPageLink(content, sitemapUrl);
    if (nextLink) {
      return {
        baseUrl: sitemapUrl,
        paginationPattern: "link_based",
        currentPage: 1,
        nextPageUrl: nextLink,
      };
    }
  } catch (error) {
    console.warn("Failed to analyze sitemap for pagination:", error);
  }

  return null;
}

/**
 * Find next page link in content
 */
function findNextPageLink(
  content: string,
  currentUrl: string,
): string | undefined {
  // Look for "next" link in various formats
  const patterns = [
    /<link[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i,
    /<a[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i,
    /<a[^>]*href=["']([^"']+)["'][^>]*>.*?next.*?<\/a>/i,
    /next[^<]*<a[^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1], currentUrl).href;
      } catch {}
    }
  }

  return undefined;
}

/**
 * Parse XML sitemap
 */
export async function parseXmlSitemap(
  sitemapUrl: string,
): Promise<SitemapEntry[]> {
  const xml = await fetch(sitemapUrl).then((r) => r.text());

  // Check if it's a sitemap index
  if (xml.includes("<sitemapindex")) {
    const sitemapUrls = extractSitemapUrlsFromIndex(xml);
    const allEntries: SitemapEntry[] = [];

    for (const subSitemapUrl of sitemapUrls) {
      try {
        const entries = await parseXmlSitemap(subSitemapUrl);
        allEntries.push(...entries);
      } catch (error) {
        console.warn(`Failed to parse sub-sitemap: ${subSitemapUrl}`, error);
      }
    }

    return allEntries;
  }

  // Parse regular XML sitemap
  return extractUrlEntriesFromXml(xml);
}

/**
 * Extract sitemap URLs from sitemap index
 */
function extractSitemapUrlsFromIndex(xml: string): string[] {
  const urls: string[] = [];
  const sitemapRegex =
    /<sitemap[^>]*>[\s\S]*?<loc[^>]*>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
  let match: RegExpExecArray | null;
  match = sitemapRegex.exec(xml);
  while (match !== null) {
    if (match[1]) {
      urls.push(match[1].trim());
    }
    match = sitemapRegex.exec(xml);
  }

  return urls;
}

/**
 * Extract URL entries from XML sitemap
 */
function extractUrlEntriesFromXml(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlRegex =
    /<url[^>]*>[\s\S]*?<loc[^>]*>([^<]+)<\/loc>[\s\S]*?(?:<lastmod[^>]*>([^<]+)<\/lastmod>)?[\s\S]*?(?:<changefreq[^>]*>([^<]+)<\/changefreq>)?[\s\S]*?(?:<priority[^>]*>([^<]+)<\/priority>)?[\s\S]*?<\/url>/gi;
  let match: RegExpExecArray | null;
  match = urlRegex.exec(xml);
  while (match !== null) {
    const entry: SitemapEntry = {
      url: match[1].trim(),
      type: "url",
    };

    if (match[2]) {
      try {
        entry.lastmod = new Date(match[2].trim());
      } catch {}
    }

    if (match[3]) {
      entry.changefreq = match[3].trim();
    }

    if (match[4]) {
      entry.priority = parseFloat(match[4].trim());
    }

    entries.push(entry);
    match = urlRegex.exec(xml);
  }

  return entries;
}

/**
 * Parse HTML sitemap page
 */
export async function parseHtmlSitemap(
  sitemapUrl: string,
): Promise<SitemapEntry[]> {
  // Use Firecrawl to get clean content
  const crawlResult = await crawlUrl(sitemapUrl);
  const html = crawlResult.content;

  const entries: SitemapEntry[] = [];
  const baseUrl = new URL(sitemapUrl).origin;

  // Strategy 1: Extract all links from the page
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const visitedUrls = new Set<string>();

  let match: RegExpExecArray | null;
  match = linkRegex.exec(html);
  while (match !== null) {
    const href = match[1];
    const linkText = match[2].replace(/<[^>]+>/g, "").trim();

    // Resolve relative URLs
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).href;
    } catch {
      continue; // Skip invalid URLs
    }

    // Skip if already seen
    if (visitedUrls.has(absoluteUrl)) continue;
    visitedUrls.add(absoluteUrl);

    // Filter out invalid links
    if (isValidSitemapLink(absoluteUrl, baseUrl)) {
      entries.push({
        url: absoluteUrl,
        type: "url",
        metadata: {
          title: linkText || undefined,
        },
      });
    }
  }

  // Strategy 2: Look for structured lists/tables
  const listLinks = extractLinksFromStructuredLists(html, baseUrl);
  for (const link of listLinks) {
    if (!visitedUrls.has(link.url)) {
      visitedUrls.add(link.url);
      entries.push(link);
    }
  }

  return deduplicateEntries(entries);
}

/**
 * Check if link is valid for sitemap
 */
function isValidSitemapLink(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);

    // Must be same domain
    if (urlObj.origin !== baseObj.origin) return false;

    // Skip anchors, javascript, mailto, etc.
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:")
      return false;
    if (url.startsWith("#")) return false;
    if (url.startsWith("javascript:")) return false;
    if (url.startsWith("mailto:")) return false;

    // Skip common non-content paths
    const skipPatterns = [
      /\/search/,
      /\/login/,
      /\/logout/,
      /\/admin/,
      /\/api\//,
      /\.(css|js|png|jpg|gif|svg|ico)$/i,
    ];

    if (skipPatterns.some((pattern) => pattern.test(url))) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Extract links from structured HTML lists/tables
 */
function extractLinksFromStructuredLists(
  html: string,
  baseUrl: string,
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];

  // Extract from <ul> and <ol> lists
  const listRegex = /<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi;
  let listMatch: RegExpExecArray | null;
  listMatch = listRegex.exec(html);
  while (listMatch !== null) {
    const listContent = listMatch[2];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch: RegExpExecArray | null;
    linkMatch = linkRegex.exec(listContent);
    while (linkMatch !== null) {
      try {
        const absoluteUrl = new URL(linkMatch[1], baseUrl).href;
        if (isValidSitemapLink(absoluteUrl, baseUrl)) {
          entries.push({
            url: absoluteUrl,
            type: "url",
          });
        }
      } catch {}
      linkMatch = linkRegex.exec(listContent);
    }
    listMatch = listRegex.exec(html);
  }

  // Extract from <table> structures
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  tableMatch = tableRegex.exec(html);
  while (tableMatch !== null) {
    const tableContent = tableMatch[1];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch: RegExpExecArray | null;
    linkMatch = linkRegex.exec(tableContent);
    while (linkMatch !== null) {
      try {
        const absoluteUrl = new URL(linkMatch[1], baseUrl).href;
        if (isValidSitemapLink(absoluteUrl, baseUrl)) {
          entries.push({
            url: absoluteUrl,
            type: "url",
          });
        }
      } catch {}
      linkMatch = linkRegex.exec(tableContent);
    }
    tableMatch = tableRegex.exec(html);
  }

  return entries;
}

/**
 * Follow paginated sitemap and collect all entries
 */
export async function parsePaginatedSitemap(
  sitemapUrl: string,
  maxPages: number = 100,
): Promise<SitemapEntry[]> {
  const paginationInfo = await detectPaginationEnhanced(sitemapUrl);

  if (!paginationInfo) {
    // Not paginated, parse normally
    const source = await discoverSitemapMultiFormat(new URL(sitemapUrl).origin);
    if (!source) return [];
    return parseSitemapMultiFormat(source);
  }

  const allEntries: SitemapEntry[] = [];
  const visitedPages = new Set<string>();

  // Strategy 1: Query parameter pagination (most common)
  if (
    paginationInfo.paginationPattern === "query_param" &&
    paginationInfo.paramName
  ) {
    const baseUrl = new URL(paginationInfo.baseUrl);
    let currentPage = paginationInfo.currentPage;
    let hasMorePages = true;
    let consecutiveEmptyPages = 0;

    while (
      hasMorePages &&
      currentPage <= maxPages &&
      consecutiveEmptyPages < 3
    ) {
      const pageUrl = new URL(baseUrl);
      pageUrl.searchParams.set(
        paginationInfo.paramName,
        currentPage.toString(),
      );
      const pageUrlString = pageUrl.href;

      // Avoid infinite loops
      if (visitedPages.has(pageUrlString)) {
        break;
      }
      visitedPages.add(pageUrlString);

      try {
        const entries = await parseSitemapPage(pageUrlString);

        if (entries.length === 0) {
          consecutiveEmptyPages++;
          // If we have total pages info, check if we've reached the end
          if (
            paginationInfo.totalPages &&
            currentPage >= paginationInfo.totalPages
          ) {
            hasMorePages = false;
          }
        } else {
          consecutiveEmptyPages = 0;
          allEntries.push(...entries);

          // If we know total pages, check if we're done
          if (
            paginationInfo.totalPages &&
            currentPage >= paginationInfo.totalPages
          ) {
            hasMorePages = false;
          }
        }

        currentPage++;
      } catch (error) {
        // Page doesn't exist or error - likely reached the end
        console.warn(`Failed to fetch page ${currentPage}:`, error);
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 3) {
          hasMorePages = false;
        }
      }
    }
  }

  // Strategy 2: Link-based pagination (follow "next" links)
  else if (paginationInfo.paginationPattern === "link_based") {
    let nextUrl: string | undefined = sitemapUrl;

    while (nextUrl && visitedPages.size < maxPages) {
      if (visitedPages.has(nextUrl)) {
        break; // Circular reference
      }
      visitedPages.add(nextUrl);

      try {
        const entries = await parseSitemapPage(nextUrl);
        allEntries.push(...entries);

        // Find next page link
        const content = await fetch(nextUrl).then((r) => r.text());
        nextUrl = findNextPageLink(content, nextUrl);
      } catch (error) {
        console.warn(`Failed to fetch page:`, error);
        break;
      }
    }
  }

  return deduplicateEntries(allEntries);
}

/**
 * Parse a single sitemap page
 */
async function parseSitemapPage(pageUrl: string): Promise<SitemapEntry[]> {
  const sitemapType = await detectSitemapType(pageUrl);

  if (!sitemapType) {
    return [];
  }

  const source: SitemapSource = {
    url: pageUrl,
    type: sitemapType,
    format: sitemapType === "xml" ? "sitemap" : "html_list",
    discoveredAt: new Date(),
  };

  return parseSitemapMultiFormat(source);
}

/**
 * Parse sitemap regardless of format
 */
export async function parseSitemapMultiFormat(
  source: SitemapSource,
): Promise<SitemapEntry[]> {
  switch (source.type) {
    case "xml":
      return parseXmlSitemap(source.url);

    case "html":
      return parseHtmlSitemap(source.url);

    case "json":
      // JSON sitemap parsing (less common)
      return [];

    default:
      return [];
  }
}

/**
 * Deduplicate sitemap entries
 */
function deduplicateEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  const unique: SitemapEntry[] = [];

  for (const entry of entries) {
    if (!seen.has(entry.url)) {
      seen.add(entry.url);
      unique.push(entry);
    }
  }

  return unique;
}

/**
 * Complete sitemap discovery with robots.txt priority
 */
export async function discoverSitemapComplete(baseUrl: string): Promise<{
  source: SitemapSource;
  entries: SitemapEntry[];
  robotsTxtInfo?: RobotsTxtInfo;
} | null> {
  // Step 1: Check robots.txt first (highest priority)
  const robotsUrl = new URL("/robots.txt", baseUrl).href;

  try {
    const robotsInfo = await parseRobotsTxt(robotsUrl);

    if (robotsInfo.sitemaps.length > 0) {
      console.log(
        `Found ${robotsInfo.sitemaps.length} sitemap(s) in robots.txt`,
      );

      // Try each sitemap from robots.txt
      for (const sitemapUrl of robotsInfo.sitemaps) {
        try {
          const sitemapType = await detectSitemapType(sitemapUrl);
          if (!sitemapType) continue;

          const source: SitemapSource = {
            url: sitemapUrl,
            type: sitemapType,
            format: sitemapType === "xml" ? "sitemap" : "html_list",
            discoveredAt: new Date(),
          };

          // Check for pagination
          const paginationInfo = await detectPaginationEnhanced(sitemapUrl);

          let entries: SitemapEntry[];
          if (paginationInfo) {
            entries = await parsePaginatedSitemap(sitemapUrl);
          } else {
            entries = await parseSitemapMultiFormat(source);
          }

          if (entries.length > 0) {
            return { source, entries, robotsTxtInfo: robotsInfo };
          }
        } catch (error) {
          console.warn(
            `Failed to parse sitemap from robots.txt: ${sitemapUrl}`,
            error,
          );
        }
      }
    }
  } catch (error) {
    console.warn("Failed to fetch or parse robots.txt:", error);
    // Continue to fallback strategies
  }

  // Step 2: Fallback to direct sitemap discovery
  const directSource = await discoverSitemapMultiFormat(baseUrl);
  if (directSource) {
    const paginationInfo = await detectPaginationEnhanced(directSource.url);
    let entries: SitemapEntry[];
    if (paginationInfo) {
      entries = await parsePaginatedSitemap(directSource.url);
    } else {
      entries = await parseSitemapMultiFormat(directSource);
    }

    if (entries.length > 0) {
      return { source: directSource, entries };
    }
  }

  return null;
}
