import {
  type ContentType,
  detectContentType as detectContentTypeImpl,
  extractAndNormalizeContent,
  extractAttachments,
  extractBestContent,
  extractFilenameFromUrl,
  extractTextFromHtml,
} from "@/lib/crawl/content";
import { crawl, crawlMd } from "@/lib/crawl/crawl4ai";
import { generateContentHash } from "./versions";

export type { ContentType };

/**
 * Crawl result with extracted content (same contract as previous firecrawl service).
 */
export interface CrawlResult {
  url: string;
  content: string;
  contentType: "html" | "pdf" | "text";
  detectedType?: ContentType;
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
    originalUrl?: string;
    redirectChain?: string[];
    [key: string]: unknown;
  };
  statusCode: number;
}

export interface CrawlOptions {
  respectRobotsTxt?: boolean;
  includePdfs?: boolean;
  extractPdfContent?: boolean;
  [key: string]: unknown;
}

/**
 * Detect content type from URL, content, and optional headers.
 */
export function detectContentType(
  url: string,
  content: string,
  headers?: Headers,
): ContentType {
  return detectContentTypeImpl(url, content, headers);
}

/**
 * Execute a crawl for a single URL using the Crawl4AI client.
 */
export async function crawlUrl(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const { includePdfs = true, extractPdfContent: _extractPdfContent = true } =
    options;

  const isPdf =
    url.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf?");

  if (isPdf && includePdfs) {
    try {
      const result = await crawlMd(url);
      const content =
        result.markdown ||
        (typeof result.content === "string" ? result.content : "") ||
        "";
      return {
        url: result.finalUrl ?? result.requestedUrl,
        content,
        contentType: "pdf",
        metadata: {
          title:
            (result.metadata?.title as string | undefined) ||
            extractFilenameFromUrl(url),
          attachments: [],
          originalUrl: result.redirectChain?.[0]
            ? result.redirectChain[0]
            : undefined,
          redirectChain: result.redirectChain,
        },
        statusCode:
          typeof result.statusCode === "number" ? result.statusCode : 200,
      };
    } catch (error) {
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

  const result = await crawl(url);
  const finalUrl = result.finalUrl ?? result.requestedUrl;
  const isRedirected =
    result.redirectChain &&
    result.redirectChain.length > 1 &&
    result.redirectChain[0] !== finalUrl;

  const data = {
    markdown: result.markdown,
    html: result.html,
    content: result.content,
    url: finalUrl,
    statusCode: result.statusCode,
    metadata: result.metadata,
  };

  const metadata: CrawlResult["metadata"] = {
    title: data.metadata?.title as string | undefined,
    description: data.metadata?.description as string | undefined,
    author: data.metadata?.author as string | undefined,
    publishedDate:
      typeof data.metadata?.published_time === "string"
        ? data.metadata.published_time
        : undefined,
    language: data.metadata?.language as string | undefined,
    attachments: extractAttachments(
      data.markdown || "",
      typeof data.html === "string" ? data.html : "",
    ),
    originalUrl: isRedirected ? url : undefined,
    redirectChain: isRedirected ? result.redirectChain : undefined,
  };

  let rawContent = extractBestContent({
    markdown: data.markdown,
    html: data.html,
    content: typeof data.content === "string" ? data.content : undefined,
  });
  if (!rawContent && typeof data.html === "string") {
    rawContent = extractTextFromHtml(data.html);
  }

  const detectedType = detectContentType(finalUrl, rawContent);
  const { normalizedContent, metadata: formatMetadata } =
    extractAndNormalizeContent(finalUrl, rawContent, detectedType);

  console.log(
    `Content normalization: originalLength=${rawContent.length}, normalizedLength=${normalizedContent.length}, detectedType=${detectedType}, contentHash=${generateContentHash(normalizedContent).substring(0, 8)}...`,
  );

  return {
    url: data.url || finalUrl,
    content: normalizedContent,
    contentType: "html",
    detectedType,
    metadata: { ...metadata, ...formatMetadata },
    statusCode: typeof data.statusCode === "number" ? data.statusCode : 200,
  };
}

/**
 * Validate that a URL is accessible and crawlable.
 */
export async function validateUrl(url: string): Promise<{
  valid: boolean;
  accessible: boolean;
  error?: string;
  statusCode?: number;
}> {
  try {
    new URL(url);
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
      valid: true,
      accessible: false,
      error: error instanceof Error ? error.message : String(error),
      statusCode: undefined,
    };
  }
}
