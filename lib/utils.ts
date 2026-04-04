import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans a document URL for use in iframes/embeds. Handles malformed URLs that
 * have HTML entities or trailing junk (e.g. space + quoted filename) appended.
 * Example: "https://example.com/doc.pdf &quot;doc.pdf&quot;" → "https://example.com/doc.pdf"
 */
export function cleanDocumentUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "";
  let s = url.trim();
  if (!s) return "";
  // Decode common HTML entities that may appear in stored URLs
  s = s
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  // Keep only the URL part: strip anything after the first space (e.g. " filename.pdf")
  const firstSpace = s.indexOf(" ");
  if (firstSpace !== -1) {
    s = s.slice(0, firstSpace).trim();
  }
  return s;
}
