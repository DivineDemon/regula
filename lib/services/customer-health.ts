import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, auditLogs, organizations } from "@/lib/db/schema";

export interface OrgHealthScore {
  organizationId: string;
  organizationName: string;
  /** Logins in the last 14 days (any member) */
  loginsLast14d: number;
  /** Alerts created in the last 14 days */
  alertsCreatedLast14d: number;
  /** Alerts closed in the last 14 days */
  alertsClosedLast14d: number;
  /** Alerts with status changed (triaged/actioned) in the last 14 days — proxy for "opened/engaged" */
  alertsEngagedLast14d: number;
  /** Composite score 0–100; higher = more engaged */
  score: number;
  /** Whether this org is considered low-engagement (triggers proactive outreach) */
  lowEngagement: boolean;
}

const DAYS_LOOKBACK = 14;
/** No login in 14 days and (no alerts closed or very few engagements) => low engagement */
const LOW_ENGAGEMENT_LOGIN_THRESHOLD = 0;
const LOW_ENGAGEMENT_ALERTS_CLOSED_MAX = 1;
const LOW_ENGAGEMENT_ALERTS_ENGAGED_MAX = 2;

/**
 * Compute health metrics for a single organization.
 */
export async function getOrganizationHealthScore(
  organizationId: string,
): Promise<OrgHealthScore | null> {
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return null;

  const since = new Date();
  since.setDate(since.getDate() - DAYS_LOOKBACK);

  const [loginCount] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.action, "user.login"),
        gte(auditLogs.createdAt, since),
      ),
    );

  const [alertsCreated] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        gte(alerts.createdAt, since),
      ),
    );

  const [alertsEngagedResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.action, "alert.status_changed"),
        gte(auditLogs.createdAt, since),
      ),
    );

  const [closedResult] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.organizationId, organizationId),
        eq(alerts.status, "closed"),
        gte(alerts.updatedAt, since),
      ),
    );
  const alertsClosedLast14d = closedResult?.count ?? 0;
  const alertsEngagedLast14d = alertsEngagedResult?.count ?? 0;

  const loginsLast14d = loginCount?.count ?? 0;
  const alertsCreatedLast14d = alertsCreated?.count ?? 0;

  const score = computeScore(
    loginsLast14d,
    alertsCreatedLast14d,
    alertsClosedLast14d,
    alertsEngagedLast14d,
  );
  const lowEngagement =
    loginsLast14d <= LOW_ENGAGEMENT_LOGIN_THRESHOLD &&
    alertsClosedLast14d <= LOW_ENGAGEMENT_ALERTS_CLOSED_MAX &&
    alertsEngagedLast14d <= LOW_ENGAGEMENT_ALERTS_ENGAGED_MAX;

  return {
    organizationId: org.id,
    organizationName: org.name,
    loginsLast14d,
    alertsCreatedLast14d,
    alertsClosedLast14d,
    alertsEngagedLast14d,
    score,
    lowEngagement,
  };
}

/**
 * List all organizations with their health score; optionally only low-engagement.
 */
export async function getOrganizationsHealthScores(options?: {
  lowEngagementOnly?: boolean;
}): Promise<OrgHealthScore[]> {
  const allOrgs = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations);

  const results: OrgHealthScore[] = [];
  for (const org of allOrgs) {
    const health = await getOrganizationHealthScore(org.id);
    if (!health) continue;
    if (options?.lowEngagementOnly && !health.lowEngagement) continue;
    results.push(health);
  }
  return results;
}

function computeScore(
  logins: number,
  alertsCreated: number,
  alertsClosed: number,
  alertsEngaged: number,
): number {
  let score = 0;
  if (logins > 0) score += Math.min(logins * 5, 30);
  if (alertsCreated > 0) score += Math.min(alertsCreated * 2, 20);
  if (alertsClosed > 0) score += Math.min(alertsClosed * 10, 50);
  if (alertsEngaged > 0) score += Math.min(alertsEngaged * 2, 20);
  return Math.min(100, score);
}
