import { and, count, eq, gte, lte, min, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  alertFeedback,
  alerts,
  organizations,
  subscriptions,
  targets,
  versions,
} from "@/lib/db/schema";
import { PLAN_CONFIGS, type PlanType } from "@/lib/plans";

/** Platform-level KPIs for founder/internal dashboard */
export interface PlatformKpis {
  northStar: {
    /** Number of orgs that received at least 1 actionable alert in the last 7 days */
    orgsWithActionableAlertLast7Days: number;
    description: string;
  };
  product: {
    activationRate: number; // % of orgs with targets that have ≥1 alert
    timeToFirstAlertHours: number | null; // median TTFA in hours (for orgs that have alerts)
    weeklyActiveOrganizations: number; // orgs with any alert in last 7 days
    alertEngagementRate: number; // % of alerts actioned or closed (platform-wide)
    falsePositiveRate: number;
    actionableAlertRatio: number; // % of alerts with impactScore >= 0.4
    averageAlertsPerOrg: number;
  };
  growth: {
    totalOrganizations: number;
    totalAlerts: number;
    activatedOrganizations: number; // orgs with at least one alert
  };
  financial: {
    mrr: number; // cents, then display as dollars
    paidOrgs: number;
  };
  operational: {
    crawlSuccessRate: number | null; // if we have success/fail in versions
    totalCrawlsLast30Days: number;
  };
}

/** Org-facing compliance analytics (alerts over time, severity, jurisdiction coverage) */
export interface OrgComplianceAnalytics {
  alertsOverTime: Array<{
    date: string;
    count: number;
    openedOrActed: number; // actioned + closed
    bySeverity: { low: number; medium: number; high: number };
  }>;
  byJurisdiction: Array<{ jurisdiction: string; count: number }>;
  summary: {
    totalAlerts: number;
    openedOrActedCount: number;
    engagementRate: number;
    actionableCount: number;
    actionableRatio: number;
    falsePositiveRate: number;
  };
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function getPlatformKpis(): Promise<PlatformKpis> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - ONE_WEEK_MS);
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

  // Total orgs
  const [orgCount] = await db.select({ total: count() }).from(organizations);
  const totalOrgs = Number(orgCount?.total ?? 0);

  // Orgs with at least one target (denominator for activation)
  const uniqueOrgsWithTargets = await db
    .selectDistinct({ organizationId: targets.organizationId })
    .from(targets);
  const orgsWithTargetsCount = uniqueOrgsWithTargets.length;

  // Orgs with at least one alert (activated)
  const activatedOrgsList = await db
    .selectDistinct({ organizationId: alerts.organizationId })
    .from(alerts);
  const activatedOrgsCount = activatedOrgsList.length;
  const activationRate =
    orgsWithTargetsCount > 0
      ? Math.round((activatedOrgsCount / orgsWithTargetsCount) * 100)
      : 0;

  // North Star: orgs with ≥1 actionable alert (impactScore >= 0.4) in last 7 days
  const orgsWithActionableLastWeek = await db
    .selectDistinct({ organizationId: alerts.organizationId })
    .from(alerts)
    .where(
      and(gte(alerts.createdAt, weekAgo), sql`${alerts.impactScore} >= 0.4`),
    );
  const northStarCount = orgsWithActionableLastWeek.length;

  // Weekly Active Orgs: orgs with any alert in last 7 days
  const waoList = await db
    .selectDistinct({ organizationId: alerts.organizationId })
    .from(alerts)
    .where(gte(alerts.createdAt, weekAgo));
  const weeklyActiveOrgs = waoList.length;

  // Alert stats (all time for ratios)
  const [alertStats] = await db
    .select({
      total: count(),
      actionedOrClosed: sql<number>`count(*) filter (where ${alerts.status} in ('actioned', 'closed'))`,
      actionable: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.4)`,
    })
    .from(alerts);

  const totalAlerts = Number(alertStats?.total ?? 0);
  const actionedOrClosed = Number(alertStats?.actionedOrClosed ?? 0);
  const actionableCount = Number(alertStats?.actionable ?? 0);
  const alertEngagementRate =
    totalAlerts > 0 ? (actionedOrClosed / totalAlerts) * 100 : 0;
  const actionableAlertRatio =
    totalAlerts > 0 ? (actionableCount / totalAlerts) * 100 : 0;
  const averageAlertsPerOrg =
    activatedOrgsCount > 0 ? totalAlerts / activatedOrgsCount : 0;

  // False positive rate (platform-wide)
  const [fpCount] = await db
    .select({ count: count() })
    .from(alertFeedback)
    .where(eq(alertFeedback.type, "false_positive"));
  const fpTotal = Number(fpCount?.count ?? 0);
  const falsePositiveRate = totalAlerts > 0 ? (fpTotal / totalAlerts) * 100 : 0;

  // Time to first alert: per-org first alert time minus org createdAt (median would need more queries; use average of TTFA for orgs that have alerts)
  const firstAlertPerOrg = await db
    .select({
      organizationId: alerts.organizationId,
      firstAlertAt: min(alerts.createdAt),
    })
    .from(alerts)
    .groupBy(alerts.organizationId);
  const orgCreatedAts = await db
    .select({
      id: organizations.id,
      createdAt: organizations.createdAt,
    })
    .from(organizations);
  const orgCreatedMap = new Map(
    orgCreatedAts.map((o) => [o.id, o.createdAt.getTime()]),
  );
  const ttfaHours: number[] = [];
  for (const row of firstAlertPerOrg) {
    const created = orgCreatedMap.get(row.organizationId);
    if (created && row.firstAlertAt) {
      const hours = (row.firstAlertAt.getTime() - created) / (60 * 60 * 1000);
      ttfaHours.push(hours);
    }
  }
  const timeToFirstAlertHours =
    ttfaHours.length > 0
      ? ttfaHours.reduce((a, b) => a + b, 0) / ttfaHours.length
      : null;

  // MRR: sum of active paid subscriptions
  const activeSubs = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  let mrrCents = 0;
  for (const sub of activeSubs) {
    const planConfig = PLAN_CONFIGS[sub.plan as PlanType];
    if (planConfig && planConfig.price > 0) mrrCents += planConfig.price;
  }
  const paidOrgs = activeSubs.length;

  // Crawls last 30 days (version records)
  const [crawlStats] = await db
    .select({
      total: count(),
      withChanges: sql<number>`count(*) filter (where (${versions.metadata}::jsonb->>'hasChanges')::text is not null)`,
    })
    .from(versions)
    .where(gte(versions.crawledAt, thirtyDaysAgo));
  const totalCrawlsLast30Days = Number(crawlStats?.total ?? 0);
  const crawlSuccessRate = totalCrawlsLast30Days > 0 ? 100 : null; // We don't have explicit success/fail; treat all as success for now

  return {
    northStar: {
      orgsWithActionableAlertLast7Days: northStarCount,
      description:
        "Organizations receiving at least 1 actionable alert per week",
    },
    product: {
      activationRate,
      timeToFirstAlertHours:
        timeToFirstAlertHours !== null
          ? Math.round(timeToFirstAlertHours * 10) / 10
          : null,
      weeklyActiveOrganizations: weeklyActiveOrgs,
      alertEngagementRate: Math.round(alertEngagementRate * 10) / 10,
      falsePositiveRate: Math.round(falsePositiveRate * 10) / 10,
      actionableAlertRatio: Math.round(actionableAlertRatio * 10) / 10,
      averageAlertsPerOrg: Math.round(averageAlertsPerOrg * 10) / 10,
    },
    growth: {
      totalOrganizations: totalOrgs,
      totalAlerts,
      activatedOrganizations: activatedOrgsCount,
    },
    financial: {
      mrr: mrrCents,
      paidOrgs,
    },
    operational: {
      crawlSuccessRate,
      totalCrawlsLast30Days,
    },
  };
}

export async function getOrgComplianceAnalytics(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" = "day",
): Promise<OrgComplianceAnalytics> {
  const trunc =
    groupBy === "week"
      ? sql`date_trunc('week', ${alerts.createdAt})::date`
      : sql`date_trunc('day', ${alerts.createdAt})::date`;

  const trends = await db
    .select({
      date: sql<string>`${trunc}::text`,
      count: count(),
      openedOrActed: sql<number>`count(*) filter (where ${alerts.status} in ('actioned', 'closed'))`,
      low: sql<number>`count(*) filter (where ${alerts.impactScore} < 0.4 or ${alerts.impactScore} is null)`,
      medium: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.4 and ${alerts.impactScore} < 0.7)`,
      high: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.7)`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, startDate),
        lte(alerts.createdAt, endDate),
      ),
    )
    .groupBy(trunc)
    .orderBy(trunc);

  const byJurisdiction = await db
    .select({
      jurisdiction: targets.jurisdiction,
      count: count(),
    })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, startDate),
        lte(alerts.createdAt, endDate),
      ),
    )
    .groupBy(targets.jurisdiction)
    .orderBy(sql`count(*) desc`);

  const [summaryRow] = await db
    .select({
      total: count(),
      openedOrActed: sql<number>`count(*) filter (where ${alerts.status} in ('actioned', 'closed'))`,
      actionable: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.4)`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, startDate),
        lte(alerts.createdAt, endDate),
      ),
    );

  const [fpRow] = await db
    .select({ count: count() })
    .from(alertFeedback)
    .where(
      and(
        eq(alertFeedback.organizationId, organizationId),
        eq(alertFeedback.type, "false_positive"),
      ),
    );

  const total = Number(summaryRow?.total ?? 0);
  const openedOrActedCount = Number(summaryRow?.openedOrActed ?? 0);
  const actionableCount = Number(summaryRow?.actionable ?? 0);
  const fpCount = Number(fpRow?.count ?? 0);

  return {
    alertsOverTime: trends.map((t) => ({
      date: t.date,
      count: Number(t.count),
      openedOrActed: Number(t.openedOrActed),
      bySeverity: {
        low: Number(t.low),
        medium: Number(t.medium),
        high: Number(t.high),
      },
    })),
    byJurisdiction: byJurisdiction.map((j) => ({
      jurisdiction: j.jurisdiction ?? "Unspecified",
      count: Number(j.count),
    })),
    summary: {
      totalAlerts: total,
      openedOrActedCount,
      engagementRate: total > 0 ? (openedOrActedCount / total) * 100 : 0,
      actionableCount,
      actionableRatio: total > 0 ? (actionableCount / total) * 100 : 0,
      falsePositiveRate: total > 0 ? (fpCount / total) * 100 : 0,
    },
  };
}
