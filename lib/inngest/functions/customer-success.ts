import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  alerts,
  organizationMembers,
  organizations,
  targets,
  users,
} from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { email } from "@/lib/services/email";

const baseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send 24-hour onboarding success emails to orgs that completed onboarding ~24h ago.
 * "Completed" = org has at least one target (user left onboarding and added targets).
 */
export const sendOnboardingSuccess24h = inngest.createFunction(
  {
    id: "send-onboarding-success-24h",
    name: "Send 24h Onboarding Success Emails",
  },
  { cron: "0 10 * * *" }, // Daily at 10:00
  async ({ step }) => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setHours(windowStart.getHours() - 25);
    const windowEnd = new Date(now);
    windowEnd.setHours(windowEnd.getHours() - 23);

    const orgsToEmail = await step.run("fetch-orgs-24h", async () => {
      const orgsWithTargets = await db
        .selectDistinct({ organizationId: targets.organizationId })
        .from(targets);

      const orgIdsWithTargets = new Set(
        orgsWithTargets.map((r) => r.organizationId),
      );

      const recentOrgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .where(
          and(
            gte(organizations.createdAt, windowStart),
            lte(organizations.createdAt, windowEnd),
          ),
        );

      return recentOrgs.filter((org) => orgIdsWithTargets.has(org.id));
    });

    for (const org of orgsToEmail) {
      await step.run(`send-24h-${org.id}`, async () => {
        const admins = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, org.id),
              eq(organizationMembers.role, UserRole.ADMIN),
            ),
          );

        const userIds = admins.map((a) => a.userId);
        if (userIds.length === 0) return { skipped: "no admins" };

        const recipientUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.id, userIds));

        const emails = recipientUsers
          .map((u) => u.email)
          .filter((e): e is string => !!e);
        if (emails.length === 0) return { skipped: "no emails" };

        await email.sendOnboardingSuccess24h({
          to: emails,
          organizationName: org.name,
          dashboardUrl: `${baseUrl()}/dashboard`,
        });
        return { sent: emails.length };
      });
    }

    return { orgsProcessed: orgsToEmail.length };
  },
);

/**
 * Send 7-day onboarding check-in emails to orgs that completed onboarding ~7 days ago.
 */
export const sendOnboardingSuccess7d = inngest.createFunction(
  {
    id: "send-onboarding-success-7d",
    name: "Send 7-Day Onboarding Check-in Emails",
  },
  { cron: "0 10 * * *" }, // Daily at 10:00
  async ({ step }) => {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 8);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() - 6);

    const orgsToEmail = await step.run("fetch-orgs-7d", async () => {
      const orgsWithTargets = await db
        .selectDistinct({ organizationId: targets.organizationId })
        .from(targets);
      const orgIdsWithTargets = new Set(
        orgsWithTargets.map((r) => r.organizationId),
      );

      const recentOrgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .where(
          and(
            gte(organizations.createdAt, windowStart),
            lte(organizations.createdAt, windowEnd),
          ),
        );

      return recentOrgs.filter((org) => orgIdsWithTargets.has(org.id));
    });

    for (const org of orgsToEmail) {
      await step.run(`send-7d-${org.id}`, async () => {
        const admins = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, org.id),
              eq(organizationMembers.role, UserRole.ADMIN),
            ),
          );

        const userIds = admins.map((a) => a.userId);
        if (userIds.length === 0) return { skipped: "no admins" };

        const recipientUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.id, userIds));

        const emails = recipientUsers
          .map((u) => u.email)
          .filter((e): e is string => !!e);
        if (emails.length === 0) return { skipped: "no emails" };

        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const [countResult] = await db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(alerts)
          .where(
            and(
              eq(alerts.organizationId, org.id),
              gte(alerts.createdAt, lastWeek),
            ),
          );

        const alertsCount = countResult?.count ?? 0;

        await email.sendOnboardingSuccess7d({
          to: emails,
          organizationName: org.name,
          dashboardUrl: `${baseUrl()}/dashboard`,
          alertsCount,
        });
        return { sent: emails.length };
      });
    }

    return { orgsProcessed: orgsToEmail.length };
  },
);

/**
 * Weekly job: find low-engagement orgs and send "we're here to help" email to admins.
 * Uses customer health scoring (logins, alerts opened/closed in last 14 days).
 */
export const sendLowEngagementOutreach = inngest.createFunction(
  {
    id: "send-low-engagement-outreach",
    name: "Send Low-Engagement Outreach Emails",
  },
  { cron: "0 11 * * 1" }, // Every Monday at 11:00
  async ({ step }) => {
    const { getOrganizationsHealthScores } = await import(
      "@/lib/services/customer-health"
    );

    const lowEngagementOrgs = await step.run(
      "fetch-low-engagement-orgs",
      async () => getOrganizationsHealthScores({ lowEngagementOnly: true }),
    );

    for (const health of lowEngagementOrgs) {
      await step.run(`outreach-${health.organizationId}`, async () => {
        const admins = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, health.organizationId),
              eq(organizationMembers.role, UserRole.ADMIN),
            ),
          );

        const userIds = admins.map((a) => a.userId);
        if (userIds.length === 0) return { skipped: "no admins" };

        const recipientUsers = await db
          .select({ email: users.email })
          .from(users)
          .where(inArray(users.id, userIds));

        const emails = recipientUsers
          .map((u) => u.email)
          .filter((e): e is string => !!e);
        if (emails.length === 0) return { skipped: "no emails" };

        await email.sendLowEngagementOutreach({
          to: emails,
          organizationName: health.organizationName,
          dashboardUrl: `${baseUrl()}/dashboard`,
        });
        return { sent: emails.length };
      });
    }

    return { orgsProcessed: lowEngagementOrgs.length };
  },
);
