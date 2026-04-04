import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  alertAssignments,
  alertFeedback,
  alerts,
  targets,
} from "@/lib/db/schema";
import type { TargetCategory } from "@/lib/db/schema/targets";
import { CACHE_KEYS, CACHE_TTL, withCache } from "./cache-helpers";

/** Rolling window for adaptive signals (aligned with moat plan baselines). */
export const ADAPTIVE_SIGNAL_WINDOW_DAYS = 90;

/** Minimum alert samples before org-level multiplier deviates from 1. */
export const MIN_ORG_SAMPLES = 15;

/** Minimum samples in a jurisdiction×category bucket before blending regulator signal. */
export const MIN_REGULATOR_BUCKET_SAMPLES = 8;

export type AdaptiveSignalConfidence =
  | "insufficient"
  | "low"
  | "medium"
  | "high";

/** Raw counts used to derive multipliers (no joins that duplicate alert rows). */
export interface LifecycleAggregate {
  totalAlerts: number;
  statusNew: number;
  statusTriaged: number;
  statusActioned: number;
  statusClosed: number;
  /** Distinct alerts in window with false_positive or not_relevant feedback. */
  negativeFeedbackAlerts: number;
  /** Distinct alerts in window with at least one assignment row. */
  assignedAlerts: number;
}

export interface AdaptiveSignalSlice {
  regulatorKey: string;
  jurisdictionLabel: string;
  categoryLabel: string;
  sampleSize: number;
  falsePositiveRate: number;
  engagementRate: number;
  assignmentRate: number;
  multiplier: number;
  confidence: AdaptiveSignalConfidence;
}

export interface OrgAdaptiveSignalsSnapshot {
  organizationId: string;
  windowStart: string;
  windowEnd: string;
  org: AdaptiveSignalSlice;
  /** Per target-style dimensions (jurisdiction + category), sorted by volume descending. */
  regulatorBuckets: AdaptiveSignalSlice[];
}

export interface AdaptiveImpactMultiplierResult {
  multiplier: number;
  orgMultiplier: number;
  regulatorMultiplier: number | null;
  regulatorKey: string;
  /** True when both org and bucket had insufficient data — multiplier is 1. */
  usedFallback: boolean;
}

export function regulatorKey(
  jurisdiction: string | null | undefined,
  category: string | null | undefined,
): string {
  const j = (jurisdiction ?? "").trim() || "__none__";
  const c = (category ?? "other").trim() || "other";
  return `${j}::${c}`;
}

function confidenceForSampleSize(
  n: number,
  minSamples: number,
): AdaptiveSignalConfidence {
  if (n < minSamples) return "insufficient";
  if (n < minSamples * 2) return "low";
  if (n < minSamples * 4) return "medium";
  return "high";
}

/**
 * Maps feedback + lifecycle aggregates into a bounded impact multiplier.
 * High false-positive rates dampen scores; strong triage/action outcomes nudge up slightly.
 */
export function computeAdaptiveMultiplierFromLifecycle(
  agg: LifecycleAggregate,
  minSamples: number,
): Pick<
  AdaptiveSignalSlice,
  | "multiplier"
  | "confidence"
  | "falsePositiveRate"
  | "engagementRate"
  | "assignmentRate"
  | "sampleSize"
> {
  const total = agg.totalAlerts;
  if (total < minSamples) {
    return {
      sampleSize: total,
      falsePositiveRate: 0,
      engagementRate: 0,
      assignmentRate: 0,
      multiplier: 1,
      confidence: "insufficient",
    };
  }

  const fpRate = Math.min(1, agg.negativeFeedbackAlerts / total);
  const engagementRate =
    (agg.statusActioned + agg.statusClosed + 0.5 * agg.statusTriaged) / total;
  const assignmentRate = Math.min(1, agg.assignedAlerts / total);

  let m = 1.0;
  const fpExcess = Math.max(0, fpRate - 0.1);
  m -= Math.min(0.12, fpExcess * 0.55);
  const engBonus = Math.max(0, engagementRate - 0.22);
  m += Math.min(0.08, engBonus * 0.18);
  const asgBonus = Math.max(0, assignmentRate - 0.12);
  m += Math.min(0.04, asgBonus * 0.1);

  m = Math.min(1.12, Math.max(0.88, m));

  return {
    sampleSize: total,
    falsePositiveRate: Math.round(fpRate * 1000) / 10,
    engagementRate: Math.round(engagementRate * 1000) / 10,
    assignmentRate: Math.round(assignmentRate * 1000) / 10,
    multiplier: Math.round(m * 1000) / 1000,
    confidence: confidenceForSampleSize(total, minSamples),
  };
}

export function blendOrgAndRegulatorMultipliers(params: {
  org: { multiplier: number; confidence: AdaptiveSignalConfidence };
  regulator: {
    multiplier: number;
    confidence: AdaptiveSignalConfidence;
  } | null;
}): { multiplier: number; usedFallback: boolean } {
  const { org, regulator } = params;
  const orgUsable = org.confidence !== "insufficient";
  const regUsable =
    regulator !== null && regulator.confidence !== "insufficient";

  if (!orgUsable && !regUsable) {
    return { multiplier: 1, usedFallback: true };
  }
  if (orgUsable && !regUsable) {
    return { multiplier: org.multiplier, usedFallback: false };
  }
  if (!orgUsable && regUsable && regulator) {
    return { multiplier: regulator.multiplier, usedFallback: false };
  }
  if (regulator) {
    const blended = 0.52 * regulator.multiplier + 0.48 * org.multiplier;
    const m = Math.min(1.12, Math.max(0.88, blended));
    return { multiplier: Math.round(m * 1000) / 1000, usedFallback: false };
  }
  return { multiplier: 1, usedFallback: true };
}

async function fetchOrgLifecycleAggregate(
  organizationId: string,
  windowStart: Date,
): Promise<LifecycleAggregate> {
  const [row] = await db
    .select({
      total: count(),
      statusNew: sql<number>`count(*) filter (where ${alerts.status} = 'new')`,
      statusTriaged: sql<number>`count(*) filter (where ${alerts.status} = 'triaged')`,
      statusActioned: sql<number>`count(*) filter (where ${alerts.status} = 'actioned')`,
      statusClosed: sql<number>`count(*) filter (where ${alerts.status} = 'closed')`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, windowStart),
      ),
    );

  const [fpRow] = await db
    .select({
      n: sql<number>`count(distinct ${alertFeedback.alertId})`,
    })
    .from(alertFeedback)
    .innerJoin(alerts, eq(alerts.id, alertFeedback.alertId))
    .where(
      and(
        eq(alertFeedback.organizationId, organizationId),
        sql`${alertFeedback.type} in ('false_positive', 'not_relevant')`,
        gte(alerts.createdAt, windowStart),
      ),
    );

  const [asgRow] = await db
    .select({
      n: sql<number>`count(distinct ${alerts.id})`,
    })
    .from(alertAssignments)
    .innerJoin(alerts, eq(alerts.id, alertAssignments.alertId))
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, windowStart),
      ),
    );

  return {
    totalAlerts: Number(row?.total ?? 0),
    statusNew: Number(row?.statusNew ?? 0),
    statusTriaged: Number(row?.statusTriaged ?? 0),
    statusActioned: Number(row?.statusActioned ?? 0),
    statusClosed: Number(row?.statusClosed ?? 0),
    negativeFeedbackAlerts: Number(fpRow?.n ?? 0),
    assignedAlerts: Number(asgRow?.n ?? 0),
  };
}

async function fetchBucketLifecycleMaps(
  organizationId: string,
  windowStart: Date,
): Promise<{
  aggregates: Map<string, Omit<LifecycleAggregate, "negativeFeedbackAlerts">>;
  negativeByKey: Map<string, number>;
  assignedByKey: Map<string, number>;
}> {
  const bucketRows = await db
    .select({
      jurisdiction: targets.jurisdiction,
      category: targets.category,
      total: count(),
      statusNew: sql<number>`count(*) filter (where ${alerts.status} = 'new')`,
      statusTriaged: sql<number>`count(*) filter (where ${alerts.status} = 'triaged')`,
      statusActioned: sql<number>`count(*) filter (where ${alerts.status} = 'actioned')`,
      statusClosed: sql<number>`count(*) filter (where ${alerts.status} = 'closed')`,
    })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, windowStart),
      ),
    )
    .groupBy(targets.jurisdiction, targets.category);

  const fpRows = await db
    .select({
      jurisdiction: targets.jurisdiction,
      category: targets.category,
      n: sql<number>`count(distinct ${alertFeedback.alertId})`,
    })
    .from(alertFeedback)
    .innerJoin(alerts, eq(alerts.id, alertFeedback.alertId))
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(
      and(
        eq(alertFeedback.organizationId, organizationId),
        sql`${alertFeedback.type} in ('false_positive', 'not_relevant')`,
        gte(alerts.createdAt, windowStart),
      ),
    )
    .groupBy(targets.jurisdiction, targets.category);

  const asgRows = await db
    .select({
      jurisdiction: targets.jurisdiction,
      category: targets.category,
      n: sql<number>`count(distinct ${alerts.id})`,
    })
    .from(alertAssignments)
    .innerJoin(alerts, eq(alerts.id, alertAssignments.alertId))
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, windowStart),
      ),
    )
    .groupBy(targets.jurisdiction, targets.category);

  const aggregates = new Map<
    string,
    Omit<LifecycleAggregate, "negativeFeedbackAlerts">
  >();
  for (const b of bucketRows) {
    const key = regulatorKey(b.jurisdiction, b.category);
    aggregates.set(key, {
      totalAlerts: Number(b.total),
      statusNew: Number(b.statusNew),
      statusTriaged: Number(b.statusTriaged),
      statusActioned: Number(b.statusActioned),
      statusClosed: Number(b.statusClosed),
      assignedAlerts: 0,
    });
  }

  const negativeByKey = new Map<string, number>();
  for (const r of fpRows) {
    negativeByKey.set(regulatorKey(r.jurisdiction, r.category), Number(r.n));
  }

  const assignedByKey = new Map<string, number>();
  for (const r of asgRows) {
    assignedByKey.set(regulatorKey(r.jurisdiction, r.category), Number(r.n));
  }

  return { aggregates, negativeByKey, assignedByKey };
}

export type AdaptiveBucketRow = LifecycleAggregate &
  ReturnType<typeof computeAdaptiveMultiplierFromLifecycle>;

export interface CachedAdaptiveSignalsPayload {
  windowStart: string;
  windowEnd: string;
  organizationId: string;
  org: LifecycleAggregate;
  orgComputed: ReturnType<typeof computeAdaptiveMultiplierFromLifecycle>;
  buckets: Record<string, AdaptiveBucketRow>;
}

async function loadCachedAdaptivePayload(
  organizationId: string,
): Promise<CachedAdaptiveSignalsPayload> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setUTCDate(
    windowStart.getUTCDate() - ADAPTIVE_SIGNAL_WINDOW_DAYS,
  );

  const orgAgg = await fetchOrgLifecycleAggregate(organizationId, windowStart);
  const orgComputed = computeAdaptiveMultiplierFromLifecycle(
    orgAgg,
    MIN_ORG_SAMPLES,
  );

  const { aggregates, negativeByKey, assignedByKey } =
    await fetchBucketLifecycleMaps(organizationId, windowStart);

  const buckets: Record<string, AdaptiveBucketRow> = {};

  for (const [key, partial] of aggregates) {
    const full: LifecycleAggregate = {
      ...partial,
      negativeFeedbackAlerts: negativeByKey.get(key) ?? 0,
      assignedAlerts: assignedByKey.get(key) ?? 0,
    };
    const computed = computeAdaptiveMultiplierFromLifecycle(
      full,
      MIN_REGULATOR_BUCKET_SAMPLES,
    );
    buckets[key] = { ...full, ...computed } satisfies AdaptiveBucketRow;
  }

  return {
    organizationId,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    org: orgAgg,
    orgComputed,
    buckets,
  };
}

/**
 * Cached org-wide + per–jurisdiction/category aggregates for adaptive impact scoring.
 */
export async function getCachedAdaptiveSignals(
  organizationId: string,
): Promise<CachedAdaptiveSignalsPayload> {
  return withCache(
    CACHE_KEYS.adaptiveFeedbackSignals(organizationId),
    CACHE_TTL.adaptiveFeedbackSignals,
    () => loadCachedAdaptivePayload(organizationId),
  );
}

/**
 * Impact multiplier for a new alert from feedback + lifecycle (org + regulator bucket blend).
 */
export async function getAdaptiveImpactMultiplierForTarget(params: {
  organizationId: string;
  jurisdiction?: string | null;
  category?: TargetCategory | string | null;
}): Promise<AdaptiveImpactMultiplierResult> {
  const { organizationId, jurisdiction, category } = params;
  const key = regulatorKey(jurisdiction, category);

  const payload = await getCachedAdaptiveSignals(organizationId);
  const orgSlice = payload.orgComputed;

  const bucket = payload.buckets[key];
  const regulatorComputed = bucket
    ? {
        multiplier: bucket.multiplier,
        confidence: bucket.confidence,
      }
    : null;

  const { multiplier, usedFallback } = blendOrgAndRegulatorMultipliers({
    org: {
      multiplier: orgSlice.multiplier,
      confidence: orgSlice.confidence,
    },
    regulator: regulatorComputed,
  });

  return {
    multiplier,
    orgMultiplier: orgSlice.multiplier,
    regulatorMultiplier: regulatorComputed?.multiplier ?? null,
    regulatorKey: key,
    usedFallback,
  };
}

function lifecycleToSlice(
  key: string,
  jurisdiction: string | null,
  category: string | null,
  computed: ReturnType<typeof computeAdaptiveMultiplierFromLifecycle>,
): AdaptiveSignalSlice {
  return {
    regulatorKey: key,
    jurisdictionLabel: jurisdiction?.trim() || "Unspecified",
    categoryLabel: category?.trim() || "other",
    sampleSize: computed.sampleSize,
    falsePositiveRate: computed.falsePositiveRate,
    engagementRate: computed.engagementRate,
    assignmentRate: computed.assignmentRate,
    multiplier: computed.multiplier,
    confidence: computed.confidence,
  };
}

/**
 * Org-facing snapshot for analytics (explains how alert scores are nudged).
 */
export async function getOrgAdaptiveSignalsSnapshot(
  organizationId: string,
): Promise<OrgAdaptiveSignalsSnapshot> {
  const payload = await getCachedAdaptiveSignals(organizationId);

  const orgSlice: AdaptiveSignalSlice = {
    regulatorKey: "__organization__",
    jurisdictionLabel: "Organization-wide",
    categoryLabel: "All targets",
    sampleSize: payload.orgComputed.sampleSize,
    falsePositiveRate: payload.orgComputed.falsePositiveRate,
    engagementRate: payload.orgComputed.engagementRate,
    assignmentRate: payload.orgComputed.assignmentRate,
    multiplier: payload.orgComputed.multiplier,
    confidence: payload.orgComputed.confidence,
  };

  const regulatorBuckets: AdaptiveSignalSlice[] = Object.entries(
    payload.buckets,
  )
    .map(([key, row]) => {
      const sep = key.indexOf("::");
      const jPart = sep === -1 ? "__none__" : key.slice(0, sep);
      const cPart = sep === -1 ? "other" : key.slice(sep + 2);
      const jurisdiction = jPart === "__none__" ? null : jPart;
      const category = cPart || "other";
      const computed = {
        sampleSize: row.sampleSize,
        falsePositiveRate: row.falsePositiveRate,
        engagementRate: row.engagementRate,
        assignmentRate: row.assignmentRate,
        multiplier: row.multiplier,
        confidence: row.confidence,
      };
      return lifecycleToSlice(key, jurisdiction, category, computed);
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);

  return {
    organizationId,
    windowStart: payload.windowStart,
    windowEnd: payload.windowEnd,
    org: orgSlice,
    regulatorBuckets,
  };
}
