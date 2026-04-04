import type {
  ContentEdge,
  ContentGraph,
  ContentNode,
} from "./content-discovery";
import { getLatestContentGraph } from "./pattern-detection";

export type TargetConfig = {
  url: string;
  label?: string;
  jurisdiction?: string;
  category?: string;
};

export type GoalDocument = {
  node: ContentNode;
  score: number;
  distance: number;
  relevanceScore: number;
  recencyScore: number;
  docConfidence: number;
};

export type VersionFamily = {
  /** Stable key for the family (e.g. URL stem or title slug) */
  familyKey: string;
  /** Document nodes in this family, ordered with newest first */
  nodes: ContentNode[];
  /** Canonical "latest" document for crawling */
  canonical: ContentNode;
  /** version_of edges: newer → older (canonical is first) */
  versionOfEdges: Array<{ from: string; to: string }>;
};

/**
 * Build adjacency list from graph (forward links only for traversal from root).
 * Includes links_to and contains; version_of is used only for family grouping.
 */
function buildAdjacency(graph: ContentGraph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.relationship === "links_to" || edge.relationship === "contains") {
      const list = adj.get(edge.from) ?? [];
      if (!list.includes(edge.to)) list.push(edge.to);
      adj.set(edge.from, list);
    }
  }
  return adj;
}

/**
 * Find the node that best matches the root URL (exact or path prefix).
 */
function findRootNode(graph: ContentGraph): ContentNode | null {
  const root = graph.rootUrl;
  const exact = graph.nodes.find((n) => n.url === root);
  if (exact) return exact;
  try {
    const rootPath = new URL(root).pathname;
    const sameOrigin = graph.nodes.filter((n) => {
      try {
        return new URL(n.url).origin === new URL(root).origin;
      } catch {
        return false;
      }
    });
    const byPath = sameOrigin.find((n) => {
      const p = new URL(n.url).pathname;
      return (
        p === rootPath ||
        p.startsWith(`${rootPath}/`) ||
        rootPath.startsWith(`${p}/`)
      );
    });
    return byPath ?? sameOrigin[0] ?? null;
  } catch {
    return graph.nodes[0] ?? null;
  }
}

/**
 * Document-ness confidence: PDF > document > page (we only rank doc nodes).
 */
function docConfidence(node: ContentNode): number {
  if (node.type === "pdf") return 1;
  if (node.type === "document") return 0.8;
  return 0.3;
}

/**
 * Recency score from lastSeen and metadata.lastModified (0–1, higher = newer).
 */
function recencyScore(node: ContentNode): number {
  const t = node.metadata?.lastModified
    ? new Date(node.metadata.lastModified).getTime()
    : new Date(node.lastSeen).getTime();
  const ageMs = Date.now() - t;
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  if (ageMs <= 0) return 1;
  if (ageMs >= oneYear) return 0;
  return 1 - ageMs / oneYear;
}

/**
 * Relevance score from target config (label, jurisdiction, category) in URL and title (0–1).
 */
function relevanceScore(node: ContentNode, config?: TargetConfig): number {
  if (!config) return 0.5;
  const urlLower = node.url.toLowerCase();
  const title = (node.metadata?.title ?? "").toLowerCase();
  let score = 0;
  const terms = [config.label, config.jurisdiction, config.category].filter(
    Boolean,
  ) as string[];
  for (const term of terms) {
    const t = term.toLowerCase();
    if (urlLower.includes(t)) score += 0.25;
    if (title.includes(t)) score += 0.35;
  }
  return Math.min(1, 0.2 + score);
}

/**
 * Returns reachable document nodes from root, ranked by distance, relevance, recency, and doc confidence.
 */
export function rankGoalDocuments(
  graph: ContentGraph,
  config?: TargetConfig,
): GoalDocument[] {
  const root = findRootNode(graph);
  if (!root) return [];

  const adj = buildAdjacency(graph);
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const isDoc = (n: ContentNode) => n.type === "pdf" || n.type === "document";

  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [
    { id: root.id, depth: 0 },
  ];
  const documentNodes: Array<{ node: ContentNode; depth: number }> = [];

  while (queue.length > 0) {
    const nextItem = queue.shift();
    if (!nextItem) break;
    const { id, depth } = nextItem;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodeById.get(id);
    if (!node) continue;
    if (isDoc(node)) documentNodes.push({ node, depth });
    const next = adj.get(id) ?? [];
    for (const toId of next) {
      if (!visited.has(toId)) queue.push({ id: toId, depth: depth + 1 });
    }
  }

  const maxDepth = Math.max(1, ...documentNodes.map((d) => d.depth));
  const distanceScore = (depth: number) => 1 - depth / maxDepth;

  const scored: GoalDocument[] = documentNodes.map(({ node, depth }) => {
    const dScore = distanceScore(depth);
    const rScore = relevanceScore(node, config);
    const recScore = recencyScore(node);
    const conf = docConfidence(node);
    const score = 0.25 * dScore + 0.3 * rScore + 0.25 * recScore + 0.2 * conf;
    return {
      node,
      score,
      distance: depth,
      relevanceScore: rScore,
      recencyScore: recScore,
      docConfidence: conf,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Get ranked goal documents for a target (from latest stored graph).
 */
export async function getGoalDocuments(
  targetId: string,
  options?: { limit?: number; targetConfig?: TargetConfig },
): Promise<GoalDocument[]> {
  const graph = await getLatestContentGraph(targetId);
  if (!graph) return [];
  const ranked = rankGoalDocuments(graph, options?.targetConfig);
  const limit = options?.limit ?? 50;
  return ranked.slice(0, limit);
}

/**
 * Normalize URL to a stable stem for version grouping (path without trailing slash, no query).
 */
function urlStem(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.origin}${path}`;
  } catch {
    return url;
  }
}

/**
 * Extract a stable identifier from URL or title (e.g. doc number, version segment).
 */
function stableIdentifier(node: ContentNode): string {
  const url = node.url;
  const title = (node.metadata?.title ?? "").trim();
  const path = new URL(url).pathname;
  const segments = path.split("/").filter(Boolean);
  const withVersion = segments.find((s) =>
    /^v?\d+$|^\d{4}-\d{2}-\d{2}$/.test(s),
  );
  if (withVersion) return withVersion;
  const last = segments[segments.length - 1];
  if (last) return last.replace(/\.[a-z0-9]+$/i, "");
  if (title) return title.slice(0, 60).replace(/\s+/g, "-").toLowerCase();
  return path;
}

/**
 * Parse date or version number from URL/title for ordering.
 */
function versionOrder(node: ContentNode): { date: number; version: number } {
  const url = node.url;
  const title = node.metadata?.title ?? "";
  const combined = `${url} ${title}`;
  const dateMatch = combined.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date = dateMatch
    ? new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`).getTime()
    : 0;
  const vMatch = combined.match(/[vV](\d+)|version[-_]?(\d+)|(\d+)(?:\.\d+)*/);
  const version = vMatch
    ? parseInt(vMatch[1] ?? vMatch[2] ?? vMatch[3] ?? "0", 10)
    : 0;
  const lastSeen = new Date(node.lastSeen).getTime();
  return { date: date || lastSeen, version };
}

/**
 * Cluster document nodes into version families by URL stem and stable identifier; order by recency/version.
 */
export function buildVersionFamilies(graph: ContentGraph): VersionFamily[] {
  const docNodes = graph.nodes.filter(
    (n) => n.type === "pdf" || n.type === "document",
  );
  const byStem = new Map<string, ContentNode[]>();
  for (const node of docNodes) {
    const stem = urlStem(node.url);
    const list = byStem.get(stem) ?? [];
    list.push(node);
    byStem.set(stem, list);
  }

  const families: VersionFamily[] = [];
  for (const [stem, nodes] of byStem) {
    if (nodes.length === 0) continue;
    const withOrder = nodes.map((n) => ({
      node: n,
      ...versionOrder(n),
    }));
    withOrder.sort((a, b) => {
      if (b.date !== a.date) return b.date - a.date;
      return b.version - a.version;
    });
    const ordered = withOrder.map((o) => o.node);
    const canonical = ordered[0];
    if (!canonical) continue;
    const versionOfEdges: Array<{ from: string; to: string }> = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      versionOfEdges.push({
        from: ordered[i]?.id,
        to: ordered[i + 1]?.id,
      });
    }
    const familyKey = stableIdentifier(canonical) || stem;
    families.push({
      familyKey,
      nodes: ordered,
      canonical,
      versionOfEdges,
    });
  }
  return families;
}

/**
 * Get version families for a target from the latest stored graph.
 */
export async function getVersionFamilies(
  targetId: string,
): Promise<VersionFamily[]> {
  const graph = await getLatestContentGraph(targetId);
  if (!graph) return [];
  return buildVersionFamilies(graph);
}

/**
 * Enrich a content graph with version_of edges from version families.
 * Use before storing the graph so persisted edges include version_of.
 */
export function enrichGraphWithVersionFamilies(
  graph: ContentGraph,
): ContentGraph {
  const families = buildVersionFamilies(graph);
  const existingKeys = new Set(
    graph.edges.map((e) => `${e.from}:${e.to}:${e.relationship}`),
  );
  const newEdges: ContentEdge[] = [...graph.edges];
  for (const fam of families) {
    for (const { from, to } of fam.versionOfEdges) {
      const key = `${from}:${to}:version_of`;
      if (!existingKeys.has(key)) {
        newEdges.push({ from, to, relationship: "version_of" });
        existingKeys.add(key);
      }
    }
  }
  return {
    ...graph,
    edges: newEdges,
  };
}
