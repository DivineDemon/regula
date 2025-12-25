import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, targets } from "@/lib/db/schema";
import { CACHE_KEYS, CACHE_TTL, withCache } from "./cache-helpers";

export interface ComplianceHealthScore {
  overallScore: number; // 0-100
  breakdown: {
    alertResponseTime: number; // 0-100
    alertResolutionRate: number; // 0-100
    targetCoverage: number; // 0-100
    highImpactAlerts: number; // 0-100
  };
  metrics: {
    totalAlerts: number;
    unresolvedAlerts: number;
    avgResponseTime: number; // in hours
    resolutionRate: number; // percentage
    activeTargets: number;
    highImpactUnresolved: number;
  };
}

/**
 * Calculate compliance health score for an organization
 * @param organizationId - Organization ID
 * @param startDate - Optional start date for filtering data (defaults to all time)
 * @param endDate - Optional end date for filtering data (defaults to now)
 */
export async function calculateComplianceHealthScore(
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<ComplianceHealthScore> {
  const cacheKey =
    startDate || endDate
      ? `${CACHE_KEYS.complianceHealth(organizationId)}:${startDate?.getTime()}:${endDate?.getTime()}`
      : CACHE_KEYS.complianceHealth(organizationId);

  return withCache(cacheKey, CACHE_TTL.complianceHealth, async () => {
    // Build date filter conditions
    const dateConditions = [];
    if (startDate) {
      dateConditions.push(gte(alerts.createdAt, startDate));
    }
    if (endDate) {
      dateConditions.push(lte(alerts.createdAt, endDate));
    }

    // Get alert statistics
    const [alertStats] = await db
      .select({
        total: count(),
        unresolved: sql<number>`count(*) filter (where ${alerts.status} in ('new', 'triaged'))`,
        highImpactUnresolved: sql<number>`count(*) filter (where ${alerts.status} in ('new', 'triaged') and ${alerts.impactScore} >= 0.7)`,
        resolved: sql<number>`count(*) filter (where ${alerts.status} in ('actioned', 'closed'))`,
        avgAge: sql<number>`avg(extract(epoch from (now() - ${alerts.createdAt})) / 3600) filter (where ${alerts.status} in ('new', 'triaged'))`,
      })
      .from(alerts)
      .where(
        dateConditions.length > 0
          ? and(eq(alerts.organizationId, organizationId), ...dateConditions)
          : eq(alerts.organizationId, organizationId),
      );

    // Get target statistics
    const [targetStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${targets.status} = 'active')`,
      })
      .from(targets)
      .where(eq(targets.organizationId, organizationId));

    const totalAlerts = Number(alertStats.total);
    const unresolvedAlerts = Number(alertStats.unresolved);
    const resolvedAlerts = Number(alertStats.resolved);
    const highImpactUnresolved = Number(alertStats.highImpactUnresolved);
    const avgResponseTime = alertStats.avgAge ? Number(alertStats.avgAge) : 0;
    const activeTargets = Number(targetStats.active);
    const totalTargets = Number(targetStats.total);

    // Calculate scores (0-100 scale)
    // 1. Alert Response Time Score (lower is better, max 48 hours = 0, 0 hours = 100)
    const alertResponseTimeScore = Math.max(
      0,
      Math.min(100, 100 - (avgResponseTime / 48) * 100),
    );

    // 2. Alert Resolution Rate (percentage of resolved alerts)
    const resolutionRate =
      totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 100;
    const alertResolutionRateScore = resolutionRate;

    // 3. Target Coverage (percentage of active targets)
    const targetCoverage =
      totalTargets > 0 ? (activeTargets / totalTargets) * 100 : 100;
    const targetCoverageScore = targetCoverage;

    // 4. High Impact Alerts (penalty for unresolved high-impact alerts)
    // Score decreases as high-impact unresolved alerts increase
    const highImpactScore = Math.max(
      0,
      100 - highImpactUnresolved * 10, // -10 points per high-impact unresolved alert
    );

    // Overall score is weighted average
    const overallScore =
      alertResponseTimeScore * 0.3 +
      alertResolutionRateScore * 0.3 +
      targetCoverageScore * 0.2 +
      highImpactScore * 0.2;

    return {
      overallScore: Math.round(overallScore),
      breakdown: {
        alertResponseTime: Math.round(alertResponseTimeScore),
        alertResolutionRate: Math.round(alertResolutionRateScore),
        targetCoverage: Math.round(targetCoverageScore),
        highImpactAlerts: Math.round(highImpactScore),
      },
      metrics: {
        totalAlerts,
        unresolvedAlerts,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        activeTargets,
        highImpactUnresolved,
      },
    };
  });
}

/**
 * Get compliance health score with trend (comparing to previous period)
 */
export async function getComplianceHealthScoreWithTrend(
  organizationId: string,
  days: number = 30,
) {
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - days);
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - days);

  // Calculate current period score (last N days)
  const currentScore = await calculateComplianceHealthScore(
    organizationId,
    currentPeriodStart,
    now,
  );

  // Calculate previous period score (N days before that)
  const previousScore = await calculateComplianceHealthScore(
    organizationId,
    previousPeriodStart,
    currentPeriodStart,
  );

  const trend = currentScore.overallScore - previousScore.overallScore;

  return {
    ...currentScore,
    trend: trend > 0 ? "improving" : trend < 0 ? "declining" : "stable",
    trendValue: trend,
  };
}
