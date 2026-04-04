import { and, desc, eq, gte } from "drizzle-orm";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  auditLogs,
  organizationMembers,
  organizations,
  users,
} from "@/lib/db/schema";
import { createAuditLog } from "@/lib/services/audit";
import { email as emailService } from "./email";
import { quotaService } from "./quotas";

const WARNING_THRESHOLDS = {
  WARNING: 0.8, // 80%
  CRITICAL: 1.0, // 100%
} as const;

type WarningLevel = "warning" | "critical";
type WarningMetric = "targets" | "crawls" | "storage";

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Usage warning service
 */
export const usageWarningService = {
  /**
   * Check usage and send warnings if thresholds are exceeded
   */
  async checkAndSendWarnings(organizationId: string) {
    const quotaInfo = await quotaService.getQuotaInfo(organizationId);

    // Check targets quota
    await this.checkMetric(organizationId, "targets", quotaInfo);
    await this.checkMetric(organizationId, "crawls", quotaInfo);
    await this.checkMetric(organizationId, "storage", quotaInfo);
  },

  async checkMetric(
    organizationId: string,
    metric: WarningMetric,
    quotaInfo: Awaited<ReturnType<typeof quotaService.getQuotaInfo>>,
  ) {
    const percentage = this.getUsagePercentage(metric, quotaInfo) / 100;
    if (percentage <= 0) return;

    if (percentage >= WARNING_THRESHOLDS.CRITICAL) {
      await this.sendWarning(organizationId, metric, "critical", quotaInfo);
    } else if (percentage >= WARNING_THRESHOLDS.WARNING) {
      await this.sendWarning(organizationId, metric, "warning", quotaInfo);
    }
  },

  /**
   * Send usage warning email to organization admins
   */
  async sendWarning(
    organizationId: string,
    metric: WarningMetric,
    level: WarningLevel,
    quotaInfo: Awaited<ReturnType<typeof quotaService.getQuotaInfo>>,
  ) {
    const currentPeriod = getCurrentPeriod();

    // Avoid spamming: only send once per org/metric/level per period.
    const alreadySent = await this.hasSentWarningThisPeriod({
      organizationId,
      metric,
      level,
      period: currentPeriod,
    });
    if (alreadySent) return;

    // Get organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return;
    }

    // Get organization admins
    const admins = await db
      .select({
        user: users,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.role, UserRole.ADMIN),
        ),
      );

    if (admins.length === 0) {
      return;
    }

    // Prepare warning message
    const levelLabels = {
      warning: "Warning",
      critical: "Critical",
    };

    const metricLabels = {
      targets: "Targets",
      crawls: "Crawls",
      storage: "Storage",
    };

    const usagePercent = this.getUsagePercentage(metric, quotaInfo);

    const subject = `[Regula] ${levelLabels[level]}: ${metricLabels[metric]} quota at ${usagePercent}%`;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const upgradeUrl = `${baseUrl}/settings/billing`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${
            level === "critical" ? "#dc2626" : "#d97706"
          }; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${levelLabels[level]} Usage Alert</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin-top: 0; color: #111827;">Hello ${org.name},</h2>
            <p style="margin: 16px 0; color: #374151;">
              Your ${quotaInfo.plan} plan usage for ${metricLabels[metric]} has reached <strong>${usagePercent}%</strong> of your limit.
            </p>
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${
              level === "critical" ? "#dc2626" : "#d97706"
            };">
              <h3 style="margin-top: 0; color: #374151;">Usage Details</h3>
              <p style="margin: 8px 0; color: #6b7280;">
                <strong>${metricLabels[metric]}:</strong> ${this.formatUsageLine(metric, quotaInfo)}
              </p>
              <p style="margin: 8px 0; color: #6b7280;">
                <strong>Plan:</strong> ${quotaInfo.plan}
              </p>
            </div>
            ${
              level === "critical"
                ? `<div style="background: #fee2e2; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #dc2626;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">
                ⚠️ You've reached your plan limit. Upgrade your plan to avoid service interruption.
              </p>
            </div>`
                : `<div style="background: #fef3c7; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #d97706;">
              <p style="margin: 0; color: #92400e;">
                You're approaching your plan limit. Consider upgrading to avoid service interruption.
              </p>
            </div>`
            }
            <div style="text-align: center; margin: 30px 0;">
              <a href="${upgradeUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Upgrade Plan</a>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${levelLabels[level]} Usage Alert

Hello ${org.name},

Your ${quotaInfo.plan} plan usage for ${metricLabels[metric]} has reached ${usagePercent}% of your limit.

Usage Details:
${metricLabels[metric]}: ${this.formatUsageLine(metric, quotaInfo)}
Plan: ${quotaInfo.plan}

${
  level === "critical"
    ? "⚠️ You've reached your plan limit. Upgrade your plan to avoid service interruption."
    : "You're approaching your plan limit. Consider upgrading to avoid service interruption."
}

Upgrade Plan: ${upgradeUrl}
    `.trim();

    // Send email to all admins
    const adminEmails = admins.map((a) => a.user.email).filter(Boolean);
    if (adminEmails.length > 0) {
      await emailService.send({
        to: adminEmails,
        subject,
        html,
        text,
      });
    }

    await createAuditLog({
      organizationId,
      userId: null,
      action: "usage.quota_warning_sent",
      metadata: {
        metric,
        level,
        usagePercent,
        period: currentPeriod,
      },
    });
  },

  getUsagePercentage(
    metric: WarningMetric,
    quotaInfo: Awaited<ReturnType<typeof quotaService.getQuotaInfo>>,
  ): number {
    switch (metric) {
      case "targets":
        return quotaInfo.usagePercentages.targets;
      case "crawls":
        return quotaInfo.usagePercentages.crawls;
      case "storage":
        return quotaInfo.usagePercentages.storage;
    }
  },

  formatUsageLine(
    metric: WarningMetric,
    quotaInfo: Awaited<ReturnType<typeof quotaService.getQuotaInfo>>,
  ): string {
    if (metric === "targets") {
      const limit = quotaInfo.limits.targets;
      return `${quotaInfo.usage.targets} / ${limit === "Infinity" ? "Unlimited" : limit}`;
    }
    if (metric === "crawls") {
      const limit = quotaInfo.limits.crawlQuota;
      return `${quotaInfo.usage.crawls} / ${limit === "Infinity" ? "Unlimited" : limit}`;
    }
    const limit = quotaInfo.limits.storageQuota;
    if (limit === "Infinity")
      return `${quotaInfo.usage.storageBytes} bytes / Unlimited`;
    if (typeof limit !== "number")
      return `${quotaInfo.usage.storageBytes} bytes`;
    const usedGb = (quotaInfo.usage.storageBytes / 1073741824).toFixed(2);
    const limitGb = (limit / 1073741824).toFixed(2);
    return `${usedGb} GB / ${limitGb} GB`;
  },

  async hasSentWarningThisPeriod(params: {
    organizationId: string;
    metric: WarningMetric;
    level: WarningLevel;
    period: string;
  }): Promise<boolean> {
    const { organizationId, metric, level, period } = params;

    // Fast path: only look back 45 days.
    const now = new Date();
    const floor = new Date(now);
    floor.setDate(floor.getDate() - 45);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.organizationId, organizationId),
          eq(auditLogs.action, "usage.quota_warning_sent"),
          gte(auditLogs.createdAt, floor),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);

    for (const row of rows) {
      if (!row.metadata) continue;
      try {
        const meta = JSON.parse(row.metadata) as {
          metric?: string;
          level?: string;
          period?: string;
        };
        if (
          meta.metric === metric &&
          meta.level === level &&
          meta.period === period
        ) {
          return true;
        }
      } catch {
        // ignore malformed metadata
      }
    }

    return false;
  },
};
