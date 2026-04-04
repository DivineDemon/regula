import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  alertFeedback,
  alerts,
  auditLogs,
  targets,
  usageMetrics,
  versions,
} from "@/lib/db/schema";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import { CACHE_KEYS, CACHE_TTL, withCache } from "./cache-helpers";

export interface AlertTrendsParams {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  groupBy?: "day" | "week" | "month";
}

export interface AlertTrendsResult {
  date: string;
  count: number;
  statusBreakdown: Record<AlertStatus, number>;
  severityBreakdown: {
    low: number;
    medium: number;
    high: number;
  };
}

/**
 * Get alert trends over time
 */
export async function getAlertTrends(
  params: AlertTrendsParams,
): Promise<AlertTrendsResult[]> {
  const { organizationId, startDate, endDate, groupBy = "day" } = params;

  // Determine date truncation based on groupBy
  let dateTruncExpr: ReturnType<typeof sql>;
  switch (groupBy) {
    case "week":
      dateTruncExpr = sql`date_trunc('week', ${alerts.createdAt})`;
      break;
    case "month":
      dateTruncExpr = sql`date_trunc('month', ${alerts.createdAt})`;
      break;
    default:
      dateTruncExpr = sql`date_trunc('day', ${alerts.createdAt})`;
  }

  const results = await db
    .select({
      date: sql<string>`${dateTruncExpr}::text`,
      count: count(),
      statusNew: sql<number>`count(*) filter (where ${alerts.status} = 'new')`,
      statusTriaged: sql<number>`count(*) filter (where ${alerts.status} = 'triaged')`,
      statusActioned: sql<number>`count(*) filter (where ${alerts.status} = 'actioned')`,
      statusClosed: sql<number>`count(*) filter (where ${alerts.status} = 'closed')`,
      severityLow: sql<number>`count(*) filter (where ${alerts.impactScore} < 0.4)`,
      severityMedium: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.4 and ${alerts.impactScore} < 0.7)`,
      severityHigh: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.7)`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, startDate),
        lte(alerts.createdAt, endDate),
      ),
    )
    .groupBy(dateTruncExpr)
    .orderBy(dateTruncExpr);

  return results.map((r) => ({
    date: r.date,
    count: Number(r.count),
    statusBreakdown: {
      new: Number(r.statusNew),
      triaged: Number(r.statusTriaged),
      actioned: Number(r.statusActioned),
      closed: Number(r.statusClosed),
    },
    severityBreakdown: {
      low: Number(r.severityLow),
      medium: Number(r.severityMedium),
      high: Number(r.severityHigh),
    },
  }));
}

/**
 * Get alert statistics summary
 */
export async function getAlertStatistics(organizationId: string) {
  return withCache(
    CACHE_KEYS.alertStatistics(organizationId),
    CACHE_TTL.alertStatistics,
    async () => {
      const [stats] = await db
        .select({
          total: count(),
          new: sql<number>`count(*) filter (where ${alerts.status} = 'new')`,
          triaged: sql<number>`count(*) filter (where ${alerts.status} = 'triaged')`,
          actioned: sql<number>`count(*) filter (where ${alerts.status} = 'actioned')`,
          closed: sql<number>`count(*) filter (where ${alerts.status} = 'closed')`,
          avgImpactScore: sql<number>`avg(${alerts.impactScore})`,
          highImpact: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.7)`,
        })
        .from(alerts)
        .where(eq(alerts.organizationId, organizationId));

      const total = Number(stats.total);

      // False positive count (distinct alerts marked as false positive)
      const [fpStats] = await db
        .select({
          falsePositiveCount: count(),
        })
        .from(alertFeedback)
        .where(
          and(
            eq(alertFeedback.organizationId, organizationId),
            eq(alertFeedback.type, "false_positive"),
          ),
        );

      const falsePositiveCount = Number(fpStats?.falsePositiveCount ?? 0);
      const falsePositiveRate = total > 0 ? falsePositiveCount / total : 0;

      return {
        total,
        byStatus: {
          new: Number(stats.new),
          triaged: Number(stats.triaged),
          actioned: Number(stats.actioned),
          closed: Number(stats.closed),
        },
        avgImpactScore: stats.avgImpactScore ? Number(stats.avgImpactScore) : 0,
        highImpactCount: Number(stats.highImpact),
        falsePositiveCount,
        falsePositiveRate,
      };
    },
  );
}

/**
 * Get target statistics
 */
export async function getTargetStatistics(organizationId: string) {
  const [stats] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${targets.status} = 'active')`,
      pending: sql<number>`count(*) filter (where ${targets.status} = 'pending')`,
      error: sql<number>`count(*) filter (where ${targets.status} = 'error')`,
    })
    .from(targets)
    .where(eq(targets.organizationId, organizationId));

  return {
    total: Number(stats.total),
    active: Number(stats.active),
    pending: Number(stats.pending),
    error: Number(stats.error),
  };
}

/**
 * Get crawl statistics
 */
export async function getCrawlStatistics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const conditions = [
    eq(versions.targetId, targets.id),
    eq(targets.organizationId, organizationId),
  ];

  if (startDate) {
    conditions.push(gte(versions.crawledAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(versions.crawledAt, endDate));
  }

  const [stats] = await db
    .select({
      total: count(),
      withChanges: sql<number>`count(*) filter (where ${versions.metadata}::jsonb->>'hasChanges' = 'true')`,
      withoutChanges: sql<number>`count(*) filter (where ${versions.metadata}::jsonb->>'hasChanges' = 'false')`,
    })
    .from(versions)
    .innerJoin(targets, eq(versions.targetId, targets.id))
    .where(and(...conditions));

  return {
    total: Number(stats.total),
    withChanges: Number(stats.withChanges),
    withoutChanges: Number(stats.withoutChanges),
  };
}

/**
 * Get usage analytics
 */
export async function getUsageAnalytics(
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const conditions = [eq(usageMetrics.organizationId, organizationId)];

  if (startDate) {
    conditions.push(gte(usageMetrics.recordedAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(usageMetrics.recordedAt, endDate));
  }

  const metrics = await db
    .select()
    .from(usageMetrics)
    .where(and(...conditions))
    .orderBy(desc(usageMetrics.recordedAt));

  // Group by metric type
  const grouped = metrics.reduce(
    (acc, metric) => {
      const type = metric.metricType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        value: metric.value,
        period: metric.period,
        recordedAt: metric.recordedAt,
      });
      return acc;
    },
    {} as Record<
      string,
      Array<{ value: number; period: string; recordedAt: Date }>
    >,
  );

  return grouped;
}

/** Median minutes from alert creation to first non-`new` status change (audit-backed). */
export interface TimeToFirstActionResult {
  medianMinutes: number | null;
  sampleSize: number;
}

export async function getMedianTimeToFirstAction(params: {
  organizationId?: string;
  startDate: Date;
  endDate: Date;
}): Promise<TimeToFirstActionResult> {
  const { organizationId, startDate, endDate } = params;
  const startDateIso = startDate.toISOString();
  const endDateIso = endDate.toISOString();

  const orgClause =
    organizationId === undefined
      ? sql`true`
      : sql`a."organizationId" = ${organizationId}`;

  const rows = await db.execute(sql`
    WITH first_action AS (
      SELECT
        (metadata::jsonb->>'alertId') AS "alertId",
        MIN("createdAt") AS "firstAt"
      FROM "audit_logs"
      WHERE action = 'alert.status_changed'
        AND (metadata::jsonb->>'alertId') IS NOT NULL
        AND COALESCE(metadata::jsonb->>'newValue', '') <> 'new'
      GROUP BY 1
    )
    SELECT
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY GREATEST(
          0,
          EXTRACT(EPOCH FROM (fa."firstAt" - a."createdAt")) / 60.0
        )
      ) AS "medianMinutes",
      COUNT(*)::int AS "sampleSize"
    FROM first_action fa
    INNER JOIN "alerts" a ON a.id = fa."alertId"
    WHERE ${orgClause}
      AND a."createdAt" >= ${startDateIso}::timestamptz
      AND a."createdAt" <= ${endDateIso}::timestamptz
      AND fa."firstAt" >= a."createdAt"
  `);

  const row = rows[0] as
    | { medianMinutes: string | number | null; sampleSize: number }
    | undefined;
  const sampleSize = Number(row?.sampleSize ?? 0);
  const raw = row?.medianMinutes;
  const medianMinutes = raw != null && sampleSize > 0 ? Number(raw) : null;

  return {
    medianMinutes:
      medianMinutes != null && !Number.isNaN(medianMinutes)
        ? Math.round(medianMinutes * 10) / 10
        : null,
    sampleSize,
  };
}

/** Crawl outcome mix from targets (last job status), scoped to one org. */
export interface OrgSourceReliability {
  activeTargets: number;
  targetsWithLastCrawl: number;
  lastCrawlCompleted: number;
  lastCrawlFailed: number;
  /** Share of targets with a recorded last crawl where status is `completed`. */
  lastCrawlSuccessPercent: number | null;
  /** Median hours since `lastCrawlAt` among active targets that have been crawled. */
  medianFreshnessHours: number | null;
}

export async function getOrgSourceReliability(
  organizationId: string,
): Promise<OrgSourceReliability> {
  const [stats] = await db
    .select({
      activeTargets: sql<number>`count(*) filter (where ${targets.status} = 'active')`,
      targetsWithLastCrawl: sql<number>`count(*) filter (where ${targets.lastCrawlAt} is not null and ${targets.status} = 'active')`,
      lastCrawlCompleted: sql<number>`count(*) filter (where ${targets.lastCrawlStatus} = 'completed' and ${targets.status} = 'active')`,
      lastCrawlFailed: sql<number>`count(*) filter (where ${targets.lastCrawlStatus} = 'failed' and ${targets.status} = 'active')`,
    })
    .from(targets)
    .where(eq(targets.organizationId, organizationId));

  const withCrawl = Number(stats?.targetsWithLastCrawl ?? 0);
  const completed = Number(stats?.lastCrawlCompleted ?? 0);
  const failed = Number(stats?.lastCrawlFailed ?? 0);
  const denom = completed + failed;
  const lastCrawlSuccessPercent =
    denom > 0 ? Math.round((completed / denom) * 1000) / 10 : null;

  const [freshRow] = await db.execute(sql`
    SELECT
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (NOW() - "lastCrawlAt")) / 3600.0
      ) AS "medianHours"
    FROM "targets"
    WHERE "organizationId" = ${organizationId}
      AND "status" = 'active'
      AND "lastCrawlAt" IS NOT NULL
  `);
  const fr = freshRow as { medianHours: string | number | null } | undefined;
  const mh = fr?.medianHours != null ? Number(fr.medianHours) : null;

  return {
    activeTargets: Number(stats?.activeTargets ?? 0),
    targetsWithLastCrawl: withCrawl,
    lastCrawlCompleted: completed,
    lastCrawlFailed: failed,
    lastCrawlSuccessPercent,
    medianFreshnessHours:
      mh != null && !Number.isNaN(mh) ? Math.round(mh * 10) / 10 : null,
  };
}

/** Platform crawl audit outcomes (when instrumentation writes these actions). */
export async function getCrawlAuditReliability(since: Date): Promise<{
  completed: number;
  failed: number;
  successPercent: number | null;
}> {
  const [row] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${auditLogs.action} = 'system.crawl_completed')`,
      failed: sql<number>`count(*) filter (where ${auditLogs.action} = 'system.crawl_failed')`,
    })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, since));

  const completed = Number(row?.completed ?? 0);
  const failed = Number(row?.failed ?? 0);
  const total = completed + failed;
  return {
    completed,
    failed,
    successPercent:
      total > 0 ? Math.round((completed / total) * 1000) / 10 : null,
  };
}
