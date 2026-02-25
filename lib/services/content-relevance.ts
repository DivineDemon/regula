import { crawlUrl } from "./crawler";
import type { SitemapEntry } from "./sitemap-discovery";

/**
 * Content relevance model
 */
export interface ContentRelevanceModel {
  targetId: string;
  relevantPatterns: {
    urlPatterns: RegExp[];
    contentKeywords: string[];
    structuralPatterns: string[];
  };
  irrelevantPatterns: {
    urlPatterns: RegExp[];
    contentKeywords: string[];
  };
  confidence: number;
  lastUpdated: Date;
}

/**
 * Target configuration
 */
export interface TargetConfig {
  label?: string;
  jurisdiction?: string;
  category?: string;
  url: string;
}

/**
 * Learn what content is relevant from target URL
 */
export async function learnRelevanceFromTarget(
  targetUrl: string,
  targetConfig: TargetConfig,
): Promise<ContentRelevanceModel> {
  // Step 1: Crawl the target URL itself
  const targetContent = await crawlUrl(targetUrl);

  // Step 2: Extract patterns from target page
  const relevantPatterns = {
    urlPatterns: extractUrlPatterns(targetUrl, targetContent.content),
    contentKeywords: extractKeywords(targetContent.content, targetConfig),
    structuralPatterns: extractStructuralPatterns(targetContent.content),
  };

  // Step 3: Analyze links on target page
  const links = extractLinks(targetContent.content);
  const pdfLinks = links.filter((l) => l.url.toLowerCase().endsWith(".pdf"));

  // Step 4: Build relevance model
  const targetUrlObj = new URL(targetUrl);
  const targetPath = targetUrlObj.pathname;

  const model: ContentRelevanceModel = {
    targetId: generateTargetId(targetUrl),
    relevantPatterns: {
      urlPatterns: [
        // Path-based pattern
        new RegExp(escapeRegex(targetPath)),
        // PDF pattern if PDFs found
        ...(pdfLinks.length > 0 ? [/\.pdf$/i] : []),
        // Keyword-based patterns from URL
        ...extractKeywordsFromUrl(targetUrl).map((k) => new RegExp(k, "i")),
      ],
      contentKeywords: relevantPatterns.contentKeywords,
      structuralPatterns: relevantPatterns.structuralPatterns,
    },
    irrelevantPatterns: {
      urlPatterns: [
        /\/search/i,
        /\/login/i,
        /\/admin/i,
        /\/api\//i,
        /\.(css|js|png|jpg|gif|svg|ico)$/i,
      ],
      contentKeywords: [],
    },
    confidence: 0.7,
    lastUpdated: new Date(),
  };

  return model;
}

/**
 * Extract URL patterns from target
 */
function extractUrlPatterns(targetUrl: string, _content: string): RegExp[] {
  const patterns: RegExp[] = [];
  const urlObj = new URL(targetUrl);

  // Extract path segments
  const pathSegments = urlObj.pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s.length > 2); // Only meaningful segments

  for (const segment of pathSegments) {
    patterns.push(new RegExp(segment, "i"));
  }

  return patterns;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string, config: TargetConfig): string[] {
  const keywords: string[] = [];

  // Add keywords from config
  if (config.label) {
    keywords.push(...config.label.toLowerCase().split(/\s+/));
  }
  if (config.category) {
    keywords.push(config.category.toLowerCase());
  }
  if (config.jurisdiction) {
    keywords.push(config.jurisdiction.toLowerCase());
  }

  // Extract common regulatory keywords from content
  const regulatoryKeywords = [
    "advisory",
    "bulletin",
    "guidance",
    "regulation",
    "rule",
    "compliance",
    "regulatory",
    "fintech",
    "aml",
    "kyc",
  ];

  const contentLower = content.toLowerCase();
  for (const keyword of regulatoryKeywords) {
    if (contentLower.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // Remove duplicates and short words
  return [...new Set(keywords)].filter((k) => k.length > 2);
}

/**
 * Extract keywords from URL
 */
function extractKeywordsFromUrl(url: string): string[] {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s.length > 2);

  return pathSegments;
}

/**
 * Extract structural patterns from content
 */
function extractStructuralPatterns(content: string): string[] {
  const patterns: string[] = [];

  // Check for common structures
  if (content.includes("<ul>") || content.includes("<ol>")) {
    patterns.push("list_structure");
  }
  if (content.includes("<table>")) {
    patterns.push("table_structure");
  }
  if (content.match(/<h[1-6]/gi)) {
    patterns.push("heading_structure");
  }

  return patterns;
}

/**
 * Extract links from content
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
 * Filter content using learned relevance model
 */
export function filterContentByRelevance(
  contentSources: SitemapEntry[],
  relevanceModel: ContentRelevanceModel,
): SitemapEntry[] {
  return contentSources.filter((source) => {
    // Check irrelevant patterns first
    for (const pattern of relevanceModel.irrelevantPatterns.urlPatterns) {
      if (pattern.test(source.url)) {
        return false;
      }
    }

    // Check relevant patterns
    const matchesRelevant = relevanceModel.relevantPatterns.urlPatterns.some(
      (pattern) => pattern.test(source.url),
    );

    if (matchesRelevant) {
      return true;
    }

    // Check keywords in URL
    const urlLower = source.url.toLowerCase();
    const matchesKeyword = relevanceModel.relevantPatterns.contentKeywords.some(
      (keyword) => keyword && urlLower.includes(keyword),
    );

    return matchesKeyword;
  });
}

/**
 * Generate target ID from URL
 */
function generateTargetId(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}${urlObj.pathname}`.replace(/[^a-zA-Z0-9]/g, "_");
  } catch {
    return url.replace(/[^a-zA-Z0-9]/g, "_");
  }
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Calculate relevance score for a content source
 */
export function calculateRelevanceScore(
  source: { url: string; type?: string; metadata?: { title?: string } },
  config: TargetConfig,
): number {
  let score = 0;

  // Document types get higher priority
  if (source.type === "pdf") score += 10;
  if (source.type === "html") score += 5;
  if (source.type === "api") score += 3;

  // URL patterns matching jurisdiction/category
  if (config.jurisdiction) {
    const jurisdictionLower = config.jurisdiction.toLowerCase();
    if (source.url.toLowerCase().includes(jurisdictionLower)) {
      score += 5;
    }
  }
  if (config.category) {
    const categoryLower = config.category.toLowerCase();
    if (source.url.toLowerCase().includes(categoryLower)) {
      score += 5;
    }
  }

  // Keywords in URL
  const keywords = [
    "regulation",
    "compliance",
    "guideline",
    "policy",
    "law",
    "advisory",
    "bulletin",
    "guidance",
    "rule",
    "regulatory",
  ];
  keywords.forEach((keyword) => {
    if (source.url.toLowerCase().includes(keyword)) {
      score += 2;
    }
  });

  // Title matching (if available)
  if (source.metadata?.title) {
    const titleLower = source.metadata.title.toLowerCase();
    keywords.forEach((keyword) => {
      if (titleLower.includes(keyword)) {
        score += 1;
      }
    });
  }

  // Recency (newer is better, but this is a simple implementation)
  // In a full implementation, you'd use discoveredAt timestamp
  score += 1; // Base score for being discovered

  return score;
}

/**
 * Score and prioritize content sources
 */
export function prioritizeContentSources(
  sources: Array<{
    url: string;
    type?: string;
    metadata?: { title?: string };
  }>,
  config: TargetConfig,
): Array<{
  url: string;
  type?: string;
  metadata?: { title?: string };
  score?: number;
}> {
  return sources
    .map((source) => ({
      ...source,
      score: calculateRelevanceScore(source, config),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(({ score, ...source }) => source);
}
