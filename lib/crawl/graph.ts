import {
  type Classification,
  classifyCrawlResult,
  classifyUrl,
  type ResourceKind,
} from "./classify";
import type {
  Crawl4AIClientOptions,
  Crawl4AICrawlOptions,
  Crawl4AIResult,
} from "./crawl4ai";
import { crawl } from "./crawl4ai";
import { type ExtractedLinkSource, extractLinks } from "./extract";
import type { RobotsPolicy } from "./robots";
import { loadRobotsPolicy } from "./robots";
import { canonicalizeUrl } from "./url";
import { logError, logInfo } from "./utils";

export type GraphNodeKind = ResourceKind;

export type GraphNode = {
  url: string;
  kind: GraphNodeKind;
  /**
   * If true, this URL is a page node but should also be treated as a
   * "document artifact" for downstream extraction/storage (HTML-first ecosystems).
   */
  isDocumentArtifact?: boolean;
  /**
   * Best-effort content type hint for `isDocumentArtifact` nodes.
   */
  artifactContentType?: "html" | "markdown" | "text";
  /**
   * Canonicalized URL that was requested for this crawl (may differ from `url` due to redirects).
   */
  requestedUrl?: string;
  /**
   * Canonicalized final URL reported by Crawl4AI (may match `url`).
   */
  finalUrl?: string;
  /**
   * Best-effort redirect chain (canonicalized URLs).
   */
  redirectChain?: string[];
  /**
   * Other observed canonical URL aliases (requestedUrl + redirect chain entries).
   */
  aliases?: string[];
  /**
   * Depth in the page expansion tree (root page is depth 0).
   * For document nodes, this is the depth of the page that discovered it + 1.
   */
  depth: number;
  origin: string;
  discoveredFrom?: string;
  classification?: Classification;
  crawled?: boolean;
  statusCode?: number;
  title?: string;
  /**
   * Optional score used for pruning/inspection (higher = more relevant).
   */
  relevanceScore?: number;
  error?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  type: "links_to";
  source?: ExtractedLinkSource;
};

export type GraphBudgets = {
  maxPages?: number;
  maxDepth?: number;
  maxWallTimeMs?: number;
  maxDocs?: number;
};

export type GraphScope = {
  /**
   * If provided, pages must have pathname starting with this prefix to be expanded.
   * Defaults to an inferred prefix from the root URL.
   */
  pagePathPrefix?: string;
  /**
   * Expand pages only if they share the same origin as the root URL.
   * Defaults to true.
   */
  sameOriginPagesOnly?: boolean;
  /**
   * Allow recording document nodes even when cross-origin, as long as they are
   * discovered from an in-scope page.
   * Defaults to true.
   */
  allowCrossOriginDocs?: boolean;
};

export type HtmlDocumentPolicy = {
  /**
   * Enable treating certain HTML pages as "document artifacts".
   * Defaults to false.
   */
  enabled?: boolean;
  /**
   * Regex strings to include. If provided, at least one must match OR keyword scoring must pass.
   */
  includeUrlPatterns?: string[];
  /**
   * Regex strings to exclude (deny wins).
   */
  excludeUrlPatterns?: string[];
  /**
   * Optional free-form keywords used against URL + title (case-insensitive).
   */
  keywords?: string[];
  /**
   * Minimum score required to promote.
   * Defaults to 300.
   */
  minScore?: number;
};

export type BuildGraphOptions = {
  budgets?: GraphBudgets;
  scope?: GraphScope;
  /**
   * Optional robots.txt gating for **page expansion** (documents are not gated).
   * When enabled, pages that are disallowed by robots.txt will not be crawled/expanded.
   *
   * Defaults to disabled unless `ISOLATED_RESPECT_ROBOTS === "1"`.
   */
  robots?: {
    enabled?: boolean;
    userAgent?: string;
    timeoutMs?: number;
  };
  /**
   * Optional URL prioritizer used to choose the next page to crawl.
   * Higher scores are crawled earlier (best-first).
   *
   * Defaults to FIFO (BFS-ish) ordering when omitted.
   */
  pagePriority?: (url: string) => number;
  /**
   * Optional doc relevance scorer. If provided, we can prune document nodes
   * based on `minDocRelevanceScore`.
   */
  docRelevanceScore?: (url: string) => number;
  /**
   * If provided along with `docRelevanceScore`, document nodes with score below
   * this threshold will not be added to the graph.
   */
  minDocRelevanceScore?: number;
  /**
   * Optional policy to treat some HTML pages as "document artifacts".
   * The node remains a `page` for traversal, but is also emitted for extraction.
   */
  htmlDocumentPolicy?: HtmlDocumentPolicy;
  /**
   * Crawl4AI crawl options for page fetches.
   */
  crawlOptions?: Crawl4AICrawlOptions;
  /**
   * Crawl4AI client options (timeouts/retries, base URL, debug, etc).
   */
  clientOptions?: Crawl4AIClientOptions;
  /**
   * If true, allow extracting links from document nodes to discover more nodes.
   * Defaults to false to avoid unbounded expansion from large docs.
   */
  expandFromDocuments?: boolean;
};

export type BuildGraphStats = {
  pagesCrawled: number;
  docsDiscovered: number;
  pageErrors: number;
};

export type BuildGraphResult = {
  rootUrl: string;
  rootOrigin: string;
  scope: Required<GraphScope> & { inferredPagePathPrefix: boolean };
  budgets: Required<GraphBudgets>;
  startedAtMs: number;
  finishedAtMs: number;
  durationMs: number;
  stopReason: string;
  stats: BuildGraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function safeUrl(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

function originOf(u: string): string {
  return new URL(u).origin;
}

function safeRegex(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

function compilePatterns(patterns?: string[]): RegExp[] {
  if (!patterns) return [];
  const out: RegExp[] = [];
  for (const p of patterns) {
    const r = safeRegex(p);
    if (r) out.push(r);
  }
  return out;
}

function splitKeywords(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[,\n\r\t ]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function scoreHtmlDocCandidate(params: {
  url: string;
  title?: string;
  policy: HtmlDocumentPolicy;
}): { score: number; allow: boolean } {
  const policy = params.policy;
  const u = params.url.toLowerCase();
  const t = (params.title ?? "").toLowerCase();

  const exclude = compilePatterns(policy.excludeUrlPatterns);
  for (const r of exclude) {
    if (r.test(u) || r.test(t)) return { score: -10_000, allow: false };
  }

  // Hard-coded anti-signals for "infinite space" / navigational pages.
  if (u.includes("/search") || u.includes("search?") || u.includes("filter="))
    return { score: -10_000, allow: false };
  if (t.includes("search |")) return { score: -10_000, allow: false };

  const include = compilePatterns(policy.includeUrlPatterns);
  const hasInclude = include.length > 0 && include.some((r) => r.test(u));

  const kws = (policy.keywords ?? []).flatMap(splitKeywords);

  let score = 0;

  // URL-based hints
  const urlHints = [
    "publication",
    "publications",
    "pubs",
    "guidance",
    "regulation",
    "regulations",
    "directive",
    "standard",
    "standards",
    "circular",
    "notice",
  ];
  for (const h of urlHints) if (u.includes(h)) score += 60;

  // Title-based hints (stronger)
  const titleHints = [
    "special publication",
    "nistir",
    "fips",
    "final",
    "draft",
    "withdrawn",
    "guidance",
    "regulation",
  ];
  for (const h of titleHints) if (t.includes(h)) score += 120;

  for (const kw of kws) {
    const k = kw.toLowerCase();
    if (!k) continue;
    if (u.includes(k)) score += 80;
    if (t.includes(k)) score += 120;
  }

  // Include pattern is a strong boost.
  if (hasInclude) score += 250;

  const minScore = policy.minScore ?? 300;
  const allow = score >= minScore;
  return { score, allow };
}

async function fetchHtmlDirect(
  url: string,
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<{ finalUrl: string; statusCode: number; html: string }> {
  const timeoutMs = opts?.timeoutMs ?? 25_000;
  const maxBytes = opts?.maxBytes ?? 3 * 1024 * 1024; // 3MB

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Some sites reject empty/unknown UAs.
        "User-Agent": "Regula-Isolated/1.0",
      },
    });

    const statusCode = res.status;
    const finalUrl = res.url || url;

    // Guard very large responses (avoid OOM / slow parses).
    const lenHeader = res.headers.get("content-length");
    if (lenHeader) {
      const len = Number(lenHeader);
      if (Number.isFinite(len) && len > maxBytes) {
        throw new Error(
          `Direct fetch too large: ${len} bytes (limit ${maxBytes})`,
        );
      }
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `Direct fetch too large: ${buf.byteLength} bytes (limit ${maxBytes})`,
      );
    }

    // Best-effort decode.
    const html = buf.toString("utf8");
    return { finalUrl, statusCode, html };
  } finally {
    clearTimeout(timeout);
  }
}

function asCrawl4AIResultFromHtml(params: {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  html: string;
}): Crawl4AIResult {
  const requestedCanonical =
    canonicalizeUrl(params.requestedUrl) ?? params.requestedUrl;
  const finalCanonical = canonicalizeUrl(params.finalUrl) ?? params.finalUrl;
  const redirectChain =
    requestedCanonical === finalCanonical
      ? [finalCanonical]
      : [requestedCanonical, finalCanonical];
  return {
    requestedUrl: requestedCanonical,
    finalUrl: finalCanonical,
    redirectChain,
    statusCode: params.statusCode,
    html: params.html,
    // Keep `content` empty here; extraction will parse HTML.
    content: undefined,
    markdown: undefined,
    metadata: undefined,
  };
}

function inferPathPrefixFromRoot(rootUrl: string): string {
  // For generalized crawling, overly tight path prefixes cause us to miss
  // real content that lives elsewhere on the same origin (e.g. NIST uses
  // `/publications/...` pages that link to `/pubs/...` artifacts).
  //
  // We rely on budgets (maxPages/maxDepth/maxWallTimeMs) + relevance pruning
  // to keep this safe.
  void rootUrl;
  return "/";
}

function normalizePrefix(prefix: string): string {
  if (!prefix) return "/";
  if (!prefix.startsWith("/")) return `/${prefix}`;
  return prefix;
}

function shouldExpandPage(params: {
  url: string;
  rootOrigin: string;
  pagePathPrefix: string;
  sameOriginPagesOnly: boolean;
}): boolean {
  const u = safeUrl(params.url);
  if (!u) return false;
  if (params.sameOriginPagesOnly && u.origin !== params.rootOrigin)
    return false;
  if (
    params.pagePathPrefix !== "/" &&
    !u.pathname.startsWith(params.pagePathPrefix)
  )
    return false;
  return true;
}

function isDocumentByHint(url: string): boolean {
  const c = classifyUrl(url);
  return c.kind === "document";
}

type QueueItem = { url: string; depth: number; discoveredFrom?: string };

function popNext(
  queue: QueueItem[],
  pagePriority?: (url: string) => number,
): QueueItem | undefined {
  if (queue.length === 0) return undefined;
  if (!pagePriority) return queue.shift();

  let bestIdx = 0;
  let bestScore = pagePriority(queue[0]?.url);

  for (let i = 1; i < queue.length; i++) {
    const item = queue[i];
    if (!item) continue;
    const score = pagePriority(item.url);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
      continue;
    }
    if (score === bestScore) {
      // Tie-breaker: prefer shallower depth (more likely to find "hub" pages quickly).
      if (item.depth < queue[bestIdx]?.depth) {
        bestIdx = i;
      }
    }
  }

  const [picked] = queue.splice(bestIdx, 1);
  return picked;
}

function defaultBudgets(b?: GraphBudgets): Required<GraphBudgets> {
  return {
    maxPages: b?.maxPages ?? 50,
    maxDepth: b?.maxDepth ?? 2,
    maxWallTimeMs: b?.maxWallTimeMs ?? 120_000,
    maxDocs: b?.maxDocs ?? 200,
  };
}

function defaultScope(
  rootUrl: string,
  s?: GraphScope,
): Required<GraphScope> & { inferredPagePathPrefix: boolean } {
  const provided = s?.pagePathPrefix;
  const inferred = !provided;
  return {
    pagePathPrefix: normalizePrefix(
      provided ?? inferPathPrefixFromRoot(rootUrl),
    ),
    sameOriginPagesOnly: s?.sameOriginPagesOnly ?? true,
    allowCrossOriginDocs: s?.allowCrossOriginDocs ?? true,
    inferredPagePathPrefix: inferred,
  };
}

function ensureNode(
  map: Map<string, GraphNode>,
  url: string,
  patch: Partial<GraphNode> & Pick<GraphNode, "url" | "kind" | "depth">,
): GraphNode {
  const existing = map.get(url);
  if (existing) {
    const mergedAliases = (() => {
      const a = existing.aliases ?? [];
      const b = patch.aliases ?? [];
      if (a.length === 0 && b.length === 0) return existing.aliases;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of [...a, ...b]) {
        if (!v) continue;
        if (seen.has(v)) continue;
        seen.add(v);
        out.push(v);
      }
      return out.length > 0 ? out : undefined;
    })();

    const mergedRedirectChain =
      (existing.redirectChain?.length ?? 0) >=
      (patch.redirectChain?.length ?? 0)
        ? existing.redirectChain
        : patch.redirectChain;

    const merged: GraphNode = {
      ...existing,
      ...patch,
      // never "forget" earlier discovery lineage
      discoveredFrom: existing.discoveredFrom ?? patch.discoveredFrom,
      classification: existing.classification ?? patch.classification,
      requestedUrl: existing.requestedUrl ?? patch.requestedUrl,
      finalUrl: existing.finalUrl ?? patch.finalUrl,
      redirectChain: mergedRedirectChain,
      aliases: mergedAliases,
    };
    map.set(url, merged);
    return merged;
  }

  const node: GraphNode = {
    url,
    kind: patch.kind,
    isDocumentArtifact: patch.isDocumentArtifact,
    artifactContentType: patch.artifactContentType,
    requestedUrl: patch.requestedUrl,
    finalUrl: patch.finalUrl,
    redirectChain: patch.redirectChain,
    aliases: patch.aliases,
    depth: patch.depth,
    origin: originOf(url),
    discoveredFrom: patch.discoveredFrom,
    classification: patch.classification,
    crawled: patch.crawled,
    statusCode: patch.statusCode,
    title: patch.title,
    relevanceScore: patch.relevanceScore,
    error: patch.error,
  };
  map.set(url, node);
  return node;
}

function addEdge(edgeSet: Set<string>, edges: GraphEdge[], e: GraphEdge): void {
  const key = `${e.type}\t${e.from}\t${e.to}\t${e.source ?? ""}`;
  if (edgeSet.has(key)) return;
  edgeSet.add(key);
  edges.push(e);
}

function canonicalOrThrow(raw: string): string {
  const u = canonicalizeUrl(raw);
  if (!u) throw new Error(`Invalid or unsupported URL: ${raw}`);
  return u;
}

function bestUrlForResult(result: Crawl4AIResult): string {
  const best = result.finalUrl ?? result.requestedUrl;
  return canonicalizeUrl(best) ?? best;
}

export async function buildGraph(
  rootUrlInput: string,
  opts?: BuildGraphOptions,
): Promise<BuildGraphResult> {
  const startedAtMs = Date.now();
  const budgets = defaultBudgets(opts?.budgets);
  const rootUrl = canonicalOrThrow(rootUrlInput);
  const rootOrigin = originOf(rootUrl);
  const scope = defaultScope(rootUrl, opts?.scope);
  const docRelevanceScore = opts?.docRelevanceScore;
  const minDocRelevanceScore = opts?.minDocRelevanceScore;
  const expandFromDocuments = opts?.expandFromDocuments ?? false;
  const htmlDocPolicy = opts?.htmlDocumentPolicy;
  const robotsEnabled =
    opts?.robots?.enabled ?? process.env.ISOLATED_RESPECT_ROBOTS === "1";
  const robotsUserAgent =
    opts?.robots?.userAgent ?? process.env.ISOLATED_ROBOTS_UA ?? "RegulaBot";
  const robotsTimeoutMs = opts?.robots?.timeoutMs ?? 10_000;
  const robotsByOrigin = new Map<string, Promise<RobotsPolicy>>();

  const nodesByUrl = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  const pagesVisited = new Set<string>();
  const queue: QueueItem[] = [];

  const stats: BuildGraphStats = {
    pagesCrawled: 0,
    docsDiscovered: 0,
    pageErrors: 0,
  };

  // Root handling: if it looks like a document by URL hint, keep it as a document node.
  const rootHintIsDoc = isDocumentByHint(rootUrl);
  ensureNode(nodesByUrl, rootUrl, {
    url: rootUrl,
    kind: rootHintIsDoc ? "document" : "page",
    depth: 0,
  });

  if (rootHintIsDoc) {
    // A root document (e.g. raw markdown / PDF) should not require Crawl4AI page crawling.
    // We treat it as an already-discovered goal doc and stop graph expansion here.
    stats.docsDiscovered = 1;
    const finishedAtMs = Date.now();
    return {
      rootUrl,
      rootOrigin,
      scope,
      budgets,
      startedAtMs,
      finishedAtMs,
      durationMs: finishedAtMs - startedAtMs,
      stopReason: "root_is_document",
      stats,
      nodes: Array.from(nodesByUrl.values()),
      edges,
    };
  }

  queue.push({ url: rootUrl, depth: 0 });

  let stopReason = "queue_exhausted";

  while (queue.length > 0) {
    const elapsedMs = Date.now() - startedAtMs;
    if (elapsedMs >= budgets.maxWallTimeMs) {
      stopReason = "maxWallTimeMs";
      break;
    }

    const item = popNext(queue, opts?.pagePriority);
    if (!item) break;
    const { url, depth } = item;

    // Budget guard: never exceed maxDepth for page expansion.
    if (depth > budgets.maxDepth) continue;

    // Decide whether this URL is eligible for page expansion (pre-crawl).
    // Note: redirects can change the final URL; we re-check scope post-crawl.
    const hinted = classifyUrl(url);
    const isPageCandidate = hinted.kind !== "document";
    const itemUrlInScopePage = isPageCandidate
      ? shouldExpandPage({
          url,
          rootOrigin,
          pagePathPrefix: scope.pagePathPrefix,
          sameOriginPagesOnly: scope.sameOriginPagesOnly,
        })
      : false;

    // Page budget applies to crawled pages; documents crawled only when they enter the queue (root doc case).
    if (itemUrlInScopePage && stats.pagesCrawled >= budgets.maxPages) {
      stopReason = "maxPages";
      break;
    }

    if (pagesVisited.has(url)) continue;
    pagesVisited.add(url);

    // Optional robots gating: prevent page crawling/expansion if disallowed.
    // Documents are intentionally not gated here (they are fetched separately and are the "goal artifacts").
    if (robotsEnabled && itemUrlInScopePage && isPageCandidate) {
      let origin: string | null = null;
      try {
        origin = new URL(url).origin;
      } catch {
        origin = null;
      }

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
        if (!policy.isAllowed(url)) {
          ensureNode(nodesByUrl, url, {
            url,
            kind: hinted.kind === "unknown" ? "page" : hinted.kind,
            depth,
            discoveredFrom: item.discoveredFrom,
            classification: hinted,
            crawled: false,
            error: "robots:disallowed",
          });
          continue;
        }
      }
    }

    let result: Crawl4AIResult | null = null;
    try {
      result = await crawl(url, opts?.crawlOptions, opts?.clientOptions);
    } catch (err) {
      // Fallback: if Crawl4AI fails (timeouts, bot defenses, etc), try a direct HTML fetch.
      // This is less robust than rendered crawling, but lets us extract basic links and progress.
      try {
        const direct = await fetchHtmlDirect(url, { timeoutMs: 25_000 });
        result = asCrawl4AIResultFromHtml({
          requestedUrl: url,
          finalUrl: direct.finalUrl,
          statusCode: direct.statusCode,
          html: direct.html,
        });
        logInfo("Crawl4AI failed; used direct fetch fallback", {
          url,
          depth,
          statusCode: direct.statusCode,
          finalUrl: direct.finalUrl,
        });
      } catch (fallbackErr) {
        stats.pageErrors += 1;
        ensureNode(nodesByUrl, url, {
          url,
          kind: hinted.kind === "document" ? "document" : "page",
          depth,
          discoveredFrom: item.discoveredFrom,
          crawled: false,
          error: `crawl4ai:${err instanceof Error ? err.message : String(err)}; direct:${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
        });
        logError("Crawl failed (including direct fallback)", {
          url,
          depth,
          err: err instanceof Error ? err.message : String(err),
          fallbackErr:
            fallbackErr instanceof Error
              ? fallbackErr.message
              : String(fallbackErr),
        });
        continue;
      }
    }

    const bestUrl = bestUrlForResult(result);
    const classification = classifyCrawlResult(result);

    // If Crawl4AI reports a different final URL, merge under canonical bestUrl.
    const nodeUrl = canonicalizeUrl(bestUrl) ?? bestUrl;
    const requestedCanonical =
      canonicalizeUrl(result.requestedUrl) ?? result.requestedUrl;
    const finalCanonical = result.finalUrl
      ? (canonicalizeUrl(result.finalUrl) ?? result.finalUrl)
      : undefined;
    const redirectChainCanonical = result.redirectChain?.map(
      (u) => canonicalizeUrl(u) ?? u,
    );
    const aliases = (() => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of [
        requestedCanonical,
        ...(redirectChainCanonical ?? []),
        nodeUrl,
      ]) {
        if (!v) continue;
        if (seen.has(v)) continue;
        seen.add(v);
        out.push(v);
      }
      return out.length > 0 ? out : undefined;
    })();
    // Prefer URL-hinted documents over Crawl4AI HTML wrappers.
    const hintedKind = classifyUrl(nodeUrl);
    const nodeKind: GraphNodeKind =
      hintedKind.kind === "document" ? "document" : classification.kind;
    const nodeUrlInScopePage =
      nodeKind === "page"
        ? shouldExpandPage({
            url: nodeUrl,
            rootOrigin,
            pagePathPrefix: scope.pagePathPrefix,
            sameOriginPagesOnly: scope.sameOriginPagesOnly,
          })
        : false;

    // Avoid re-crawling the canonical/final URL if it appears later.
    pagesVisited.add(nodeUrl);

    ensureNode(nodesByUrl, nodeUrl, {
      url: nodeUrl,
      kind: nodeKind,
      requestedUrl: requestedCanonical,
      finalUrl: finalCanonical,
      redirectChain: redirectChainCanonical,
      aliases,
      depth,
      discoveredFrom: item.discoveredFrom,
      classification,
      crawled: true,
      statusCode: result.statusCode,
      title: (result.metadata?.title as string | undefined) ?? undefined,
    });

    // Optional: promote some in-scope HTML pages as document artifacts (HTML-first ecosystems).
    // Keep `kind: "page"` so traversal still works.
    if (nodeKind === "page" && nodeUrlInScopePage && htmlDocPolicy?.enabled) {
      const node = nodesByUrl.get(nodeUrl);
      if (node && !node.isDocumentArtifact) {
        const title =
          (result.metadata?.title as string | undefined) ?? node.title;
        const scored = scoreHtmlDocCandidate({
          url: nodeUrl,
          title,
          policy: htmlDocPolicy,
        });
        if (scored.allow) {
          // Apply doc budget to artifacts too.
          if (stats.docsDiscovered < budgets.maxDocs) {
            node.isDocumentArtifact = true;
            node.artifactContentType = "html";
            node.relevanceScore = Math.max(
              node.relevanceScore ?? 0,
              scored.score,
            );
            stats.docsDiscovered += 1;
          }
        }
      }
    }

    if (nodeKind === "page" && nodeUrlInScopePage) {
      stats.pagesCrawled += 1;
    }

    // Extract links for:
    // - pages (always)
    // - documents (only if configured)
    // Enforce scope: only expand from in-scope pages. If a redirect moved the
    // page out-of-scope, we still keep it as a node, but do not expand further.
    if (nodeKind === "page" && !nodeUrlInScopePage) continue;
    if (nodeKind !== "page" && !expandFromDocuments) {
      continue;
    }

    const { links } = extractLinks({
      baseUrl: nodeUrl,
      html: result.html,
      markdown: result.markdown,
      textFallback: result.content,
    });

    for (const l of links) {
      const target = l.url;
      if (!target) continue;

      const targetHint = classifyUrl(target);

      // 1) Documents: record node + edge (cross-origin allowed by policy).
      if (targetHint.kind === "document") {
        const targetOrigin = originOf(target);
        const isCrossOrigin = targetOrigin !== rootOrigin;
        if (isCrossOrigin && !scope.allowCrossOriginDocs) continue;

        const score = docRelevanceScore ? docRelevanceScore(target) : undefined;
        if (docRelevanceScore && typeof minDocRelevanceScore === "number") {
          if ((score ?? 0) < minDocRelevanceScore) {
            // Prune irrelevant docs from the graph.
            continue;
          }
        }

        if (!nodesByUrl.has(target)) {
          if (stats.docsDiscovered >= budgets.maxDocs) continue;
          stats.docsDiscovered += 1;
        }

        ensureNode(nodesByUrl, target, {
          url: target,
          kind: "document",
          depth: depth + 1,
          discoveredFrom: nodeUrl,
          classification: targetHint,
          relevanceScore: score,
        });

        addEdge(edgeSet, edges, {
          from: nodeUrl,
          to: target,
          type: "links_to",
          source: l.source,
        });
        continue;
      }

      // 2) Non-doc links: treat as page candidates, but only enqueue if in-scope.
      if (
        shouldExpandPage({
          url: target,
          rootOrigin,
          pagePathPrefix: scope.pagePathPrefix,
          sameOriginPagesOnly: scope.sameOriginPagesOnly,
        })
      ) {
        // Ensure the node exists as a page candidate for visibility in graph.
        ensureNode(nodesByUrl, target, {
          url: target,
          kind: "page",
          depth: depth + 1,
          discoveredFrom: nodeUrl,
          classification: targetHint,
        });

        addEdge(edgeSet, edges, {
          from: nodeUrl,
          to: target,
          type: "links_to",
          source: l.source,
        });

        if (depth + 1 <= budgets.maxDepth && !pagesVisited.has(target)) {
          queue.push({
            url: target,
            depth: depth + 1,
            discoveredFrom: nodeUrl,
          });
        }
      } else {
        // Out-of-scope pages: keep edge + node as unknown for traceability (but never expand).
        ensureNode(nodesByUrl, target, {
          url: target,
          kind: "unknown",
          depth: depth + 1,
          discoveredFrom: nodeUrl,
          classification: targetHint,
        });
        addEdge(edgeSet, edges, {
          from: nodeUrl,
          to: target,
          type: "links_to",
          source: l.source,
        });
      }
    }
  }

  const finishedAtMs = Date.now();
  const durationMs = Math.max(0, finishedAtMs - startedAtMs);

  logInfo("Graph crawl finished", {
    rootUrl,
    pagesCrawled: stats.pagesCrawled,
    docsDiscovered: stats.docsDiscovered,
    nodes: nodesByUrl.size,
    edges: edges.length,
    stopReason,
    durationMs,
  });

  return {
    rootUrl,
    rootOrigin,
    scope,
    budgets,
    startedAtMs,
    finishedAtMs,
    durationMs,
    stopReason,
    stats,
    nodes: Array.from(nodesByUrl.values()),
    edges,
  };
}
