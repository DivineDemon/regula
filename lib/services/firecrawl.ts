import FirecrawlApp from "@mendable/firecrawl-js";

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
 * Crawl result with extracted content
 */
export interface CrawlResult {
  url: string;
  content: string;
  contentType: "html" | "pdf" | "text";
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
    [key: string]: unknown;
  };
  statusCode: number;
}

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
    respectRobotsTxt = true,
    includePdfs = true,
    extractPdfContent = true,
    ...firecrawlOptions
  } = options;

  // Enforce rate limiting
  await enforceRateLimit(url);

  let lastError: Error | unknown;

  // Retry with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Determine if URL is a PDF
      const isPdf = url.toLowerCase().endsWith(".pdf");

      if (isPdf && includePdfs) {
        return await crawlPdf(url, extractPdfContent);
      }

      // Use Firecrawl's scrape method for HTML content
      const data = (await firecrawl.scrape(url, {
        formats: ["markdown", "html"],
        includeTags: ["title", "meta", "h1", "h2", "h3", "p", "article"],
        respectRobotsTxt,
        ...firecrawlOptions,
      })) as {
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

      // Get content (prefer markdown, fallback to HTML, then text)
      let content = data.markdown || "";
      if (!content && typeof data.html === "string") {
        content = data.html;
      }
      if (!content && typeof data.content === "string") {
        content = data.content;
      }
      if (!content && typeof data.html === "string") {
        // Fallback: extract text from HTML
        content = extractTextFromHtml(data.html);
      }

      return {
        url: data.url || url,
        content,
        contentType: isPdf ? "pdf" : "html",
        metadata,
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
        `Crawl attempt ${attempt + 1} failed for ${url}, retrying in ${delay}ms...`,
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
    const data = (await firecrawl.scrape(url, {
      formats: ["markdown"],
    })) as {
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
 * Extract text content from HTML (simple fallback)
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities (basic)
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
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
