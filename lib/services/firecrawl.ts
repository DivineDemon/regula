import FirecrawlApp from "@mendable/firecrawl-js";
import { generateContentHash } from "./versions";

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error("FIRECRAWL_API_KEY environment variable is not set");
}

/**
 * Firecrawl API client instance
 */
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_DELAY_MS = 1000; // 1 second delay between requests
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // Start with 1 second

/**
 * Rate limiter using a simple token bucket approach
 * Tracks last request time per domain to respect rate limits
 */
const rateLimiter = new Map<string, number>();

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY_MS * 2 ** attempt;
}

/**
 * Check and enforce rate limiting for a URL
 */
async function enforceRateLimit(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const lastRequest = rateLimiter.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
      const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
      await sleep(waitTime);
    }

    rateLimiter.set(domain, Date.now());
  } catch (error) {
    // If URL parsing fails, skip rate limiting
    console.warn(`Failed to parse URL for rate limiting: ${url}`, error);
  }
}

/**
 * Follow redirects and resolve indirect URLs
 * Handles: HTTP redirects, meta refresh, JavaScript redirects
 */
async function resolveIndirectUrl(
  url: string,
  maxDepth = 3,
): Promise<{
  finalUrl: string;
  redirectChain: string[];
  contentType?: ContentType;
}> {
  const redirectChain: string[] = [url];
  let currentUrl = url;
  let depth = 0;

  while (depth < maxDepth) {
    try {
      const response = await fetch(currentUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": "Regula-Crawler/1.0" },
      });

      // Check for HTTP redirects
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location) {
          currentUrl = new URL(location, currentUrl).href;
          redirectChain.push(currentUrl);
          depth++;
          console.log(
            `Following HTTP redirect ${depth}/${maxDepth}: ${currentUrl}`,
          );
          continue;
        }
      }

      // Check for meta refresh redirects (HTML)
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        try {
          const html = await fetch(currentUrl).then((r) => r.text());
          const metaRefresh = html.match(
            /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']([^"']+)["']/i,
          );
          if (metaRefresh) {
            const refreshContent = metaRefresh[1];
            const urlMatch = refreshContent.match(/url=([^;]+)/i);
            if (urlMatch) {
              currentUrl = new URL(urlMatch[1].trim(), currentUrl).href;
              redirectChain.push(currentUrl);
              depth++;
              console.log(
                `Following meta refresh redirect ${depth}/${maxDepth}: ${currentUrl}`,
              );
              continue;
            }
          }
        } catch {
          // Failed to fetch HTML, continue
        }
      }

      // No more redirects
      break;
    } catch (error) {
      console.warn(`Failed to resolve redirect for ${currentUrl}:`, error);
      break;
    }
  }

  // Detect content type from final URL
  const detectedType = detectContentTypeFromUrl(currentUrl);

  return {
    finalUrl: currentUrl,
    redirectChain,
    contentType: detectedType,
  };
}

/**
 * Detect content type from URL (basic detection)
 */
function detectContentTypeFromUrl(url: string): ContentType {
  const ext = url.split(".").pop()?.toLowerCase();
  const extensionMap: Record<string, ContentType> = {
    pdf: "pdf",
    json: "json",
    xml: "xml",
    csv: "csv",
    txt: "text",
    md: "markdown",
    html: "html",
    htm: "html",
    docx: "docx",
    xlsx: "xlsx",
    zip: "zip",
  };
  return ext && extensionMap[ext] ? extensionMap[ext] : "unknown";
}

/**
 * Detect content type from URL, content, and headers
 * Uses multiple strategies for accurate detection
 */
export function detectContentType(
  url: string,
  content: string,
  headers?: Headers,
): ContentType {
  // Strategy 1: Check Content-Type header (most reliable)
  if (headers) {
    const contentType = headers.get("content-type")?.toLowerCase();
    if (contentType) {
      if (contentType.includes("application/pdf")) return "pdf";
      if (contentType.includes("application/json")) return "json";
      if (
        contentType.includes("application/xml") ||
        contentType.includes("text/xml")
      )
        return "xml";
      if (contentType.includes("text/csv")) return "csv";
      if (contentType.includes("text/markdown")) return "markdown";
      if (contentType.includes("text/html")) return "html";
      if (contentType.includes("text/plain")) return "text";
      if (contentType.includes("application/vnd.openxmlformats")) {
        if (contentType.includes("wordprocessingml")) return "docx";
        if (contentType.includes("spreadsheetml")) return "xlsx";
      }
      if (contentType.includes("application/zip")) return "zip";
    }
  }

  // Strategy 2: Check file extension
  const urlType = detectContentTypeFromUrl(url);
  if (urlType !== "unknown") {
    return urlType;
  }

  // Strategy 3: Content-based detection (magic bytes)
  const trimmedContent = content.trim();
  if (trimmedContent.startsWith("%PDF")) return "pdf";
  if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
    // Could be JSON, try to parse
    try {
      JSON.parse(trimmedContent);
      return "json";
    } catch {
      // Not valid JSON
    }
  }
  if (trimmedContent.startsWith("<?xml")) return "xml";
  if (
    trimmedContent.includes("<html") ||
    trimmedContent.includes("<!DOCTYPE html")
  )
    return "html";
  if (trimmedContent.match(/^#+\s/)) return "markdown"; // Starts with heading

  // Default to unknown
  return "unknown";
}

/**
 * Crawl result with extracted content
 */
export interface CrawlResult {
  url: string;
  content: string;
  contentType: "html" | "pdf" | "text";
  detectedType?: ContentType; // Detected content type (more specific)
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    publishedDate?: string;
    language?: string;
    attachments?: Array<{
      url: string;
      type: string;
      filename: string;
    }>;
    originalUrl?: string; // Original URL if redirected
    redirectChain?: string[]; // Redirect chain if redirected
    [key: string]: unknown;
  };
  statusCode: number;
}

/**
 * Content type detection
 */
export type ContentType =
  | "pdf"
  | "json"
  | "xml"
  | "csv"
  | "text"
  | "html"
  | "markdown"
  | "docx"
  | "xlsx"
  | "zip"
  | "unknown";

/**
 * Crawl options
 */
export interface CrawlOptions {
  /**
   * Whether to respect robots.txt (default: true)
   */
  respectRobotsTxt?: boolean;
  /**
   * Whether to include PDFs in the crawl (default: true)
   */
  includePdfs?: boolean;
  /**
   * Whether to extract PDF content (default: true)
   */
  extractPdfContent?: boolean;
  /**
   * Additional Firecrawl options
   */
  [key: string]: unknown;
}

/**
 * Execute a crawl for a single URL with error handling and retry logic
 */
export async function crawlUrl(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const {
    respectRobotsTxt: _respectRobotsTxt = true,
    includePdfs = true,
    extractPdfContent = true,
    ..._firecrawlOptions
  } = options;

  // Step 1: Resolve indirect URLs (follow redirects)
  const resolved = await resolveIndirectUrl(url);
  const finalUrl = resolved.finalUrl;
  const isRedirected = finalUrl !== url;

  if (isRedirected) {
    console.log(
      `URL redirected: ${url} -> ${finalUrl} (${resolved.redirectChain.length} redirects)`,
    );
  }

  // Enforce rate limiting on final URL
  await enforceRateLimit(finalUrl);

  let lastError: Error | unknown;

  // Retry with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Determine if URL is a PDF (check both original and final URL)
      const isPdf =
        finalUrl.toLowerCase().endsWith(".pdf") ||
        url.toLowerCase().endsWith(".pdf");

      if (isPdf && includePdfs) {
        return await crawlPdf(url, extractPdfContent);
      }

      // Use Firecrawl's scrape method for HTML content
      // Use final URL after redirect resolution
      // Simplified for v2 API compatibility - removed unsupported parameters
      const data = (await firecrawl.scrape(finalUrl)) as {
        markdown?: string;
        html?: string;
        content?: string;
        url?: string;
        statusCode?: number;
        metadata?: {
          title?: string;
          description?: string;
          author?: string;
          publishedTime?: string;
          language?: string;
        };
      };

      console.log(
        `Firecrawl response for ${finalUrl}: statusCode=${
          data.statusCode
        }, hasMarkdown=${!!data.markdown}, hasHtml=${!!data.html}, hasContent=${!!data.content}, finalUrl=${
          data.url || finalUrl
        }${isRedirected ? ` (redirected from ${url})` : ""}`,
      );

      // Extract metadata
      const metadata: CrawlResult["metadata"] = {
        title: data.metadata?.title,
        description: data.metadata?.description,
        author: data.metadata?.author,
        publishedDate:
          typeof data.metadata?.publishedTime === "string"
            ? data.metadata.publishedTime
            : undefined,
        language: data.metadata?.language,
        attachments: extractAttachments(
          data.markdown || "",
          typeof data.html === "string" ? data.html : "",
        ),
      };

      // Intelligently extract best content format
      let rawContent = extractBestContent(data);

      // If we got HTML but no markdown, try to extract text
      if (!rawContent && typeof data.html === "string") {
        rawContent = extractTextFromHtml(data.html);
      }

      // Detect content type first (before normalization)
      // Note: We don't have headers from Firecrawl response, so we detect from content
      const detectedType = detectContentType(finalUrl, rawContent);

      // Extract and normalize content based on detected type
      const { normalizedContent, metadata: formatMetadata } =
        extractAndNormalizeContent(finalUrl, rawContent, detectedType);

      console.log(
        `Content normalization: originalLength=${rawContent.length}, ` +
          `normalizedLength=${normalizedContent.length}, ` +
          `detectedType=${detectedType}, ` +
          `contentHash=${generateContentHash(normalizedContent).substring(
            0,
            8,
          )}...`,
      );

      return {
        url: data.url || finalUrl,
        content: normalizedContent,
        contentType: isPdf ? "pdf" : "html",
        detectedType,
        metadata: {
          ...metadata,
          ...formatMetadata,
          originalUrl: isRedirected ? url : undefined,
          redirectChain: isRedirected ? resolved.redirectChain : undefined,
        },
        statusCode: typeof data.statusCode === "number" ? data.statusCode : 200,
      };
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors (4xx client errors)
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
      ) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === MAX_RETRIES) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = getRetryDelay(attempt);
      console.warn(
        `Crawl attempt ${
          attempt + 1
        } failed for ${url}, retrying in ${delay}ms...`,
        error,
      );
      await sleep(delay);
    }
  }

  // If we get here, all retries failed
  throw new Error(
    `Failed to crawl ${url} after ${MAX_RETRIES + 1} attempts: ${lastError}`,
  );
}

/**
 * Crawl a PDF file and extract its content
 */
async function crawlPdf(
  url: string,
  _extractContent: boolean,
): Promise<CrawlResult> {
  try {
    // Firecrawl supports PDF scraping
    // Simplified for v2 API compatibility
    const data = (await firecrawl.scrape(url)) as {
      markdown?: string;
      content?: string;
      url?: string;
      statusCode?: number;
      metadata?: {
        title?: string;
      };
    };

    const content =
      data.markdown ||
      (typeof data.content === "string" ? data.content : "") ||
      "";

    return {
      url: data.url || url,
      content,
      contentType: "pdf",
      metadata: {
        title: data.metadata?.title || extractFilenameFromUrl(url),
        attachments: [],
      },
      statusCode: typeof data.statusCode === "number" ? data.statusCode : 200,
    };
  } catch (error) {
    // If PDF extraction fails, return minimal result
    console.error(`PDF extraction failed for ${url}:`, error);
    return {
      url,
      content: "",
      contentType: "pdf",
      metadata: {
        title: extractFilenameFromUrl(url),
        attachments: [],
      },
      statusCode: 200,
    };
  }
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
    "&apos;": "'",
    "&copy;": "©",
    "&reg;": "®",
  };

  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

/**
 * Intelligently detect and unwrap markdown code blocks
 * Works for any source, not just GitHub
 */
function unwrapCodeBlocks(content: string): string {
  if (!content || content.length < 6) {
    return content; // Too short to be wrapped
  }

  const trimmed = content.trim();

  // Pattern 1: Starts with ``` and ends with ```
  const codeBlockPattern = /^```[\w]*\n([\s\S]*?)\n```$/;
  const match = trimmed.match(codeBlockPattern);

  if (match?.[1]) {
    console.log("Detected markdown code block wrapper, unwrapping...");
    return match[1];
  }

  // Pattern 2: Starts with ``` on first line, ends with ``` on last line
  const lines = trimmed.split("\n");
  if (lines.length >= 2) {
    const firstLine = lines[0]?.trim();
    const lastLine = lines[lines.length - 1]?.trim();

    // Check if first line is just ``` or ```language
    if (firstLine && /^```[\w]*$/.test(firstLine)) {
      // Check if last line is just ```
      if (lastLine === "```") {
        console.log(
          "Detected markdown code block wrapper (line-based), unwrapping...",
        );
        // Remove first and last lines
        return lines.slice(1, -1).join("\n");
      }
    }
  }

  // Pattern 3: HTML <pre><code> blocks (common in some scrapers)
  const htmlCodeBlockPattern =
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i;
  const htmlMatch = content.match(htmlCodeBlockPattern);
  if (htmlMatch?.[1]) {
    console.log("Detected HTML code block wrapper, unwrapping...");
    // Decode HTML entities and return
    return decodeHtmlEntities(htmlMatch[1]);
  }

  return content; // No code block detected, return as-is
}

/**
 * Intelligently normalize and clean content from any source
 * Handles code blocks, whitespace, encoding, and format variations
 */
function normalizeContent(
  content: string,
  _contentType: "html" | "pdf" | "text" = "html",
): string {
  if (!content || content.length === 0) {
    return content;
  }

  let normalized = content;

  // Step 1: Detect and unwrap markdown code blocks (from any source)
  // This handles cases where scrapers wrap raw content in code blocks
  normalized = unwrapCodeBlocks(normalized);

  // Step 2: Normalize line endings (CRLF -> LF, CR -> LF)
  normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Step 3: Normalize whitespace (but preserve intentional spacing)
  // - Collapse multiple consecutive newlines to max 2
  // - Preserve single newlines and spaces
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  // Step 4: Remove leading/trailing whitespace from each line
  // But preserve the overall structure
  const lines = normalized.split("\n");
  normalized = lines.map((line) => line.trimEnd()).join("\n");

  // Step 5: Remove BOM and other invisible characters
  normalized = normalized.replace(/^\uFEFF/, ""); // Remove BOM
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, ""); // Remove zero-width characters

  return normalized.trim();
}

/**
 * Intelligently extract the best content format from Firecrawl response
 * Prioritizes cleanest format available
 */
function extractBestContent(data: {
  markdown?: string;
  html?: string;
  content?: string;
}): string {
  // Priority 1: Markdown (usually cleanest for text content)
  if (data.markdown && data.markdown.trim().length > 0) {
    return data.markdown;
  }

  // Priority 2: Raw content (if available and not HTML)
  if (data.content && data.content.trim().length > 0) {
    // Check if content is HTML (starts with <)
    if (!data.content.trim().startsWith("<")) {
      return data.content;
    }
  }

  // Priority 3: HTML (extract text from it)
  if (data.html && data.html.trim().length > 0) {
    return data.html;
  }

  // Priority 4: Fallback to content even if it looks like HTML
  if (data.content && data.content.trim().length > 0) {
    return data.content;
  }

  return "";
}

/**
 * Extract text content from HTML (simple fallback)
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Extract meaningful text from JSON structure
 */
function extractTextFromJson(jsonData: unknown): string {
  const textParts: string[] = [];

  function traverse(obj: unknown, depth = 0): void {
    if (depth > 10) return; // Prevent infinite recursion

    if (typeof obj === "string") {
      // Only include substantial strings (not IDs, URLs, etc.)
      if (obj.length > 10 && !obj.startsWith("http")) {
        textParts.push(obj);
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        traverse(item, depth + 1);
      }
    } else if (obj && typeof obj === "object") {
      // Prioritize certain fields
      const priorityFields = [
        "title",
        "description",
        "content",
        "text",
        "body",
        "summary",
        "name",
      ];
      for (const field of priorityFields) {
        if (field in obj) {
          traverse((obj as Record<string, unknown>)[field], depth + 1);
        }
      }
      // Then traverse other fields
      for (const value of Object.values(obj)) {
        traverse(value, depth + 1);
      }
    }
  }

  traverse(jsonData);
  return textParts.join("\n");
}

/**
 * Extract text content from XML
 */
function extractTextFromXml(xml: string): string {
  // Remove XML declarations and processing instructions
  let text = xml.replace(/<\?xml[^>]*\?>/gi, "");
  text = text.replace(/<!DOCTYPE[^>]*>/gi, "");

  // Extract text from elements (simple approach)
  // Remove all XML tags but preserve structure with newlines
  text = text.replace(/<[^>]+>/g, "\n");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Convert CSV to readable text format
 */
function csvToText(csv: string): string {
  const lines = csv.split("\n");
  if (lines.length === 0) return "";

  // Parse header
  const header = lines[0]?.split(",") || [];
  const rows: string[] = [];

  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;

    const values = line.split(",");
    const rowText = header
      .map((col, idx) => {
        const value = values[idx]?.trim() || "";
        return `${col}: ${value}`;
      })
      .join("; ");

    rows.push(rowText);
  }

  return rows.join("\n");
}

/**
 * Extract and normalize content based on detected type
 */
function extractAndNormalizeContent(
  _url: string,
  rawContent: string,
  contentType: ContentType,
): {
  normalizedContent: string;
  metadata: Record<string, unknown>;
} {
  let extracted = rawContent;
  const metadata: Record<string, unknown> = {};

  switch (contentType) {
    case "pdf":
      // Already handled by Firecrawl, but can enhance
      extracted = rawContent;
      break;

    case "json":
      // Extract meaningful text from JSON
      try {
        const jsonData = JSON.parse(rawContent);
        extracted = extractTextFromJson(jsonData);
        metadata.jsonStructure = {
          hasArray: Array.isArray(jsonData),
          keys:
            jsonData && typeof jsonData === "object"
              ? Object.keys(jsonData)
              : [],
        };
      } catch {
        // Not valid JSON, treat as text
        extracted = rawContent;
      }
      break;

    case "xml":
      // Extract text from XML, preserve structure
      extracted = extractTextFromXml(rawContent);
      metadata.xmlStructure = {
        hasRoot: rawContent.includes("<") && rawContent.includes(">"),
      };
      break;

    case "csv":
      // Convert CSV to readable format
      extracted = csvToText(rawContent);
      break;

    case "html":
      // Extract text, preserve structure
      extracted = extractTextFromHtml(rawContent);
      break;

    case "markdown":
      // Already text, just normalize
      extracted = normalizeContent(rawContent);
      break;

    case "text":
      // Already text, just normalize
      extracted = normalizeContent(rawContent);
      break;

    case "docx":
    case "xlsx":
      // Office documents - Firecrawl may handle these, but if not, we'll need a library
      // For now, try to use Firecrawl's output, or log that extraction is needed
      if (rawContent && rawContent.length > 0) {
        extracted = rawContent;
        metadata.officeDocument = true;
        metadata.note =
          "Office document - full text extraction may require additional library";
      } else {
        // Firecrawl didn't extract content, would need library like 'mammoth' or 'xlsx'
        extracted = `[Office document detected: ${contentType}. Full text extraction requires additional library.]`;
        metadata.officeDocument = true;
        metadata.extractionNeeded = true;
      }
      break;

    default:
      // Fallback: treat as text
      extracted = normalizeContent(rawContent);
  }

  return {
    normalizedContent: normalizeContent(extracted),
    metadata,
  };
}

/**
 * Extract attachment URLs from markdown or HTML content
 */
function extractAttachments(
  markdown: string,
  html: string,
): CrawlResult["metadata"]["attachments"] {
  const attachments: CrawlResult["metadata"]["attachments"] = [];
  const seenUrls = new Set<string>();

  // Extract PDF links from markdown
  const markdownPdfLinks = markdown.match(
    /\[([^\]]+)\]\(([^)]+\.pdf[^)]*)\)/gi,
  );
  if (markdownPdfLinks) {
    for (const link of markdownPdfLinks) {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match?.[2] && !seenUrls.has(match[2])) {
        seenUrls.add(match[2]);
        attachments.push({
          url: match[2],
          type: "application/pdf",
          filename: match[1] || extractFilenameFromUrl(match[2]),
        });
      }
    }
  }

  // Extract PDF links from HTML
  const htmlPdfLinks = html.match(
    /<a[^>]+href=["']([^"']+\.pdf[^"']*)["'][^>]*>/gi,
  );
  if (htmlPdfLinks) {
    for (const link of htmlPdfLinks) {
      const urlMatch = link.match(/href=["']([^"']+)["']/);
      const textMatch = link.match(/>([^<]+)</);
      if (urlMatch?.[1] && !seenUrls.has(urlMatch[1])) {
        seenUrls.add(urlMatch[1]);
        attachments.push({
          url: urlMatch[1],
          type: "application/pdf",
          filename:
            textMatch?.[1]?.trim() || extractFilenameFromUrl(urlMatch[1]),
        });
      }
    }
  }

  return attachments;
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || "document";
    return decodeURIComponent(filename);
  } catch {
    const parts = url.split("/");
    return parts[parts.length - 1] || "document";
  }
}

/**
 * Validate that a URL is accessible and crawlable
 */
export async function validateUrl(url: string): Promise<{
  valid: boolean;
  accessible: boolean;
  error?: string;
  statusCode?: number;
}> {
  try {
    // Basic URL validation
    new URL(url);

    // Try a lightweight crawl to check accessibility
    const result = await crawlUrl(url, {
      respectRobotsTxt: true,
      includePdfs: true,
    });

    return {
      valid: true,
      accessible: result.statusCode >= 200 && result.statusCode < 400,
      statusCode: result.statusCode,
    };
  } catch (error) {
    return {
      valid: true, // URL format is valid
      accessible: false,
      error: error instanceof Error ? error.message : String(error),
      statusCode: undefined,
    };
  }
}
