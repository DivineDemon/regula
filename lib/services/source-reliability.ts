import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentGraphs, targets, versions } from "@/lib/db/schema";
import type { ContentGraph } from "./content-discovery";

const RELIABILITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type SourceReliabilityComponents = {
  /** 0–1: data recency vs crawl cadence */
  freshness: number;
  /** 0–1: successful version writes vs expected crawl slots in the window */
  crawlDelivery: number;
  /** 0–1: stability of discovered graph size between last two analyses */
  graphStability: number;
  /** 0–1: last crawl job outcome */
  lastAttempt: number;
};

export type SourceReliability = {
  composite: number;
  components: SourceReliabilityComponents;
};

function crawlIntervalHours(crawlFrequency: string): number {
  switch (crawlFrequency) {
    case "hourly":
      return 1;
    case "daily":
      return 24;
    case "weekly":
      return 168;
    case "monthly":
      return 720;
    default:
      return 24;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function parseGraphNodeCount(graphData: string): number {
  try {
    const g = JSON.parse(graphData) as ContentGraph;
    return Array.isArray(g.nodes) ? g.nodes.length : 0;
  } catch {
    return 0;
  }
}

/**
 * When the target is less reliable, boost priority for stale nodes so we re-verify
 * them sooner within the adaptive crawl budget.
 */
export function adaptiveCrawlPriorityMultiplier(params: {
  goalDocumentScore: number;
  recencyScore: number;
  targetReliabilityComposite: number;
}): number {
  const { goalDocumentScore, recencyScore, targetReliabilityComposite } =
    params;
  const r = clamp01(targetReliabilityComposite);
  const staleBoost = 1 + (1 - r) * (1 - clamp01(recencyScore));
  return goalDocumentScore * staleBoost;
}

function computeFreshness(params: {
  latestVersionAt: Date | null;
  lastCrawlAt: Date | null;
  crawlIntervalHours: number;
}): number {
  const {
    latestVersionAt,
    lastCrawlAt,
    crawlIntervalHours: intervalH,
  } = params;
  const ref = latestVersionAt ?? lastCrawlAt;
  if (!ref) return 0.25;

  const ageMs = Date.now() - ref.getTime();
  const softMaxMs = Math.max(
    intervalH * 3 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  );
  if (ageMs <= 0) return 1;
  if (ageMs >= softMaxMs) return 0.2;
  return 1 - ageMs / softMaxMs;
}

function computeCrawlDelivery(params: {
  versionCountInWindow: number;
  crawlIntervalHours: number;
  windowMs: number;
}): number {
  const {
    versionCountInWindow,
    crawlIntervalHours: intervalH,
    windowMs,
  } = params;
  const windowHours = windowMs / (60 * 60 * 1000);
  const expected = Math.max(1, Math.floor(windowHours / intervalH));
  const ratio = versionCountInWindow / expected;
  // Allow slack: hitting ~60% of expected is still "fine" (content often unchanged)
  const normalized = Math.min(1, ratio / 0.6);
  return clamp01(normalized);
}

function computeGraphStability(prevCount: number, currCount: number): number {
  const maxN = Math.max(prevCount, currCount, 1);
  const relDelta = Math.abs(currCount - prevCount) / maxN;
  return clamp01(1 - Math.min(1, relDelta * 1.5));
}

function computeLastAttempt(
  lastCrawlStatus: string | null | undefined,
): number {
  if (lastCrawlStatus === "completed") return 1;
  if (lastCrawlStatus === "failed") return 0.35;
  if (lastCrawlStatus === "running") return 0.75;
  return 0.55;
}

function compositeFromComponents(c: SourceReliabilityComponents): number {
  return clamp01(
    0.28 * c.freshness +
      0.32 * c.crawlDelivery +
      0.22 * c.graphStability +
      0.18 * c.lastAttempt,
  );
}

async function loadGraphPairCounts(
  targetId: string,
): Promise<{ prev: number; curr: number } | null> {
  const rows = await db
    .select({
      graphData: contentGraphs.graphData,
    })
    .from(contentGraphs)
    .where(eq(contentGraphs.targetId, targetId))
    .orderBy(desc(contentGraphs.lastAnalyzed))
    .limit(2);

  if (rows.length === 0) return null;
  if (rows.length === 1) {
    const n = parseGraphNodeCount(rows[0].graphData);
    return { prev: n, curr: n };
  }
  const curr = parseGraphNodeCount(rows[0].graphData);
  const prev = parseGraphNodeCount(rows[1].graphData);
  return { prev, curr };
}

export async function getTargetSourceReliability(
  targetId: string,
): Promise<SourceReliability> {
  const [targetRow] = await db
    .select()
    .from(targets)
    .where(eq(targets.id, targetId))
    .limit(1);

  if (!targetRow) {
    const neutral: SourceReliabilityComponents = {
      freshness: 0.5,
      crawlDelivery: 0.5,
      graphStability: 0.5,
      lastAttempt: 0.5,
    };
    return { composite: 0.5, components: neutral };
  }

  const intervalH = crawlIntervalHours(targetRow.crawlFrequency);
  const windowStart = new Date(Date.now() - RELIABILITY_WINDOW_MS);

  const [versionRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(versions)
    .where(
      and(
        eq(versions.targetId, targetId),
        gte(versions.crawledAt, windowStart),
      ),
    );

  const [latestVersion] = await db
    .select({ crawledAt: versions.crawledAt })
    .from(versions)
    .where(eq(versions.targetId, targetId))
    .orderBy(desc(versions.crawledAt))
    .limit(1);

  const versionCountInWindow = versionRow?.count ?? 0;

  const freshness = computeFreshness({
    latestVersionAt: latestVersion?.crawledAt ?? null,
    lastCrawlAt: targetRow.lastCrawlAt,
    crawlIntervalHours: intervalH,
  });

  const crawlDelivery = computeCrawlDelivery({
    versionCountInWindow,
    crawlIntervalHours: intervalH,
    windowMs: RELIABILITY_WINDOW_MS,
  });

  const pair = await loadGraphPairCounts(targetId);
  const graphStability = pair
    ? computeGraphStability(pair.prev, pair.curr)
    : 0.7;

  const lastAttempt = computeLastAttempt(targetRow.lastCrawlStatus);

  const components: SourceReliabilityComponents = {
    freshness: clamp01(freshness),
    crawlDelivery: clamp01(crawlDelivery),
    graphStability: clamp01(graphStability),
    lastAttempt: clamp01(lastAttempt),
  };

  return {
    composite: compositeFromComponents(components),
    components,
  };
}

type TargetCrawlMeta = { id: string; crawlFrequency: string };

/**
 * Batch reliability for scheduler ordering (one graph query + one versions query).
 */
export async function getTargetSourceReliabilityBatch(
  targetList: TargetCrawlMeta[],
): Promise<Map<string, SourceReliability>> {
  const result = new Map<string, SourceReliability>();
  if (targetList.length === 0) return result;

  const ids = targetList.map((t) => t.id);
  const targetRows = await db
    .select()
    .from(targets)
    .where(inArray(targets.id, ids));

  const byId = new Map(targetRows.map((t) => [t.id, t]));
  const windowStart = new Date(Date.now() - RELIABILITY_WINDOW_MS);

  const versionCounts = await db
    .select({
      targetId: versions.targetId,
      count: sql<number>`count(*)::int`,
    })
    .from(versions)
    .where(
      and(
        inArray(versions.targetId, ids),
        gte(versions.crawledAt, windowStart),
      ),
    )
    .groupBy(versions.targetId);

  const countByTarget = new Map(
    versionCounts.map((r) => [r.targetId, r.count]),
  );

  const latestVersions = await db
    .selectDistinctOn([versions.targetId], {
      targetId: versions.targetId,
      crawledAt: versions.crawledAt,
    })
    .from(versions)
    .where(inArray(versions.targetId, ids))
    .orderBy(versions.targetId, desc(versions.crawledAt));

  const latestByTarget = new Map(
    latestVersions.map((r) => [r.targetId, r.crawledAt]),
  );

  const allGraphs = await db
    .select({
      targetId: contentGraphs.targetId,
      graphData: contentGraphs.graphData,
      lastAnalyzed: contentGraphs.lastAnalyzed,
    })
    .from(contentGraphs)
    .where(inArray(contentGraphs.targetId, ids))
    .orderBy(asc(contentGraphs.targetId), desc(contentGraphs.lastAnalyzed));

  const graphsByTarget = new Map<string, typeof allGraphs>();
  for (const row of allGraphs) {
    const list = graphsByTarget.get(row.targetId) ?? [];
    if (list.length < 2) {
      list.push(row);
      graphsByTarget.set(row.targetId, list);
    }
  }

  for (const t of targetList) {
    const row = byId.get(t.id);
    if (!row) {
      result.set(t.id, {
        composite: 0.5,
        components: {
          freshness: 0.5,
          crawlDelivery: 0.5,
          graphStability: 0.5,
          lastAttempt: 0.5,
        },
      });
      continue;
    }

    const intervalH = crawlIntervalHours(row.crawlFrequency);
    const versionCountInWindow = countByTarget.get(t.id) ?? 0;
    const freshness = computeFreshness({
      latestVersionAt: latestByTarget.get(t.id) ?? null,
      lastCrawlAt: row.lastCrawlAt,
      crawlIntervalHours: intervalH,
    });
    const crawlDelivery = computeCrawlDelivery({
      versionCountInWindow,
      crawlIntervalHours: intervalH,
      windowMs: RELIABILITY_WINDOW_MS,
    });

    const gList = graphsByTarget.get(t.id) ?? [];
    let graphStability = 0.7;
    if (gList.length >= 2) {
      const curr = parseGraphNodeCount(gList[0].graphData);
      const prev = parseGraphNodeCount(gList[1].graphData);
      graphStability = computeGraphStability(prev, curr);
    } else if (gList.length === 1) {
      graphStability = 0.75;
    }

    const lastAttempt = computeLastAttempt(row.lastCrawlStatus);
    const components: SourceReliabilityComponents = {
      freshness: clamp01(freshness),
      crawlDelivery: clamp01(crawlDelivery),
      graphStability: clamp01(graphStability),
      lastAttempt: clamp01(lastAttempt),
    };
    result.set(t.id, {
      composite: compositeFromComponents(components),
      components,
    });
  }

  return result;
}
