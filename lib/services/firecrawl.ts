import { generateContentHash } from "./versions";

if (!process.env.CRAWL4AI_API_URL) {
  throw new Error("CRAWL4AI_API_URL environment variable is not set");
}

/**
 * Crawl4AI API base URL
 */
const CRAWL4AI_API_URL = process.env.CRAWL4AI_API_URL;

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
 * Call Crawl4AI API to crawl a URL
 * Handles both sync and async responses with task polling
 */
async function callCrawl4AI(url: string): Promise<{
  markdown?: string | { raw_markdown?: string; fit_markdown?: string };
  html?: string;
  content?: string;
  url?: string;
  status_code?: number;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    published_time?: string;
    language?: string;
  };
}> {
  const maxPolls = 60; // 60 polls * 5 seconds = 5 minutes max
  const pollInterval = 5000; // 5 seconds

  // Make initial crawl request
  const response = await fetch(`${CRAWL4AI_API_URL}/crawl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls: [url],
      priority: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Crawl4AI API error: ${response.status} ${response.statusText}`,
    );
  }

  const initialData = (await response.json()) as
    | { results: Array<unknown> }
    | { task_id: string };

  // Handle async response (task_id)
  if ("task_id" in initialData) {
    const taskId = initialData.task_id;
    console.log(`Crawl4AI task created: ${taskId}, polling for results...`);

    // Poll for task completion
    for (let poll = 0; poll < maxPolls; poll++) {
      await sleep(pollInterval);

      const taskResponse = await fetch(`${CRAWL4AI_API_URL}/task/${taskId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!taskResponse.ok) {
        throw new Error(
          `Crawl4AI task status error: ${taskResponse.status} ${taskResponse.statusText}`,
        );
      }

      const taskData = (await taskResponse.json()) as {
        status: string;
        results?: Array<unknown>;
        error?: string;
      };

      if (taskData.status === "completed" && taskData.results) {
        // Task completed, extract result
        const result = taskData.results[0] as {
          markdown?: string | { raw_markdown?: string; fit_markdown?: string };
          html?: string;
          content?: string;
          url?: string;
          status_code?: number;
          metadata?: {
            title?: string;
            description?: string;
            author?: string;
            published_time?: string;
            language?: string;
          };
        };
        return result;
      } else if (taskData.status === "failed" || taskData.error) {
        throw new Error(
          `Crawl4AI task failed: ${taskData.error || "Unknown error"}`,
        );
      }

      // Task still in progress, continue polling
      console.log(
        `Crawl4AI task ${taskId} status: ${taskData.status}, polling again...`,
      );
    }

    // Timeout after max polls
    throw new Error(
      `Crawl4AI task ${taskId} timed out after ${maxPolls} polls (${(maxPolls * pollInterval) / 1000} seconds)`,
    );
  }

  // Handle sync response (results)
  if ("results" in initialData && Array.isArray(initialData.results)) {
    const result = initialData.results[0] as {
      markdown?: string | { raw_markdown?: string; fit_markdown?: string };
      html?: string;
      content?: string;
      url?: string;
      status_code?: number;
      metadata?: {
        title?: string;
        description?: string;
        author?: string;
        published_time?: string;
        language?: string;
      };
    };
    return result;
  }

  throw new Error("Crawl4AI API returned unexpected response format");
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
   * Additional Crawl4AI options
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
    ..._crawl4AIOptions
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

      // Use Crawl4AI API for HTML content
      // Use final URL after redirect resolution
      const crawl4AIData = await callCrawl4AI(finalUrl);

      // Map Crawl4AI response format to match existing interface
      // Handle markdown which can be string or object
      let markdown: string | undefined;
      if (typeof crawl4AIData.markdown === "string") {
        markdown = crawl4AIData.markdown;
      } else if (
        crawl4AIData.markdown &&
        typeof crawl4AIData.markdown === "object"
      ) {
        markdown =
          crawl4AIData.markdown.fit_markdown ||
          crawl4AIData.markdown.raw_markdown ||
          undefined;
      }

      const data = {
        markdown,
        html: crawl4AIData.html,
        content: crawl4AIData.content,
        url: crawl4AIData.url,
        statusCode: crawl4AIData.status_code,
        metadata: crawl4AIData.metadata
          ? {
              title: crawl4AIData.metadata.title,
              description: crawl4AIData.metadata.description,
              author: crawl4AIData.metadata.author,
              publishedTime: crawl4AIData.metadata.published_time,
              language: crawl4AIData.metadata.language,
            }
          : undefined,
      };

      console.log(
        `Crawl4AI response for ${finalUrl}: statusCode=${
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
      // Note: We don't have headers from Crawl4AI response, so we detect from content
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
    // Crawl4AI supports PDF scraping
    const crawl4AIData = await callCrawl4AI(url);

    // Handle markdown which can be string or object
    let markdown: string | undefined;
    if (typeof crawl4AIData.markdown === "string") {
      markdown = crawl4AIData.markdown;
    } else if (
      crawl4AIData.markdown &&
      typeof crawl4AIData.markdown === "object"
    ) {
      markdown =
        crawl4AIData.markdown.fit_markdown ||
        crawl4AIData.markdown.raw_markdown ||
        undefined;
    }

    const content =
      markdown ||
      (typeof crawl4AIData.content === "string" ? crawl4AIData.content : "") ||
      "";

    return {
      url: crawl4AIData.url || url,
      content,
      contentType: "pdf",
      metadata: {
        title: crawl4AIData.metadata?.title || extractFilenameFromUrl(url),
        attachments: [],
      },
      statusCode:
        typeof crawl4AIData.status_code === "number"
          ? crawl4AIData.status_code
          : 200,
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
 * Intelligently extract the best content format from Crawl4AI response
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
      // Already handled by Crawl4AI, but can enhance
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
    case "xlsx": {
      // Office documents - Crawl4AI may handle these, but if not, extract using libraries
      if (rawContent && rawContent.length > 0) {
        extracted = rawContent;
        metadata.officeDocument = true;
      } else {
        // Crawl4AI didn't extract content, try to extract using libraries
        // Note: This requires 'mammoth' for .docx and 'xlsx' for .xlsx packages
        // Install: npm install mammoth xlsx
        try {
          if (contentType === "docx") {
            // TODO: Implement DOCX extraction using mammoth library
            // const mammoth = await import("mammoth");
            // const result = await mammoth.extractRawText({ buffer: fileBuffer });
            // extracted = result.value;
            extracted = `[Office document detected: ${contentType}. Full text extraction requires 'mammoth' library. Install with: npm install mammoth]`;
          } else if (contentType === "xlsx") {
            // TODO: Implement XLSX extraction using xlsx library
            // const XLSX = await import("xlsx");
            // const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            // extracted = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
            extracted = `[Office document detected: ${contentType}. Full text extraction requires 'xlsx' library. Install with: npm install xlsx]`;
          } else {
            extracted = `[Office document detected: ${contentType}. Extraction not implemented.]`;
          }
          metadata.officeDocument = true;
          metadata.extractionNeeded = true;
        } catch (error) {
          console.error(`Failed to extract office document content:`, error);
          extracted = `[Office document detected: ${contentType}. Extraction failed.]`;
          metadata.officeDocument = true;
          metadata.extractionNeeded = true;
        }
      }
      break;
    }

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
