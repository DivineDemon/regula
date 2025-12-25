import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notificationPreferences,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { email } from "./email";
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
    webhookEnabled: false,
    webhookUrl: null,
    webhookSecret: null,
  };
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
}) {
  const {
    alertId,
    organizationId,
    targetLabel,
    summary,
    impactScore,
    alertUrl,
  } = params;

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

  // Send Slack notification if configured
  // Note: This would need to be stored in notification preferences or a separate config
  // For now, we'll skip this as it requires additional configuration

  // Send Teams notification if configured
  // Note: This would need to be stored in notification preferences or a separate config
  // For now, we'll skip this as it requires additional configuration
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
