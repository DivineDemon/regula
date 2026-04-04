import { and, desc, eq, gte } from "drizzle-orm";
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
import {
  getNotificationPreferences,
  meetsThreshold,
  passesCategoryFilter,
} from "@/lib/services/notifications";

/**
 * Send daily digest emails
 */
export const sendDailyDigests = inngest.createFunction(
  {
    id: "send-daily-digests",
    name: "Send Daily Digest Emails",
  },
  { cron: "0 9 * * *" }, // Run daily at 9 AM
  async ({ step }) => {
    // Get all organizations
    const organizationsList = await step.run(
      "fetch-organizations",
      async () => {
        return db.select().from(organizations);
      },
    );

    // For each organization, get members and send digests
    for (const org of organizationsList) {
      await step.run(`send-digests-${org.id}`, async () => {
        // Get all members
        const members = await db
          .select()
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, org.id));

        // Get alerts from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const recentAlerts = await db
          .select({
            alert: alerts,
            target: targets,
          })
          .from(alerts)
          .innerJoin(targets, eq(alerts.targetId, targets.id))
          .where(
            and(
              eq(alerts.organizationId, org.id),
              gte(alerts.createdAt, yesterday),
            ),
          )
          .orderBy(desc(alerts.createdAt));

        // Send digest to each member
        for (const member of members) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, member.userId))
            .limit(1);

          if (!user) continue;

          const prefs = await getNotificationPreferences(member.userId, org.id);

          if (!prefs.emailEnabled || !prefs.emailDigest) {
            continue;
          }
          if (prefs.emailDigestFrequency !== "daily") {
            continue;
          }

          // Filter alerts by threshold and category
          const filteredAlerts = recentAlerts
            .map(({ alert, target }) => ({
              id: alert.id,
              targetLabel: target.label,
              summary: alert.summary ?? "",
              impactScore: alert.impactScore ?? undefined,
              createdAt: alert.createdAt,
              category: target.category ?? null,
            }))
            .filter((alert) => {
              if (
                !meetsThreshold(
                  alert.impactScore ?? null,
                  prefs.alertThreshold as "all" | "low" | "medium" | "high",
                )
              ) {
                return false;
              }
              return passesCategoryFilter(
                alert.category,
                prefs.categoryFilters ?? null,
              );
            });

          if (filteredAlerts.length === 0) {
            continue;
          }

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const digestUrl = `${baseUrl}/alerts?organizationId=${org.id}`;

          await email.sendDailyDigest({
            to: user.email,
            organizationName: org.name,
            alerts: filteredAlerts,
            digestUrl,
          });
        }
      });
    }

    return { success: true };
  },
);

/**
 * Send weekly digest emails
 */
export const sendWeeklyDigests = inngest.createFunction(
  {
    id: "send-weekly-digests",
    name: "Send Weekly Digest Emails",
  },
  { cron: "0 9 * * 1" }, // Run every Monday at 9 AM
  async ({ step }) => {
    // Get all organizations
    const organizationsList = await step.run(
      "fetch-organizations",
      async () => {
        return db.select().from(organizations);
      },
    );

    // For each organization, get members and send digests
    for (const org of organizationsList) {
      await step.run(`send-digests-${org.id}`, async () => {
        // Get all members
        const members = await db
          .select()
          .from(organizationMembers)
          .where(eq(organizationMembers.organizationId, org.id));

        // Get alerts from the last 7 days
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const recentAlerts = await db
          .select({
            alert: alerts,
            target: targets,
          })
          .from(alerts)
          .innerJoin(targets, eq(alerts.targetId, targets.id))
          .where(
            and(
              eq(alerts.organizationId, org.id),
              gte(alerts.createdAt, lastWeek),
            ),
          )
          .orderBy(desc(alerts.createdAt));

        // Send digest to each member
        for (const member of members) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, member.userId))
            .limit(1);

          if (!user) continue;

          const prefs = await getNotificationPreferences(member.userId, org.id);

          if (!prefs.emailEnabled || !prefs.emailDigest) {
            continue;
          }
          if (prefs.emailDigestFrequency !== "weekly") {
            continue;
          }

          // Filter alerts by threshold and category
          const filteredAlerts = recentAlerts
            .map(({ alert, target }) => ({
              id: alert.id,
              targetLabel: target.label,
              summary: alert.summary ?? "",
              impactScore: alert.impactScore ?? undefined,
              createdAt: alert.createdAt,
              category: target.category ?? null,
            }))
            .filter((alert) => {
              if (
                !meetsThreshold(
                  alert.impactScore ?? null,
                  prefs.alertThreshold as "all" | "low" | "medium" | "high",
                )
              ) {
                return false;
              }
              return passesCategoryFilter(
                alert.category,
                prefs.categoryFilters ?? null,
              );
            });

          if (filteredAlerts.length === 0) {
            continue;
          }

          const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const digestUrl = `${baseUrl}/alerts?organizationId=${org.id}`;

          await email.sendDailyDigest({
            to: user.email,
            organizationName: org.name,
            alerts: filteredAlerts,
            digestUrl,
          });
        }
      });
    }

    return { success: true };
  },
);
