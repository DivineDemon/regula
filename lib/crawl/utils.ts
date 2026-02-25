import crypto from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatTimestampForPath(d: Date): string {
  // 2026-01-29T12:34:56.789Z -> 20260129-123456Z
  const iso = d.toISOString();
  const y = iso.slice(0, 4);
  const m = iso.slice(5, 7);
  const day = iso.slice(8, 10);
  const hh = iso.slice(11, 13);
  const mm = iso.slice(14, 16);
  const ss = iso.slice(17, 19);
  return `${y}${m}${day}-${hh}${mm}${ss}Z`;
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function slugFromUrl(inputUrl: string, maxLen = 80): string {
  let u: URL;
  try {
    u = new URL(inputUrl);
  } catch {
    const fallback = inputUrl
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    return fallback.replace(/^-+|-+$/g, "").slice(0, maxLen) || "unknown";
  }

  const raw = `${u.hostname}${u.pathname}`.toLowerCase();
  const slug = raw
    .replace(/\/+/g, "/")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length <= maxLen) return slug || u.hostname;
  const head = slug.slice(0, Math.max(0, maxLen - 17));
  const tailHash = sha256Hex(slug).slice(0, 16);
  return `${head}-${tailHash}`.replace(/-+$/g, "");
}

/**
 * Directory for crawl run output (graph, docs, manifests).
 * Uses CRAWL_OUT_DIR env if set, otherwise process.cwd()/.crawl-out
 */
export function crawlOutDir(): string {
  const base =
    typeof process.env.CRAWL_OUT_DIR === "string" &&
    process.env.CRAWL_OUT_DIR.trim()
      ? process.env.CRAWL_OUT_DIR.trim()
      : path.join(process.cwd(), ".crawl-out");
  return path.resolve(base);
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export function logInfo(
  message: string,
  extra?: Record<string, unknown>,
): void {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[crawl] ${message}${payload}`);
}

export function logError(
  message: string,
  extra?: Record<string, unknown>,
): void {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.error(`[crawl] ERROR: ${message}${payload}`);
}
