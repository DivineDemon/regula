import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  alerts,
  notificationPreferences,
  organizationMembers,
  organizations,
  targets,
  users,
} from "@/lib/db/schema";
import { email } from "./email";
import { sendSlackAlertNotification } from "./slack-integration";
import { PLAN_CONFIGS, type PlanType } from "./stripe";
import { sendTeamsAlertNotification } from "./teams-integration";
import { sendWebhook, type WebhookPayload } from "./webhook";
import { triggerAllWebhooksForAlert } from "./webhook-configs";

/**
 * Get notification preferences for a user or organization
 */
export async function getNotificationPreferences(
  userId?: string,
  organizationId?: string,
) {
  if (userId) {
    const [pref] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    if (pref) return pref;
  }

  if (organizationId) {
    const [pref] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.organizationId, organizationId))
      .limit(1);
    if (pref) return pref;
  }

  // Return defaults
  return {
    emailEnabled: true,
    emailRealtime: true,
    emailDigest: true,
    emailDigestFrequency: "daily" as const,
    alertThreshold: "all" as const,
    categoryFilters: null,
    webhookEnabled: false,
    webhookUrl: null,
    webhookSecret: null,
  };
}

/**
 * Check if alert passes category filter (empty filter = allow all)
 */
export function passesCategoryFilter(
  targetCategory: string | null,
  categoryFilters: string[] | null | undefined,
): boolean {
  if (!categoryFilters || categoryFilters.length === 0) return true;
  if (!targetCategory) return false;
  return categoryFilters.includes(targetCategory);
}

/**
 * Check if alert meets threshold
 */
export function meetsThreshold(
  impactScore: number | null,
  threshold: "all" | "low" | "medium" | "high",
): boolean {
  if (threshold === "all") return true;
  if (impactScore === null) return false;

  if (threshold === "high") return impactScore >= 0.7;
  if (threshold === "medium") return impactScore >= 0.4;
  if (threshold === "low") return impactScore >= 0;

  return true;
}

/**
 * Send real-time alert notification
 */
export async function sendRealtimeAlertNotification(params: {
  alertId: string;
  organizationId: string;
  targetLabel: string;
  summary: string;
  impactScore: number | null;
  alertUrl: string;
  targetCategory?: string | null;
}) {
  const {
    alertId,
    organizationId,
    targetLabel,
    summary,
    impactScore,
    alertUrl,
    targetCategory = null,
  } = params;

  // Check if organization's plan allows real-time alerts
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    return; // Organization not found
  }

  const plan = org.plan as PlanType;
  const planConfig = PLAN_CONFIGS[plan];

  // If plan doesn't allow real-time alerts, skip sending real-time notifications
  // (users will get digest emails instead)
  if (!planConfig.realTimeAlerts) {
    return;
  }

  // Get all organization members
  const members = await db
    .select({
      user: users,
      member: organizationMembers,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  // Send notifications to each member based on their preferences
  const notificationPromises = members.map(async (member) => {
    const prefs = await getNotificationPreferences(
      member.user.id,
      organizationId,
    );

    // Check if email is enabled and realtime is enabled
    if (!prefs.emailEnabled || !prefs.emailRealtime) {
      return;
    }

    // Check threshold
    if (
      !meetsThreshold(
        impactScore,
        prefs.alertThreshold as "all" | "low" | "medium" | "high",
      )
    ) {
      return;
    }

    // Check category filter
    if (
      !passesCategoryFilter(
        targetCategory ?? null,
        prefs.categoryFilters ?? null,
      )
    ) {
      return;
    }

    // Send email
    if (member.user.email) {
      await email.sendAlertNotification({
        to: member.user.email,
        alertId,
        targetLabel,
        summary,
        impactScore: impactScore ?? undefined,
        alertUrl,
      });
    }
  });

  await Promise.allSettled(notificationPromises);

  // Send webhook if enabled at org level
  const orgPrefs = await getNotificationPreferences(undefined, organizationId);
  if (orgPrefs.webhookEnabled && orgPrefs.webhookUrl) {
    const webhookPayload: WebhookPayload = {
      type: "alert.created",
      alertId,
      organizationId,
      targetLabel,
      summary,
      impactScore,
      alertUrl,
      timestamp: new Date().toISOString(),
    };

    // Send webhook with retry, timeout, and proper error handling
    // Fire and forget - don't block alert creation
    sendWebhook({
      url: orgPrefs.webhookUrl,
      payload: webhookPayload,
      secret: orgPrefs.webhookSecret ?? null,
      organizationId,
      alertId,
    }).catch((error) => {
      // This should rarely happen as sendWebhook handles errors internally
      console.error("Unexpected error in webhook delivery:", error);
    });
  }

  // Trigger all configured webhooks (from webhook-configs table)
  const webhookPayload: WebhookPayload = {
    type: "alert.created",
    alertId,
    organizationId,
    targetLabel,
    summary,
    impactScore,
    alertUrl,
    timestamp: new Date().toISOString(),
  };

  triggerAllWebhooksForAlert(organizationId, webhookPayload).catch((error) => {
    console.error("Error triggering webhook configs:", error);
  });

  // Send Slack notification if webhook URL is a Slack webhook
  if (orgPrefs.webhookEnabled && orgPrefs.webhookUrl) {
    const webhookUrl = orgPrefs.webhookUrl;
    // Check if it's a Slack webhook URL (starts with https://hooks.slack.com)
    if (webhookUrl.startsWith("https://hooks.slack.com/")) {
      // Get alert details for jurisdiction and category (from target)
      const [alertData] = await db
        .select({
          target: targets,
        })
        .from(alerts)
        .innerJoin(targets, eq(alerts.targetId, targets.id))
        .where(eq(alerts.id, alertId))
        .limit(1);

      sendSlackAlertNotification({
        webhookUrl,
        alertId,
        targetLabel,
        summary,
        impactScore,
        alertUrl,
        jurisdiction: alertData?.target.jurisdiction ?? undefined,
        category: alertData?.target.category ?? undefined,
      }).catch((error) => {
        console.error("Error sending Slack notification:", error);
      });
    }
    // Check if it's a Teams webhook URL (contains webhook.office.com or incoming.office.com)
    else if (
      webhookUrl.includes("webhook.office.com") ||
      webhookUrl.includes("incoming.office.com")
    ) {
      // Get alert details for jurisdiction and category (from target)
      const [alertData] = await db
        .select({
          target: targets,
        })
        .from(alerts)
        .innerJoin(targets, eq(alerts.targetId, targets.id))
        .where(eq(alerts.id, alertId))
        .limit(1);

      sendTeamsAlertNotification({
        webhookUrl,
        alertId,
        targetLabel,
        summary,
        impactScore,
        alertUrl,
        jurisdiction: alertData?.target.jurisdiction ?? undefined,
        category: alertData?.target.category ?? undefined,
      }).catch((error) => {
        console.error("Error sending Teams notification:", error);
      });
    }
  }
}

/**
 * Send digest email
 */
export async function sendDigestEmail(params: {
  userId: string;
  organizationId: string;
  organizationName: string;
  alerts: Array<{
    id: string;
    targetLabel: string;
    summary: string;
    impactScore?: number;
    createdAt: Date;
  }>;
  digestUrl: string;
  frequency: "daily" | "weekly";
}) {
  const {
    userId,
    organizationId,
    organizationName,
    alerts,
    digestUrl,
    frequency: _frequency,
  } = params;

  const prefs = await getNotificationPreferences(userId, organizationId);

  if (!prefs.emailEnabled || !prefs.emailDigest) {
    return;
  }

  // Filter alerts by threshold
  const filteredAlerts = alerts.filter((alert) =>
    meetsThreshold(
      alert.impactScore ?? null,
      prefs.alertThreshold as "all" | "low" | "medium" | "high",
    ),
  );

  if (filteredAlerts.length === 0) {
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.email) {
    return;
  }

  await email.sendDailyDigest({
    to: user.email,
    organizationName,
    alerts: filteredAlerts,
    digestUrl,
  });
}
