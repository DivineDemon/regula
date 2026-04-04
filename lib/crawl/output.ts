import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { Classification, DocumentKind } from "./classify";
import { classifyCrawlResult } from "./classify";
import type {
  Crawl4AIClientOptions,
  Crawl4AICrawlOptions,
  Crawl4AIResult,
} from "./crawl4ai";
import { crawl, crawlMd } from "./crawl4ai";
import type { BuildGraphResult, GraphEdge, GraphNode } from "./graph";
import { loadRobotsPolicy } from "./robots";
import type { RunContext } from "./run-manifest";
import { deleteS3Object, presignGetObjectUrl, uploadUrlToS3 } from "./s3";
import { canonicalizeUrl } from "./url";
import { logError, logInfo, nowIso, sha256Hex } from "./utils";
import { analyzeVersioning, type VersioningInfo } from "./versioning";

export async function writeGraphJson(
  ctx: RunContext,
  graph: BuildGraphResult,
): Promise<void> {
  await writeFile(
    ctx.graphJsonPath,
    `${JSON.stringify(graph, null, 2)}\n`,
    "utf8",
  );
  logInfo("Wrote graph", {
    graphJson: ctx.graphJsonPath,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  });
}

export type DocLineage = {
  /**
   * URLs of pages (or docs, if enabled) that linked to this doc.
   */
  referrers: string[];
  /**
   * Best-effort depth for this doc node (min over all known paths).
   */
  depth: number;
  /**
   * Minimum depth among referrers, if known.
   */
  minReferrerDepth?: number;
};

export type ExtractedDocRecord = {
  version: 1;
  id: string;
  fetchedAt: string;

  url: string;
  requestedUrl: string;
  finalUrl?: string;
  redirectChain?: string[];
  statusCode?: number;

  title?: string;
  classification?: Classification;
  versioning?: VersioningInfo;
  contentType: "pdf" | "markdown" | "html" | "text" | "unknown";
  content?: string;

  extraction?: {
    status: "extracted" | "deferred_oversize" | "failed" | "not_applicable";
    reason?: string;
  };

  storage?: {
    provider: "s3";
    bucket: string;
    key: string;
    region: string;
    etag?: string;
    bytes?: number;
    sha256Hex?: string;
    deleted?: boolean;
  };

  lineage: DocLineage;

  /**
   * If true, this doc was intentionally skipped (e.g. dead cross-origin link).
   * When set, `error` should generally be undefined and this should not count
   * towards `docErrors`.
   */
  skipped?: boolean;
  skipReason?: string;

  error?: string;
};

export type WriteDocsOptions = {
  /**
   * Crawl options when fetching documents.
   */
  crawlOptions?: Crawl4AICrawlOptions;
  /**
   * Crawl4AI client options (timeouts/retries/base URL).
   */
  clientOptions?: Crawl4AIClientOptions;
  /**
   * Limit number of documents to fetch (stable ordering by URL).
   */
  maxDocsToFetch?: number;
  /**
   * If true, write `docs/<hash>.txt` for documents with textual content.
   * Defaults to true.
   */
  writeDocTxt?: boolean;
  /**
   * Concurrency for document fetches.
   * Defaults to 4.
   */
  concurrency?: number;
  /**
   * Respect robots.txt during document fetches.
   * Defaults to true.
   */
  robotsEnabled?: boolean;
  /**
   * User-Agent used for robots.txt lookups.
   * Defaults to "regula-bot".
   */
  robotsUserAgent?: string;
  /**
   * Timeout for robots.txt fetches.
   * Defaults to 6000ms.
   */
  robotsTimeoutMs?: number;
  /**
   * Optional URL prioritizer used to decide which docs to fetch first.
   * Higher scores are fetched earlier; ties broken lexicographically by URL.
   *
   * Defaults to stable lexicographic ordering when omitted.
   */
  docPriority?: (url: string) => number;
};

export type WriteDocsResult = {
  docsDiscovered: number;
  docsFetched: number;
  docErrors: number;
  docsSkipped: number;
  docsWrittenTxt: number;
};

class HttpError extends Error {
  statusCode: number;
  statusText: string;
  constructor(statusCode: number, statusText: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Conservative "site" approximation used for cross-origin doc gating.
 * Works well for our current test set (mostly .gov / .eu / .uk).
 */
function parentDomain(hostname: string): string {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length < 2) return hostname;
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function isSameParentDomain(
  rootUrlOrOrigin: string,
  candidateUrl: string,
): boolean {
  const rh = hostnameOf(rootUrlOrOrigin);
  const ch = hostnameOf(candidateUrl);
  if (!rh || !ch) return false;
  const rootParent = parentDomain(rh);
  return ch === rootParent || ch.endsWith(`.${rootParent}`);
}

function sortStableStrings(xs: string[]): string[] {
  return [...xs].sort((a, b) => a.localeCompare(b));
}

function bestDocId(canonicalUrl: string): string {
  // Identity should be stable across redirects and tracking parameters.
  return sha256Hex(canonicalUrl);
}

type DocCandidate = {
  node: GraphNode;
  priority: number;
  versioning: VersioningInfo;
};

function cmpDocCandidates(a: DocCandidate, b: DocCandidate): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  const ad = a.versioning.dateEpochMs ?? -1;
  const bd = b.versioning.dateEpochMs ?? -1;
  if (ad !== bd) return bd - ad;

  const av = a.versioning.versionTuple ?? [];
  const bv = b.versioning.versionTuple ?? [];
  const n = Math.max(av.length, bv.length);
  for (let i = 0; i < n; i++) {
    const x = av[i] ?? 0;
    const y = bv[i] ?? 0;
    if (x !== y) return y - x;
  }

  return a.node.url.localeCompare(b.node.url);
}

function chooseDocsToFetch(
  docNodes: GraphNode[],
  maxDocsToFetch: number,
  docPriority?: (url: string) => number,
): GraphNode[] {
  const candidates: DocCandidate[] = docNodes.map((node) => ({
    node,
    priority: docPriority ? docPriority(node.url) : 0,
    versioning: analyzeVersioning({ url: node.url }),
  }));

  // Group by version family and sort within each family so the "best" version comes first.
  const byFamily = new Map<string, DocCandidate[]>();
  for (const c of candidates) {
    const key = c.versioning.familyId || "unknown";
    const xs = byFamily.get(key);
    if (xs) xs.push(c);
    else byFamily.set(key, [c]);
  }
  for (const xs of byFamily.values()) xs.sort(cmpDocCandidates);

  // First pass: take the best doc from each family (sorted by strength).
  const firstPass = Array.from(byFamily.values())
    .map((xs) => xs[0])
    .filter((x): x is DocCandidate => !!x)
    .sort(cmpDocCandidates);

  const chosen: DocCandidate[] = [];
  const chosenUrls = new Set<string>();
  for (const c of firstPass) {
    if (chosen.length >= maxDocsToFetch) break;
    if (chosenUrls.has(c.node.url)) continue;
    chosenUrls.add(c.node.url);
    chosen.push(c);
  }

  if (chosen.length >= maxDocsToFetch) return chosen.map((c) => c.node);

  // Second pass: fill remaining slots with the remaining candidates.
  const rest = candidates
    .filter((c) => !chosenUrls.has(c.node.url))
    .sort(cmpDocCandidates);
  for (const c of rest) {
    if (chosen.length >= maxDocsToFetch) break;
    chosenUrls.add(c.node.url);
    chosen.push(c);
  }

  return chosen.map((c) => c.node);
}

function inferContentType(
  classification: Classification | undefined,
  result: Crawl4AIResult,
): ExtractedDocRecord["contentType"] {
  if (classification?.kind === "document") {
    const dk: DocumentKind | undefined = classification.docKind;
    if (dk === "pdf") return "pdf";
    if (dk === "markdown") return "markdown";
  }
  if (result.markdown?.trim()) return "markdown";
  if (result.html?.trim()) return "html";
  if (result.content?.trim()) return "text";
  return "unknown";
}

function chooseBestContent(
  contentType: ExtractedDocRecord["contentType"],
  result: Crawl4AIResult,
): string | undefined {
  if (contentType === "markdown")
    return result.markdown ?? result.content ?? result.html;
  if (contentType === "text")
    return result.content ?? result.markdown ?? result.html;
  if (contentType === "html")
    return result.html ?? result.markdown ?? result.content;
  // For PDFs, prefer extracted markdown/content and avoid HTML embed wrappers.
  if (contentType === "pdf") return result.markdown ?? result.content;
  return result.content ?? result.markdown ?? result.html;
}

function looksLikePdfUrl(url: string): boolean {
  if (/\.pdf(?:$|[?#&])/i.test(url)) return true;
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();
    if (p.includes("/pdf/") || p.endsWith("/pdf") || p.includes("/txt/pdf/"))
      return true;
    for (const [k, v] of u.searchParams.entries()) {
      const kl = k.toLowerCase();
      const vl = v.toLowerCase();
      if (kl === "format" && vl === "pdf") return true;
      if (vl.includes(".pdf")) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function looksLikeMarkdownUrl(url: string): boolean {
  return /\.md(?:$|[?#&])/i.test(url) || /\.markdown(?:$|[?#&])/i.test(url);
}

function looksLikeTextDocUrl(url: string): boolean {
  return /\.(txt|text|csv|tsv|xml|json|yml|yaml)(?:$|[?#&])/i.test(url);
}

function looksLikePdfMagic(buf: Buffer): boolean {
  const head = buf.subarray(0, 8).toString("utf8");
  return head.startsWith("%PDF-");
}

function looksLikeHtmlText(s: string | undefined): boolean {
  if (!s) return false;
  const head = s.trimStart().slice(0, 400).toLowerCase();
  return head.includes("<html") || head.startsWith("<!doctype html");
}

async function fetchTextDocument(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<string> {
  const timeoutMs = opts?.timeoutMs ?? 45_000;
  const maxBytes = opts?.maxBytes ?? 5 * 1024 * 1024; // 5MB

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Regula-Isolated/1.0" },
    });
    if (!res.ok)
      throw new HttpError(
        res.status,
        res.statusText,
        `Text fetch failed: HTTP ${res.status} ${res.statusText}`,
      );

    const lenHeader = res.headers.get("content-length");
    if (lenHeader) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && len > maxBytes) {
        throw new Error(`Text too large: ${len} bytes (limit ${maxBytes})`);
      }
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `Text too large: ${buf.byteLength} bytes (limit ${maxBytes})`,
      );
    }

    return buf.toString("utf8").trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBytesDocument(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<{
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  contentType?: string;
  buf: Buffer;
}> {
  const timeoutMs = opts?.timeoutMs ?? 45_000;
  const maxBytes = opts?.maxBytes ?? 25 * 1024 * 1024;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Regula-Isolated/1.0",
        // Encourage servers to send actual file bytes rather than HTML navigation wrappers.
        Accept:
          "application/pdf, text/*, application/xml, application/json;q=0.9, */*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new HttpError(
        res.status,
        res.statusText,
        `Download failed: HTTP ${res.status} ${res.statusText}`,
      );
    }

    const lenHeader = res.headers.get("content-length");
    if (lenHeader) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && len > maxBytes) {
        // Caller decides how to handle "too large"; keep message stable.
        throw new Error(`Download too large: ${len} bytes (limit ${maxBytes})`);
      }
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `Download too large: ${buf.byteLength} bytes (limit ${maxBytes})`,
      );
    }

    return {
      requestedUrl: url,
      finalUrl: res.url || url,
      statusCode: res.status,
      contentType: res.headers.get("content-type") ?? undefined,
      buf,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function _looksLikePdfEmbedHtml(content: string | undefined): boolean {
  if (!content) return false;
  const s = content.trimStart().slice(0, 500).toLowerCase();
  if (!s.includes("<html")) return false;
  // Common "browser embed" wrapper for PDFs.
  return (
    s.includes("application/pdf") &&
    (s.includes("<embed") || s.includes("<object"))
  );
}

function isTooLargeError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("Download too large:");
}

function s3HardCapBytes(): number {
  const raw = process.env.ISOLATED_S3_HARD_CAP_BYTES;
  const n = raw ? Number(raw) : NaN;
  // Default: 1GB safety cap (way above our current test cases).
  return Number.isFinite(n) && n > 0 ? n : 1024 * 1024 * 1024;
}

function oversizePdfBytesThreshold(): number {
  const raw = process.env.ISOLATED_OVERSIZE_PDF_BYTES;
  const n = raw ? Number(raw) : NaN;
  // Default: 300MB
  return Number.isFinite(n) && n > 0 ? n : 300 * 1024 * 1024;
}

function shouldDeleteS3AfterProcessing(): boolean {
  const raw = (process.env.ISOLATED_S3_DELETE_AFTER ?? "1").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

async function headContentLength(
  url: string,
  timeoutMs = 10_000,
): Promise<number | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Regula-Isolated/1.0" },
    });
    if (!res.ok) return undefined;
    const lenHeader = res.headers.get("content-length");
    if (!lenHeader) return undefined;
    const len = Number(lenHeader);
    return Number.isFinite(len) && len >= 0 ? len : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function buildNodeMap(nodes: GraphNode[]): Map<string, GraphNode> {
  const m = new Map<string, GraphNode>();
  for (const n of nodes) m.set(n.url, n);
  return m;
}

function computeDocLineage(
  docUrl: string,
  nodesByUrl: Map<string, GraphNode>,
  edges: GraphEdge[],
): DocLineage {
  const referrers = new Set<string>();
  let minRefDepth: number | undefined;

  for (const e of edges) {
    if (e.type !== "links_to") continue;
    if (e.to !== docUrl) continue;
    referrers.add(e.from);
    const fromNode = nodesByUrl.get(e.from);
    if (fromNode) {
      minRefDepth =
        minRefDepth === undefined
          ? fromNode.depth
          : Math.min(minRefDepth, fromNode.depth);
    }
  }

  const node = nodesByUrl.get(docUrl);
  const nodeDepth =
    node?.depth ?? (minRefDepth !== undefined ? minRefDepth + 1 : 0);
  const depth =
    minRefDepth !== undefined
      ? Math.min(nodeDepth, minRefDepth + 1)
      : nodeDepth;

  return {
    referrers: sortStableStrings(Array.from(referrers)),
    depth,
    minReferrerDepth: minRefDepth,
  };
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      const item = items[i];
      if (item === undefined) {
        throw new Error("mapConcurrent: encountered undefined item");
      }
      out[i] = await fn(item, i);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return out;
}

export async function writeDocsJsonlAndTxt(
  ctx: RunContext,
  graph: BuildGraphResult,
  opts?: WriteDocsOptions,
): Promise<WriteDocsResult> {
  const nodesByUrl = buildNodeMap(graph.nodes);
  const docNodes = graph.nodes.filter(
    (n) => n.kind === "document" || n.isDocumentArtifact,
  );

  const maxDocsToFetch = opts?.maxDocsToFetch ?? docNodes.length;
  const docPriority = opts?.docPriority;
  const toFetch = chooseDocsToFetch(
    docNodes,
    Math.max(0, maxDocsToFetch),
    docPriority,
  );

  const writeDocTxt = opts?.writeDocTxt ?? true;
  const concurrency = opts?.concurrency ?? 4;
  const robotsEnabled = opts?.robotsEnabled ?? true;
  const robotsUserAgent = opts?.robotsUserAgent ?? "regula-bot";
  const robotsTimeoutMs = opts?.robotsTimeoutMs ?? 6000;
  const robotsByOrigin = new Map<string, ReturnType<typeof loadRobotsPolicy>>();

  let docsFetched = 0;
  let docErrors = 0;
  let docsSkipped = 0;
  let docsWrittenTxt = 0;

  const records = await mapConcurrent(toFetch, concurrency, async (node) => {
    const lineage = computeDocLineage(node.url, nodesByUrl, graph.edges);
    const fetchedAt = nowIso();

    try {
      if (robotsEnabled) {
        const origin = originOf(node.url);
        if (origin) {
          let policyPromise = robotsByOrigin.get(origin);
          if (!policyPromise) {
            policyPromise = loadRobotsPolicy(origin, {
              userAgent: robotsUserAgent,
              timeoutMs: robotsTimeoutMs,
            });
            robotsByOrigin.set(origin, policyPromise);
          }
          const policy = await policyPromise;
          if (!policy.isAllowed(node.url)) {
            docsSkipped += 1;
            const versioning = analyzeVersioning({ url: node.url });
            const rec: ExtractedDocRecord = {
              version: 1,
              id: bestDocId(canonicalizeUrl(node.url) ?? node.url),
              fetchedAt,
              url: node.url,
              requestedUrl: node.url,
              classification: node.classification,
              versioning,
              contentType:
                node.classification?.docKind === "pdf" ? "pdf" : "unknown",
              lineage,
              skipped: true,
              skipReason: "robots:disallowed",
            };
            return rec;
          }
        }
      }

      // Conservative default: avoid fetching cross-origin docs unless they look "same-site"
      // (same parent domain) or have extremely high relevance. This keeps runs green and
      // avoids wasting budget on random external links.
      const docOrigin = originOf(node.url);
      const isCrossOrigin = !!docOrigin && docOrigin !== graph.rootOrigin;
      if (isCrossOrigin) {
        const sameSite = isSameParentDomain(graph.rootOrigin, node.url);
        const score =
          node.relevanceScore ?? (docPriority ? docPriority(node.url) : 0);
        const minCrossOriginScore = 700;

        if (!sameSite && score < minCrossOriginScore) {
          docsSkipped += 1;
          const versioning = analyzeVersioning({ url: node.url });
          const rec: ExtractedDocRecord = {
            version: 1,
            id: bestDocId(canonicalizeUrl(node.url) ?? node.url),
            fetchedAt,
            url: node.url,
            requestedUrl: node.url,
            classification: node.classification,
            versioning,
            contentType:
              node.classification?.docKind === "pdf" ? "pdf" : "unknown",
            lineage,
            skipped: true,
            skipReason: "cross_origin_low_relevance",
          };
          logInfo("Skipping low-relevance cross-origin doc", {
            url: node.url,
            score,
            minCrossOriginScore,
          });
          return rec;
        }
      }

      // HTML-first ecosystems: page nodes promoted as document artifacts.
      if (node.isDocumentArtifact) {
        const bestUrl = canonicalizeUrl(node.url) ?? node.url;
        const fetched = await fetchBytesDocument(bestUrl, {
          timeoutMs: 45_000,
          maxBytes: 3 * 1024 * 1024,
        });
        const finalBest = canonicalizeUrl(fetched.finalUrl) ?? fetched.finalUrl;
        const id = bestDocId(finalBest);
        const versioning = analyzeVersioning({ url: finalBest });

        const text = fetched.buf.toString("utf8").trim();
        const rec: ExtractedDocRecord = {
          version: 1,
          id,
          fetchedAt,
          url: finalBest,
          requestedUrl:
            canonicalizeUrl(fetched.requestedUrl) ?? fetched.requestedUrl,
          finalUrl: finalBest,
          statusCode: fetched.statusCode,
          classification: node.classification,
          versioning,
          contentType: "html",
          content: text?.trim() ? text : undefined,
          extraction: { status: "extracted" },
          lineage,
        };

        docsFetched += 1;

        if (writeDocTxt && rec.content) {
          const txtPath = path.join(ctx.docsDir, `${id}.txt`);
          await writeFile(txtPath, rec.content, "utf8");
          docsWrittenTxt += 1;
        }

        return rec;
      }

      // Raw markdown/text endpoints (e.g. raw.githubusercontent.com): bypass Crawl4AI.
      if (
        looksLikeMarkdownUrl(node.url) ||
        node.url.includes("raw.githubusercontent.com/")
      ) {
        const bestUrl = canonicalizeUrl(node.url) ?? node.url;
        const text = await fetchTextDocument(bestUrl);
        const id = bestDocId(bestUrl);
        const versioning = analyzeVersioning({ url: bestUrl });

        const rec: ExtractedDocRecord = {
          version: 1,
          id,
          fetchedAt,
          url: bestUrl,
          requestedUrl: bestUrl,
          classification: node.classification,
          versioning,
          contentType: "markdown",
          content: text?.trim() ? text : undefined,
          extraction: { status: "extracted" },
          lineage,
        };

        docsFetched += 1;

        if (writeDocTxt && rec.content) {
          const txtPath = path.join(ctx.docsDir, `${id}.txt`);
          await writeFile(txtPath, rec.content, "utf8");
          docsWrittenTxt += 1;
        }

        return rec;
      }

      // Text-ish docs (csv/xml/json/txt): bypass Crawl4AI (Playwright navigation can fail on downloads).
      if (looksLikeTextDocUrl(node.url)) {
        const bestUrl = canonicalizeUrl(node.url) ?? node.url;
        const fetched = await fetchBytesDocument(bestUrl, {
          timeoutMs: 45_000,
          maxBytes: 10 * 1024 * 1024,
        });
        const finalBest = canonicalizeUrl(fetched.finalUrl) ?? fetched.finalUrl;
        const text = fetched.buf.toString("utf8").trim();
        const id = bestDocId(finalBest);
        const versioning = analyzeVersioning({ url: bestUrl });

        const rec: ExtractedDocRecord = {
          version: 1,
          id,
          fetchedAt,
          url: finalBest,
          requestedUrl:
            canonicalizeUrl(fetched.requestedUrl) ?? fetched.requestedUrl,
          finalUrl: finalBest,
          statusCode: fetched.statusCode,
          classification: node.classification,
          versioning,
          contentType: looksLikeHtmlText(text) ? "html" : "text",
          content: text?.trim() ? text : undefined,
          extraction: { status: "extracted" },
          lineage,
        };

        docsFetched += 1;

        if (writeDocTxt && rec.content) {
          const txtPath = path.join(ctx.docsDir, `${id}.txt`);
          await writeFile(txtPath, rec.content, "utf8");
          docsWrittenTxt += 1;
        }

        return rec;
      }

      // PDFs: bypass Crawl4AI but sniff bytes first.
      // Some endpoints end with `.pdf` but do not actually return PDF bytes (or return HTML wrappers).
      if (looksLikePdfUrl(node.url)) {
        const bestUrl = canonicalizeUrl(node.url) ?? node.url;
        const runId = path.basename(ctx.runDir);
        const title = undefined;

        const relevanceScore =
          node.relevanceScore ?? (docPriority ? docPriority(node.url) : 0);
        const contentLength = await headContentLength(bestUrl);

        // If the server tells us it's extremely large, don't even try buffering.
        // Default policy: ingest to S3 and defer extraction for >=300MB unless explicitly forced.
        const oversizeThreshold = oversizePdfBytesThreshold();
        const isOversize =
          typeof contentLength === "number" &&
          contentLength >= oversizeThreshold;
        const forceExtractOversize =
          process.env.ISOLATED_FORCE_EXTRACT_OVERSIZE === "1";
        const extractOversizeMinScoreRaw =
          process.env.ISOLATED_OVERSIZE_EXTRACT_MIN_SCORE;
        const extractOversizeMinScore = extractOversizeMinScoreRaw
          ? Number(extractOversizeMinScoreRaw)
          : 1200;
        const shouldExtractOversizeNow =
          forceExtractOversize ||
          (Number.isFinite(extractOversizeMinScore) &&
            relevanceScore >= extractOversizeMinScore);

        try {
          const fetched = await fetchBytesDocument(bestUrl, {
            timeoutMs: 60_000,
            maxBytes: 25 * 1024 * 1024,
          });
          const finalBest =
            canonicalizeUrl(fetched.finalUrl) ?? fetched.finalUrl;
          const id = bestDocId(finalBest);
          const versioning = analyzeVersioning({ url: finalBest, title });

          let contentType: ExtractedDocRecord["contentType"] = "pdf";
          let content: string | undefined;

          if (looksLikePdfMagic(fetched.buf)) {
            // pdf-parse v2 exposes a `PDFParse` class (no default function export).
            const { PDFParse } = await import("pdf-parse");
            const parser = new PDFParse({ data: fetched.buf });
            try {
              const result = await parser.getText();
              content = (result.text ?? "").trim();
            } finally {
              await parser.destroy().catch(() => {});
            }
          } else {
            // Not actually a PDF; fall back to decoding as text/HTML.
            const text = fetched.buf.toString("utf8").trim();
            contentType = looksLikeHtmlText(text) ? "html" : "text";
            content = text;
          }

          const rec: ExtractedDocRecord = {
            version: 1,
            id,
            fetchedAt,
            url: finalBest,
            requestedUrl:
              canonicalizeUrl(fetched.requestedUrl) ?? fetched.requestedUrl,
            finalUrl: finalBest,
            statusCode: fetched.statusCode,
            classification: node.classification,
            versioning,
            contentType,
            content: content?.trim() ? content : undefined,
            extraction: { status: "extracted" },
            lineage,
          };

          docsFetched += 1;

          if (writeDocTxt && rec.content) {
            const txtPath = path.join(ctx.docsDir, `${id}.txt`);
            await writeFile(txtPath, rec.content, "utf8");
            docsWrittenTxt += 1;
          }

          return rec;
        } catch (err) {
          // Large PDFs: stream to S3 to avoid buffering.
          // Default policy: for >=300MB, defer extraction unless high relevance / forced.
          if (!isTooLargeError(err) && !isOversize) throw err;

          const key = `isolated/${runId}/oversize/${sha256Hex(bestUrl)}.pdf`;
          const uploaded = await uploadUrlToS3({
            url: bestUrl,
            key,
            contentType: "application/pdf",
            timeoutMs: 10 * 60_000,
            maxBytesHardCap: s3HardCapBytes(),
          });

          let mdResult: Crawl4AIResult | undefined;
          let deleted = false;
          const oversizeByUploadedBytes = uploaded.bytes >= oversizeThreshold;
          const deferExtraction =
            (isOversize || oversizeByUploadedBytes) &&
            !shouldExtractOversizeNow;

          if (!deferExtraction) {
            try {
              const signedUrl = await presignGetObjectUrl(
                uploaded.location,
                10 * 60,
              );
              mdResult = await crawlMd(
                signedUrl,
                undefined,
                opts?.clientOptions,
              );
            } finally {
              if (shouldDeleteS3AfterProcessing()) {
                await deleteS3Object(uploaded.location).catch(() => {});
                deleted = true;
              }
            }
          } else {
            if (shouldDeleteS3AfterProcessing()) {
              await deleteS3Object(uploaded.location).catch(() => {});
              deleted = true;
            }
          }

          const id = bestDocId(bestUrl);
          const versioning = analyzeVersioning({ url: bestUrl, title });
          const contentType: ExtractedDocRecord["contentType"] = "pdf";
          const content = mdResult
            ? chooseBestContent("pdf", mdResult)
            : undefined;

          const rec: ExtractedDocRecord = {
            version: 1,
            id,
            fetchedAt,
            url: bestUrl,
            requestedUrl: bestUrl,
            finalUrl: bestUrl,
            statusCode: mdResult?.statusCode,
            classification: node.classification,
            versioning,
            contentType,
            content: content?.trim() ? content : undefined,
            extraction: deferExtraction
              ? {
                  status: "deferred_oversize",
                  reason: `pdf>=oversize_threshold (${uploaded.bytes} bytes)`,
                }
              : { status: "extracted" },
            storage: {
              provider: "s3",
              bucket: uploaded.location.bucket,
              key: uploaded.location.key,
              region: uploaded.location.region,
              etag: uploaded.etag,
              bytes: uploaded.bytes,
              sha256Hex: uploaded.sha256Hex,
              deleted,
            },
            lineage,
          };

          docsFetched += 1;

          if (writeDocTxt && rec.content) {
            const txtPath = path.join(ctx.docsDir, `${id}.txt`);
            await writeFile(txtPath, rec.content, "utf8");
            docsWrittenTxt += 1;
          }

          return rec;
        }
      }

      // Download-ish endpoints with unknown kind: prefer direct fetch + sniffing over Crawl4AI.
      if (
        node.classification?.kind === "document" &&
        node.classification.docKind === "unknown"
      ) {
        const bestUrl = canonicalizeUrl(node.url) ?? node.url;
        const fetched = await fetchBytesDocument(bestUrl, {
          timeoutMs: 45_000,
          maxBytes: 15 * 1024 * 1024,
        });
        const finalBest = canonicalizeUrl(fetched.finalUrl) ?? fetched.finalUrl;
        const id = bestDocId(finalBest);
        const versioning = analyzeVersioning({ url: finalBest });

        let contentType: ExtractedDocRecord["contentType"] = "unknown";
        let content: string | undefined;

        if (
          looksLikePdfMagic(fetched.buf) ||
          fetched.contentType?.toLowerCase().includes("application/pdf")
        ) {
          contentType = "pdf";
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: fetched.buf });
          try {
            const result = await parser.getText();
            content = (result.text ?? "").trim();
          } finally {
            await parser.destroy().catch(() => {});
          }
        } else {
          const text = fetched.buf.toString("utf8").trim();
          contentType = looksLikeHtmlText(text) ? "html" : "text";
          content = text;
        }

        const rec: ExtractedDocRecord = {
          version: 1,
          id,
          fetchedAt,
          url: finalBest,
          requestedUrl:
            canonicalizeUrl(fetched.requestedUrl) ?? fetched.requestedUrl,
          finalUrl: finalBest,
          statusCode: fetched.statusCode,
          classification: node.classification,
          versioning,
          contentType,
          content: content?.trim() ? content : undefined,
          extraction: { status: "extracted" },
          lineage,
        };

        docsFetched += 1;

        if (writeDocTxt && rec.content) {
          const txtPath = path.join(ctx.docsDir, `${id}.txt`);
          await writeFile(txtPath, rec.content, "utf8");
          docsWrittenTxt += 1;
        }

        return rec;
      }

      // Non-PDF docs/pages: use Crawl4AI.
      const result = await crawl(
        node.url,
        opts?.crawlOptions,
        opts?.clientOptions,
      );
      const bestUrl =
        canonicalizeUrl(result.finalUrl ?? result.requestedUrl) ??
        result.finalUrl ??
        result.requestedUrl;
      const classification = classifyCrawlResult(result, {
        preferContentSignals: true,
      });
      const contentType = inferContentType(classification, result);
      const content = chooseBestContent(contentType, result);

      const redirectChain = result.redirectChain?.map(
        (u) => canonicalizeUrl(u) ?? u,
      );
      const id = bestDocId(bestUrl);
      const title = (result.metadata?.title as string | undefined) ?? undefined;
      const versioning = analyzeVersioning({ url: bestUrl, title });
      const rec: ExtractedDocRecord = {
        version: 1,
        id,
        fetchedAt,
        url: bestUrl,
        requestedUrl:
          canonicalizeUrl(result.requestedUrl) ?? result.requestedUrl,
        finalUrl: result.finalUrl
          ? (canonicalizeUrl(result.finalUrl) ?? result.finalUrl)
          : undefined,
        redirectChain,
        statusCode: result.statusCode,
        title,
        classification,
        versioning,
        contentType,
        content: content?.trim() ? content : undefined,
        extraction: { status: "extracted" },
        lineage,
      };

      docsFetched += 1;

      if (writeDocTxt && rec.content) {
        const txtPath = path.join(ctx.docsDir, `${id}.txt`);
        await writeFile(txtPath, rec.content, "utf8");
        docsWrittenTxt += 1;
      }

      return rec;
    } catch (err) {
      // Treat dead cross-origin links as "skipped" so they don't fail the run.
      const rootOrigin = originOf(graph.rootOrigin) ?? graph.rootOrigin;
      const docOrigin = originOf(node.url);
      const isCrossOrigin = !!docOrigin && docOrigin !== rootOrigin;

      if (isCrossOrigin && err instanceof HttpError && err.statusCode === 404) {
        docsSkipped += 1;
        const versioning = analyzeVersioning({ url: node.url });
        const rec: ExtractedDocRecord = {
          version: 1,
          id: bestDocId(canonicalizeUrl(node.url) ?? node.url),
          fetchedAt,
          url: node.url,
          requestedUrl: node.url,
          classification: node.classification,
          versioning,
          contentType:
            node.classification?.docKind === "pdf" ? "pdf" : "unknown",
          lineage,
          statusCode: err.statusCode,
          skipped: true,
          skipReason: "cross_origin_404",
        };
        logInfo("Skipping dead cross-origin doc link (404)", { url: node.url });
        return rec;
      }

      // In testing, treat forbidden/unauthorized as "unavailable" rather than a hard error.
      if (
        err instanceof HttpError &&
        (err.statusCode === 401 || err.statusCode === 403)
      ) {
        docsSkipped += 1;
        const versioning = analyzeVersioning({ url: node.url });
        const rec: ExtractedDocRecord = {
          version: 1,
          id: bestDocId(canonicalizeUrl(node.url) ?? node.url),
          fetchedAt,
          url: node.url,
          requestedUrl: node.url,
          classification: node.classification,
          versioning,
          contentType:
            node.classification?.docKind === "pdf" ? "pdf" : "unknown",
          lineage,
          statusCode: err.statusCode,
          skipped: true,
          skipReason: err.statusCode === 401 ? "unauthorized" : "forbidden",
        };
        logInfo("Skipping unavailable doc (auth)", {
          url: node.url,
          statusCode: err.statusCode,
        });
        return rec;
      }

      docErrors += 1;
      const versioning = analyzeVersioning({ url: node.url });
      const rec: ExtractedDocRecord = {
        version: 1,
        id: bestDocId(canonicalizeUrl(node.url) ?? node.url),
        fetchedAt,
        url: node.url,
        requestedUrl: node.url,
        classification: node.classification,
        versioning,
        contentType: node.classification?.docKind === "pdf" ? "pdf" : "unknown",
        lineage,
        error: err instanceof Error ? err.message : String(err),
      };

      logError("Document crawl failed", { url: node.url, err: rec.error });
      return rec;
    }
  });

  const jsonl =
    records.map((r) => JSON.stringify(r)).join("\n") +
    (records.length > 0 ? "\n" : "");
  await writeFile(ctx.docsJsonlPath, jsonl, "utf8");

  logInfo("Wrote docs.jsonl", {
    docsJsonl: ctx.docsJsonlPath,
    docsDiscovered: docNodes.length,
    docsFetched,
    docErrors,
    docsSkipped,
    docsWrittenTxt,
  });

  return {
    docsDiscovered: docNodes.length,
    docsFetched,
    docErrors,
    docsSkipped,
    docsWrittenTxt,
  };
}
