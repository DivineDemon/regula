import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, targets, usageMetrics, versions } from "@/lib/db/schema";
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

      return {
        total: Number(stats.total),
        byStatus: {
          new: Number(stats.new),
          triaged: Number(stats.triaged),
          actioned: Number(stats.actioned),
          closed: Number(stats.closed),
        },
        avgImpactScore: stats.avgImpactScore ? Number(stats.avgImpactScore) : 0,
        highImpactCount: Number(stats.highImpact),
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
