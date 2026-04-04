import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import {
  contentEdges,
  contentGraphs,
  contentNodes,
  type UpdatePattern,
} from "@/lib/db/schema";
import type { ContentGraph, ContentNode } from "./content-discovery";

/**
 * Graph diff result
 */
export interface GraphDiff {
  addedNodes: ContentNode[];
  removedNodes: ContentNode[];
  modifiedNodes: Array<{
    node: ContentNode;
    oldFingerprint: string;
    newFingerprint: string;
  }>;
  structuralChanges: {
    newEdges: Array<{ from: string; to: string }>;
    removedEdges: Array<{ from: string; to: string }>;
  };
}

/**
 * Detect update pattern from content graph history
 */
export async function detectUpdatePattern(targetId: string): Promise<{
  pattern: UpdatePattern;
  confidence: number;
}> {
  // Get content graph history
  const graphHistory = await db
    .select()
    .from(contentGraphs)
    .where(eq(contentGraphs.targetId, targetId))
    .orderBy(desc(contentGraphs.lastAnalyzed))
    .limit(10);

  if (graphHistory.length < 2) {
    // Not enough history, return default
    return {
      pattern: "mixed",
      confidence: 0.5,
    };
  }

  // Analyze patterns
  const patterns = {
    newFilesAdded: 0,
    existingFilesModified: 0,
    structuralChanges: 0,
    versionedUrls: 0,
  };

  // Compare consecutive graphs
  for (let i = 1; i < graphHistory.length; i++) {
    const prevGraph = JSON.parse(graphHistory[i - 1].graphData) as ContentGraph;
    const currGraph = JSON.parse(graphHistory[i].graphData) as ContentGraph;

    const diff = compareContentGraphs(prevGraph, currGraph);

    if (diff.addedNodes.length > diff.modifiedNodes.length) {
      patterns.newFilesAdded++;
    }
    if (diff.modifiedNodes.length > diff.addedNodes.length) {
      patterns.existingFilesModified++;
    }
    if (diff.structuralChanges.newEdges.length > 0) {
      patterns.structuralChanges++;
    }

    // Check for versioned URLs
    const hasVersionedUrls = currGraph.nodes.some((node) =>
      /\/v\d+\/|\/version-\d+|\d{4}-\d{2}-\d{2}/.test(node.url),
    );
    if (hasVersionedUrls) {
      patterns.versionedUrls++;
    }
  }

  // Determine dominant pattern
  const maxPattern = Object.entries(patterns).reduce((a, b) =>
    patterns[b[0] as keyof typeof patterns] >
    patterns[a[0] as keyof typeof patterns]
      ? b
      : a,
  );

  let detectedPattern: UpdatePattern = "mixed";
  let confidence = 0.5;

  if (maxPattern[0] === "newFilesAdded" && maxPattern[1] > 0) {
    detectedPattern = "new_files_added";
    confidence = Math.min(0.9, 0.5 + maxPattern[1] * 0.1);
  } else if (maxPattern[0] === "existingFilesModified" && maxPattern[1] > 0) {
    detectedPattern = "single_page_static";
    confidence = Math.min(0.9, 0.5 + maxPattern[1] * 0.1);
  } else if (maxPattern[0] === "versionedUrls" && maxPattern[1] > 0) {
    detectedPattern = "versioned_urls";
    confidence = Math.min(0.9, 0.5 + maxPattern[1] * 0.1);
  } else if (maxPattern[0] === "structuralChanges" && maxPattern[1] > 0) {
    detectedPattern = "nested_navigation";
    confidence = Math.min(0.9, 0.5 + maxPattern[1] * 0.1);
  }

  return {
    pattern: detectedPattern,
    confidence,
  };
}

/**
 * Compare two content graphs
 */
export function compareContentGraphs(
  oldGraph: ContentGraph,
  newGraph: ContentGraph,
): GraphDiff {
  const diff: GraphDiff = {
    addedNodes: [],
    removedNodes: [],
    modifiedNodes: [],
    structuralChanges: {
      newEdges: [],
      removedEdges: [],
    },
  };

  // Compare nodes (by URL)
  const oldNodeMap = new Map(oldGraph.nodes.map((n) => [n.url, n]));
  const newNodeMap = new Map(newGraph.nodes.map((n) => [n.url, n]));

  // Find additions and modifications
  for (const newNode of newGraph.nodes) {
    const oldNode = oldNodeMap.get(newNode.url);

    if (!oldNode) {
      // New node
      diff.addedNodes.push(newNode);
    } else if (oldNode.fingerprint !== newNode.fingerprint) {
      // Modified node
      diff.modifiedNodes.push({
        node: newNode,
        oldFingerprint: oldNode.fingerprint,
        newFingerprint: newNode.fingerprint,
      });
    }
  }

  // Find removals
  for (const oldNode of oldGraph.nodes) {
    if (!newNodeMap.has(oldNode.url)) {
      diff.removedNodes.push(oldNode);
    }
  }

  // Compare edges
  const oldEdgeSet = new Set(oldGraph.edges.map((e) => `${e.from}:${e.to}`));
  const newEdgeSet = new Set(newGraph.edges.map((e) => `${e.from}:${e.to}`));

  // Find new edges
  for (const newEdge of newGraph.edges) {
    const edgeKey = `${newEdge.from}:${newEdge.to}`;
    if (!oldEdgeSet.has(edgeKey)) {
      diff.structuralChanges.newEdges.push({
        from: newEdge.from,
        to: newEdge.to,
      });
    }
  }

  // Find removed edges
  for (const oldEdge of oldGraph.edges) {
    const edgeKey = `${oldEdge.from}:${oldEdge.to}`;
    if (!newEdgeSet.has(edgeKey)) {
      diff.structuralChanges.removedEdges.push({
        from: oldEdge.from,
        to: oldEdge.to,
      });
    }
  }

  return diff;
}

/**
 * Store content graph in database
 */
export async function storeContentGraph(
  targetId: string,
  graph: ContentGraph,
  sitemapSource?: string,
): Promise<void> {
  // Detect pattern
  const patternInfo = await detectUpdatePattern(targetId);

  // Store graph
  const graphId = nanoid();
  await db.insert(contentGraphs).values({
    id: graphId,
    targetId,
    rootUrl: graph.rootUrl,
    graphData: JSON.stringify(graph),
    detectedPattern: patternInfo.pattern,
    patternConfidence: patternInfo.confidence.toString(),
    sitemapSource: sitemapSource || null,
    lastAnalyzed: graph.lastAnalyzed,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Store nodes
  for (const node of graph.nodes) {
    await db
      .insert(contentNodes)
      .values({
        id: node.id,
        targetId,
        url: node.url,
        type: node.type,
        fingerprint: node.fingerprint,
        discoveredAt: node.discoveredAt,
        lastSeen: node.lastSeen,
        status: node.status,
        metadata: node.metadata ? JSON.stringify(node.metadata) : null,
      })
      .onConflictDoUpdate({
        target: contentNodes.id,
        set: {
          fingerprint: node.fingerprint,
          lastSeen: node.lastSeen,
          status: node.status,
          metadata: node.metadata ? JSON.stringify(node.metadata) : null,
        },
      });
  }

  // Store edges (replace existing for this target so stored graph matches current)
  await db.delete(contentEdges).where(eq(contentEdges.targetId, targetId));
  const now = new Date();
  for (const edge of graph.edges) {
    await db.insert(contentEdges).values({
      id: nanoid(),
      targetId,
      fromNodeId: edge.from,
      toNodeId: edge.to,
      relationship: edge.relationship,
      discoveredAt: now,
    });
  }
}

/**
 * Get latest content graph for target
 */
export async function getLatestContentGraph(
  targetId: string,
): Promise<ContentGraph | null> {
  const [latest] = await db
    .select()
    .from(contentGraphs)
    .where(eq(contentGraphs.targetId, targetId))
    .orderBy(desc(contentGraphs.lastAnalyzed))
    .limit(1);

  if (!latest) {
    return null;
  }

  return JSON.parse(latest.graphData) as ContentGraph;
}

/**
 * Adapt crawling strategy based on detected pattern
 */
export function adaptStrategyForPattern(pattern: UpdatePattern): {
  useSitemap: boolean;
  directPdfUrls: boolean;
  pagesToCrawl: number;
  skipDiscovery: boolean;
} {
  switch (pattern) {
    case "new_files_added":
      // Focus on discovering new files (sitemap is good for this)
      return {
        useSitemap: true,
        directPdfUrls: true,
        pagesToCrawl: 10, // Limit pages, focus on PDFs
        skipDiscovery: true,
      };

    case "versioned_urls":
      // Track version numbers
      return {
        useSitemap: true,
        directPdfUrls: true,
        pagesToCrawl: 5,
        skipDiscovery: true,
      };

    case "nested_navigation":
      // Need to crawl pages to find PDFs
      return {
        useSitemap: true,
        directPdfUrls: false,
        pagesToCrawl: 50, // More pages needed
        skipDiscovery: false,
      };

    default:
      // Mixed or unknown - use balanced approach
      return {
        useSitemap: true,
        directPdfUrls: true,
        pagesToCrawl: 20,
        skipDiscovery: false,
      };
  }
}
