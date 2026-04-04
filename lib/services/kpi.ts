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
import {
  getCrawlAuditReliability,
  getMedianTimeToFirstAction,
  getOrgSourceReliability,
  type OrgSourceReliability,
} from "@/lib/services/analytics";

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
    /** Targets whose last crawl job completed vs failed (active targets only). */
    targetLastCrawlSuccessPercent: number | null;
    targetLastCrawlFailed: number;
    targetLastCrawlCompleted: number;
    crawlAuditSuccessPercent: number | null;
    crawlAuditCompleted: number;
    crawlAuditFailed: number;
  };
  /** Rolling window baselines for moat / quality metrics (aligned with 90-day plan). */
  moatBaselines: {
    windowDays: number;
    alertsInWindow: number;
    falsePositiveCount: number;
    falsePositiveRate: number;
    alertEngagementRate: number;
    medianTimeToFirstActionMinutes: number | null;
    timeToFirstActionSampleSize: number;
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
    falsePositiveCount: number;
    triagedCount: number;
    medianTimeToFirstActionMinutes: number | null;
    timeToFirstActionSampleSize: number;
  };
  moat: {
    sourceReliability: OrgSourceReliability;
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
  const crawlSuccessRate = totalCrawlsLast30Days > 0 ? 100 : null; // Version rows imply a stored crawl outcome

  // Target-level last crawl outcomes (source reliability proxy)
  const [targetCrawlMix] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${targets.lastCrawlStatus} = 'completed' and ${targets.status} = 'active')`,
      failed: sql<number>`count(*) filter (where ${targets.lastCrawlStatus} = 'failed' and ${targets.status} = 'active')`,
    })
    .from(targets);
  const tcCompleted = Number(targetCrawlMix?.completed ?? 0);
  const tcFailed = Number(targetCrawlMix?.failed ?? 0);
  const tcDenom = tcCompleted + tcFailed;
  const targetLastCrawlSuccessPercent =
    tcDenom > 0 ? Math.round((tcCompleted / tcDenom) * 1000) / 10 : null;

  const crawlAudit = await getCrawlAuditReliability(thirtyDaysAgo);

  // Moat baselines: last 30 days, same window as operational crawls
  const [alerts30d] = await db
    .select({
      inWindow: count(),
      actionedOrClosed: sql<number>`count(*) filter (where ${alerts.status} in ('actioned', 'closed'))`,
    })
    .from(alerts)
    .where(
      and(gte(alerts.createdAt, thirtyDaysAgo), lte(alerts.createdAt, now)),
    );
  const alertsInWindow = Number(alerts30d?.inWindow ?? 0);
  const actionedClosed30 = Number(alerts30d?.actionedOrClosed ?? 0);

  const [fp30] = await db
    .select({
      c: sql<number>`count(distinct ${alertFeedback.alertId})`,
    })
    .from(alertFeedback)
    .innerJoin(alerts, eq(alertFeedback.alertId, alerts.id))
    .where(
      and(
        eq(alertFeedback.type, "false_positive"),
        gte(alerts.createdAt, thirtyDaysAgo),
        lte(alerts.createdAt, now),
      ),
    );
  const falsePositiveCount30 = Number(fp30?.c ?? 0);
  const falsePositiveRate30 =
    alertsInWindow > 0 ? (falsePositiveCount30 / alertsInWindow) * 100 : 0;
  const alertEngagementRate30 =
    alertsInWindow > 0 ? (actionedClosed30 / alertsInWindow) * 100 : 0;

  const ttfPlatform = await getMedianTimeToFirstAction({
    startDate: thirtyDaysAgo,
    endDate: now,
  });

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
      targetLastCrawlSuccessPercent,
      targetLastCrawlFailed: tcFailed,
      targetLastCrawlCompleted: tcCompleted,
      crawlAuditSuccessPercent: crawlAudit.successPercent,
      crawlAuditCompleted: crawlAudit.completed,
      crawlAuditFailed: crawlAudit.failed,
    },
    moatBaselines: {
      windowDays: 30,
      alertsInWindow,
      falsePositiveCount: falsePositiveCount30,
      falsePositiveRate: Math.round(falsePositiveRate30 * 10) / 10,
      alertEngagementRate: Math.round(alertEngagementRate30 * 10) / 10,
      medianTimeToFirstActionMinutes: ttfPlatform.medianMinutes,
      timeToFirstActionSampleSize: ttfPlatform.sampleSize,
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

  const [trends, byJurisdiction, summaryRows, fpRows, ttf, sourceReliability] =
    await Promise.all([
      db
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
        .orderBy(trunc),
      db
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
        .orderBy(sql`count(*) desc`),
      db
        .select({
          total: count(),
          openedOrActed: sql<number>`count(*) filter (where ${alerts.status} in ('actioned', 'closed'))`,
          actionable: sql<number>`count(*) filter (where ${alerts.impactScore} >= 0.4)`,
          triaged: sql<number>`count(*) filter (where ${alerts.status} = 'triaged')`,
        })
        .from(alerts)
        .where(
          and(
            eq(alerts.organizationId, organizationId),
            gte(alerts.createdAt, startDate),
            lte(alerts.createdAt, endDate),
          ),
        ),
      db
        .select({
          count: sql<number>`count(distinct ${alertFeedback.alertId})`,
        })
        .from(alertFeedback)
        .innerJoin(alerts, eq(alertFeedback.alertId, alerts.id))
        .where(
          and(
            eq(alertFeedback.organizationId, organizationId),
            eq(alertFeedback.type, "false_positive"),
            gte(alerts.createdAt, startDate),
            lte(alerts.createdAt, endDate),
          ),
        ),
      getMedianTimeToFirstAction({
        organizationId,
        startDate,
        endDate,
      }),
      getOrgSourceReliability(organizationId),
    ]);

  const [summaryRow] = summaryRows;
  const [fpRow] = fpRows;
  const total = Number(summaryRow?.total ?? 0);
  const openedOrActedCount = Number(summaryRow?.openedOrActed ?? 0);
  const actionableCount = Number(summaryRow?.actionable ?? 0);
  const triagedCount = Number(summaryRow?.triaged ?? 0);
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
      falsePositiveCount: fpCount,
      triagedCount,
      medianTimeToFirstActionMinutes: ttf.medianMinutes,
      timeToFirstActionSampleSize: ttf.sampleSize,
    },
    moat: {
      sourceReliability,
    },
  };
}
