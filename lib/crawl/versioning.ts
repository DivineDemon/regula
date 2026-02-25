import { sha256Hex } from "./utils";

export type VersioningInfo = {
  /**
   * A normalized string representing the "family" of a URL (date/version removed).
   * Useful for grouping multiple versions of the same document.
   */
  familyKey: string;
  /**
   * Stable hash of `familyKey` (for compact grouping).
   */
  familyId: string;
  /**
   * Best-effort date extracted from URL/title, in ISO YYYY-MM-DD form.
   */
  date?: string;
  /**
   * Epoch milliseconds for the extracted date (used for sorting).
   */
  dateEpochMs?: number;
  /**
   * Best-effort version string (e.g. "1.2", "3", "2.0.1").
   */
  version?: string;
  /**
   * Parsed version tuple for sorting (e.g. "1.2.3" -> [1,2,3]).
   */
  versionTuple?: number[];
};

function safeParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function toIsoDate(
  y: number,
  m: number,
  d: number,
): { iso: string; epochMs: number } | null {
  const yy = clampInt(y, 1900, 2100);
  const mm = clampInt(m, 1, 12);
  const dd = clampInt(d, 1, 31);
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  // Guard: JS auto-rollover can turn invalid dates into other months.
  if (
    dt.getUTCFullYear() !== yy ||
    dt.getUTCMonth() !== mm - 1 ||
    dt.getUTCDate() !== dd
  )
    return null;
  const iso = `${yy.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
  return { iso, epochMs: dt.getTime() };
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function extractBestDate(
  texts: Array<string | undefined>,
): { iso: string; epochMs: number } | null {
  const candidates: Array<{ iso: string; epochMs: number }> = [];
  const inputs = texts.filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );
  if (inputs.length === 0) return null;

  for (const t of inputs) {
    const s = t.toLowerCase();

    // YYYY-MM-DD or YYYY/MM/DD
    for (const m of s.matchAll(
      /\b(19\d{2}|20\d{2})[-_/](0?[1-9]|1[0-2])[-_/](0?[1-9]|[12]\d|3[01])\b/g,
    )) {
      const y = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      const parsed = toIsoDate(y, mm, dd);
      if (parsed) candidates.push(parsed);
    }

    // YYYYMMDD
    for (const m of s.matchAll(
      /\b(19\d{2}|20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/g,
    )) {
      const y = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      const parsed = toIsoDate(y, mm, dd);
      if (parsed) candidates.push(parsed);
    }

    // Month name patterns: "January 30, 2026" or "30 January 2026" or "jan-30-2026"
    for (const m of s.matchAll(
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[-_/.,]?\s*(0?[1-9]|[12]\d|3[01])\s*[-_/.,]?\s*(19\d{2}|20\d{2})\b/g,
    )) {
      const mon = MONTHS[m[1] ?? ""] ?? 0;
      const dd = Number(m[2]);
      const y = Number(m[3]);
      const parsed = toIsoDate(y, mon, dd);
      if (parsed) candidates.push(parsed);
    }
    for (const m of s.matchAll(
      /\b(0?[1-9]|[12]\d|3[01])\s*[-_/.,]?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[-_/.,]?\s*(19\d{2}|20\d{2})\b/g,
    )) {
      const dd = Number(m[1]);
      const mon = MONTHS[m[2] ?? ""] ?? 0;
      const y = Number(m[3]);
      const parsed = toIsoDate(y, mon, dd);
      if (parsed) candidates.push(parsed);
    }
  }

  if (candidates.length === 0) return null;
  // Prefer the latest date (helps select newest versions).
  candidates.sort(
    (a, b) => b.epochMs - a.epochMs || b.iso.localeCompare(a.iso),
  );
  return candidates[0] ?? null;
}

function parseVersionTuple(v: string): number[] {
  const parts = v.split(".").slice(0, 4);
  const out: number[] = [];
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (!Number.isFinite(n)) break;
    out.push(n);
  }
  return out;
}

function cmpVersionTuple(
  a: number[] | undefined,
  b: number[] | undefined,
): number {
  const aa = a ?? [];
  const bb = b ?? [];
  const n = Math.max(aa.length, bb.length);
  for (let i = 0; i < n; i++) {
    const x = aa[i] ?? 0;
    const y = bb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

function extractBestVersion(
  texts: Array<string | undefined>,
): { version: string; tuple: number[] } | null {
  const inputs = texts.filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0,
  );
  if (inputs.length === 0) return null;

  const candidates: Array<{ version: string; tuple: number[] }> = [];
  for (const t of inputs) {
    const s = t.toLowerCase();
    for (const m of s.matchAll(
      /\b(?:v|ver|version|rev|revision|r)\s*[-_:]?\s*(\d+(?:\.\d+){0,3})\b/g,
    )) {
      const ver = m[1] ?? "";
      if (!ver) continue;
      candidates.push({ version: ver, tuple: parseVersionTuple(ver) });
    }
    // A more permissive fallback: "..._1.2.3..." (avoid matching dates by requiring a dot)
    for (const m of s.matchAll(
      /(?:^|[^0-9])(\d+\.\d+(?:\.\d+){0,2})(?:[^0-9]|$)/g,
    )) {
      const ver = m[1] ?? "";
      if (!ver) continue;
      candidates.push({ version: ver, tuple: parseVersionTuple(ver) });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      cmpVersionTuple(b.tuple, a.tuple) || b.version.localeCompare(a.version),
  );
  return candidates[0] ?? null;
}

function normalizeFamilyKeyFromUrl(url: string): string {
  const u = safeParseUrl(url);
  if (!u) return url.trim().toLowerCase();

  const host = u.hostname.toLowerCase();
  const path = (u.pathname || "/").toLowerCase();

  // Remove common file extensions so `.pdf` vs `.PDF` doesn't affect families.
  const noExt = path.replace(
    /\.(pdf|docx?|xlsx?|pptx?|txt|md|markdown|csv|json|xml)(?:$|\/)/g,
    "/",
  );

  // Replace dates and version markers with placeholders, then normalize separators.
  const stripped = noExt
    // YYYY-MM-DD / YYYY/MM/DD / YYYYMMDD
    .replace(
      /\b(19\d{2}|20\d{2})[-_/](0?[1-9]|1[0-2])[-_/](0?[1-9]|[12]\d|3[01])\b/g,
      " ",
    )
    .replace(/\b(19\d{2}|20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/g, " ")
    // standalone years (often versioned docs)
    .replace(/\b(19\d{2}|20\d{2})\b/g, " ")
    // version markers
    .replace(
      /\b(?:v|ver|version|rev|revision|r)\s*[-_:]?\s*\d+(?:\.\d+){0,3}\b/g,
      " ",
    )
    // collapse digit runs that look like "release ids" but keep short numbers (e.g. "chapter-2")
    .replace(/\b\d{5,}\b/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\/+/g, "/")
    .replace(/\s+/g, " ")
    .trim();

  const key = `${host}${stripped.startsWith("/") ? "" : "/"}${stripped}`;
  return key.replace(/\s+/g, " ").trim();
}

/**
 * Best-effort date/version parsing + family clustering helper.
 *
 * The intent is to group URLs that only differ by version/date (e.g. PDFs with yearly updates)
 * so fetch selection can prefer "one per family" early, then fill in more.
 */
export function analyzeVersioning(params: {
  url: string;
  title?: string;
}): VersioningInfo {
  const familyKey = normalizeFamilyKeyFromUrl(params.url);
  const familyId = sha256Hex(familyKey).slice(0, 16);

  const bestDate = extractBestDate([params.url, params.title]);
  const bestVer = extractBestVersion([params.url, params.title]);

  return {
    familyKey,
    familyId,
    date: bestDate?.iso,
    dateEpochMs: bestDate?.epochMs,
    version: bestVer?.version,
    versionTuple: bestVer?.tuple,
  };
}
