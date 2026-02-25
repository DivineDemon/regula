/**
 * Content type detection and normalization for crawl results.
 * Used by the main app crawler to map Crawl4AI results to CrawlResult.
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

export function detectContentType(
  url: string,
  content: string,
  headers?: Headers,
): ContentType {
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

  const urlType = detectContentTypeFromUrl(url);
  if (urlType !== "unknown") return urlType;

  const trimmedContent = content.trim();
  if (trimmedContent.startsWith("%PDF")) return "pdf";
  if (trimmedContent.startsWith("{") || trimmedContent.startsWith("[")) {
    try {
      JSON.parse(trimmedContent);
      return "json";
    } catch {
      // not valid JSON
    }
  }
  if (trimmedContent.startsWith("<?xml")) return "xml";
  if (
    trimmedContent.includes("<html") ||
    trimmedContent.includes("<!DOCTYPE html")
  )
    return "html";
  if (trimmedContent.match(/^#+\s/)) return "markdown";

  return "unknown";
}

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
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

function unwrapCodeBlocks(content: string): string {
  if (!content || content.length < 6) return content;
  const trimmed = content.trim();
  const codeBlockPattern = /^```[\w]*\n([\s\S]*?)\n```$/;
  const match = trimmed.match(codeBlockPattern);
  if (match?.[1]) return match[1];
  const lines = trimmed.split("\n");
  if (lines.length >= 2) {
    const firstLine = lines[0]?.trim();
    const lastLine = lines[lines.length - 1]?.trim();
    if (firstLine && /^```[\w]*$/.test(firstLine) && lastLine === "```") {
      return lines.slice(1, -1).join("\n");
    }
  }
  const htmlCodeBlockPattern =
    /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i;
  const htmlMatch = content.match(htmlCodeBlockPattern);
  if (htmlMatch?.[1]) return decodeHtmlEntities(htmlMatch[1]);
  return content;
}

function normalizeContent(content: string): string {
  if (!content || content.length === 0) return content;
  let normalized = unwrapCodeBlocks(content);
  normalized = normalized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");
  const lines = normalized.split("\n");
  normalized = lines.map((line) => line.trimEnd()).join("\n");
  normalized = normalized.replace(/^\uFEFF/, "");
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  return normalized.trim();
}

export function extractBestContent(data: {
  markdown?: string;
  html?: string;
  content?: string;
}): string {
  if (data.markdown && data.markdown.trim().length > 0) return data.markdown;
  if (data.content && data.content.trim().length > 0) {
    if (!data.content.trim().startsWith("<")) return data.content;
  }
  if (data.html && data.html.trim().length > 0) return data.html;
  if (data.content && data.content.trim().length > 0) return data.content;
  return "";
}

export function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  return text.replace(/\s+/g, " ").trim();
}

function extractTextFromJson(jsonData: unknown): string {
  const textParts: string[] = [];
  function traverse(obj: unknown, depth = 0): void {
    if (depth > 10) return;
    if (typeof obj === "string") {
      if (obj.length > 10 && !obj.startsWith("http")) textParts.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) traverse(item, depth + 1);
    } else if (obj && typeof obj === "object") {
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
        if (field in obj)
          traverse((obj as Record<string, unknown>)[field], depth + 1);
      }
      for (const value of Object.values(obj)) traverse(value, depth + 1);
    }
  }
  traverse(jsonData);
  return textParts.join("\n");
}

function extractTextFromXml(xml: string): string {
  let text = xml.replace(/<\?xml[^>]*\?>/gi, "");
  text = text.replace(/<!DOCTYPE[^>]*>/gi, "");
  text = text.replace(/<[^>]+>/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function csvToText(csv: string): string {
  const lines = csv.split("\n");
  if (lines.length === 0) return "";
  const header = lines[0]?.split(",") || [];
  const rows: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;
    const values = line.split(",");
    const rowText = header
      .map((col, idx) => `${col}: ${values[idx]?.trim() || ""}`)
      .join("; ");
    rows.push(rowText);
  }
  return rows.join("\n");
}

export function extractAndNormalizeContent(
  _url: string,
  rawContent: string,
  contentType: ContentType,
): { normalizedContent: string; metadata: Record<string, unknown> } {
  let extracted = rawContent;
  const metadata: Record<string, unknown> = {};

  switch (contentType) {
    case "pdf":
      break;
    case "json":
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
        extracted = rawContent;
      }
      break;
    case "xml":
      extracted = extractTextFromXml(rawContent);
      metadata.xmlStructure = {
        hasRoot: rawContent.includes("<") && rawContent.includes(">"),
      };
      break;
    case "csv":
      extracted = csvToText(rawContent);
      break;
    case "html":
      extracted = extractTextFromHtml(rawContent);
      break;
    case "markdown":
    case "text":
      extracted = normalizeContent(rawContent);
      break;
    case "docx":
    case "xlsx":
      if (rawContent && rawContent.length > 0) {
        extracted = rawContent;
        metadata.officeDocument = true;
      } else {
        extracted = `[Office document detected: ${contentType}. Extraction not implemented.]`;
        metadata.officeDocument = true;
      }
      break;
    default:
      extracted = normalizeContent(rawContent);
  }

  return {
    normalizedContent: normalizeContent(extracted),
    metadata,
  };
}

export function extractFilenameFromUrl(url: string): string {
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

export type Attachment = { url: string; type: string; filename: string };

export function extractAttachments(
  markdown: string,
  html: string,
): Attachment[] {
  const attachments: Attachment[] = [];
  const seenUrls = new Set<string>();

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
