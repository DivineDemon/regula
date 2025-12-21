import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, targets, usageMetrics } from "@/lib/db/schema";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import type { TargetStatus } from "@/lib/db/schema/targets";

/**
 * Get dashboard metrics for an organization
 */
export async function getDashboardMetrics(organizationId: string) {
  // Get active alerts count (status = 'new' or 'triaged')
  const [activeAlertsResult] = await db
    .select({ count: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        sql`${alerts.status} IN ('new', 'triaged')`,
      ),
    );

  const activeAlertsCount = Number(activeAlertsResult?.count ?? 0);

  // Get total alerts count
  const [totalAlertsResult] = await db
    .select({ count: count() })
    .from(alerts)
    .where(eq(alerts.organizationId, organizationId));

  const totalAlertsCount = Number(totalAlertsResult?.count ?? 0);

  // Get alerts by status
  const alertsByStatus = await db
    .select({
      status: alerts.status,
      count: count(),
    })
    .from(alerts)
    .where(eq(alerts.organizationId, organizationId))
    .groupBy(alerts.status);

  const statusCounts: Record<AlertStatus, number> = {
    new: 0,
    triaged: 0,
    actioned: 0,
    closed: 0,
  };

  for (const row of alertsByStatus) {
    statusCounts[row.status as AlertStatus] = Number(row.count);
  }

  // Get alerts by severity (impact score ranges)
  const severityCase = sql<string>`CASE
    WHEN ${alerts.impactScore} >= 0.7 THEN 'high'
    WHEN ${alerts.impactScore} >= 0.4 THEN 'medium'
    WHEN ${alerts.impactScore} IS NOT NULL THEN 'low'
    ELSE 'unknown'
  END`;

  const alertsBySeverity = await db
    .select({
      severity: severityCase,
      count: count(),
    })
    .from(alerts)
    .where(eq(alerts.organizationId, organizationId))
    .groupBy(severityCase);

  const severityCounts: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };

  for (const row of alertsBySeverity) {
    severityCounts[row.severity] = Number(row.count);
  }

  // Get recent alerts (last 10)
  const recentAlerts = await db
    .select({
      alert: alerts,
      target: targets,
    })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(eq(alerts.organizationId, organizationId))
    .orderBy(desc(alerts.createdAt))
    .limit(10);

  // Get target status counts
  const targetsByStatus = await db
    .select({
      status: targets.status,
      count: count(),
    })
    .from(targets)
    .where(eq(targets.organizationId, organizationId))
    .groupBy(targets.status);

  const targetStatusCounts: Record<TargetStatus, number> = {
    active: 0,
    pending: 0,
    running: 0,
    error: 0,
    paused: 0,
  };

  for (const row of targetsByStatus) {
    targetStatusCounts[row.status as TargetStatus] = Number(row.count);
  }

  const totalTargets = Object.values(targetStatusCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Get alerts over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const alertsOverTime = await db
    .select({
      date: sql<string>`DATE(${alerts.createdAt})`,
      count: count(),
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(sql`DATE(${alerts.createdAt})`)
    .orderBy(sql`DATE(${alerts.createdAt})`);

  // Get usage metrics (if available)
  const usageStats = await db
    .select()
    .from(usageMetrics)
    .where(eq(usageMetrics.organizationId, organizationId))
    .orderBy(desc(usageMetrics.recordedAt))
    .limit(10);

  // Aggregate usage by type
  const usageByType: Record<string, number> = {};
  for (const metric of usageStats) {
    const current = usageByType[metric.metricType] || 0;
    usageByType[metric.metricType] = current + metric.value;
  }

  return {
    alerts: {
      active: activeAlertsCount,
      total: totalAlertsCount,
      byStatus: statusCounts,
      bySeverity: severityCounts,
      recent: recentAlerts.map((r) => ({
        id: r.alert.id,
        summary: r.alert.summary,
        impactScore: r.alert.impactScore,
        status: r.alert.status,
        createdAt: r.alert.createdAt,
        target: {
          id: r.target.id,
          label: r.target.label,
          jurisdiction: r.target.jurisdiction,
        },
      })),
      overTime: alertsOverTime.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
    },
    targets: {
      total: totalTargets,
      byStatus: targetStatusCounts,
    },
    usage: usageByType,
  };
}
