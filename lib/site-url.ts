/**
 * Canonical site origin for `metadataBase`, JSON-LD, and absolute URLs.
 * Prefer `NEXT_PUBLIC_APP_URL` in production; Vercel sets `VERCEL_URL` for previews.
 */
const PRODUCTION_SITE_URL = "https://regula.mushoodhanif.com";

export function getSiteUrl(): URL {
  const trimmed = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (trimmed) {
    const normalized = trimmed.replace(/\/+$/, "");
    return new URL(normalized);
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return new URL(`https://${host}`);
  }
  if (process.env.NODE_ENV === "production") {
    return new URL(PRODUCTION_SITE_URL);
  }
  return new URL("http://localhost:3000");
}
