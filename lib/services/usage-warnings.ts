import { and, eq } from "drizzle-orm";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers, organizations, users } from "@/lib/db/schema";
import { email as emailService } from "./email";
import { quotaService } from "./quotas";

const WARNING_THRESHOLDS = {
  WARNING: 0.8, // 80%
  CRITICAL: 1.0, // 100%
} as const;

type WarningLevel = "warning" | "critical";

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
    if (quotaInfo.limits.targets !== Infinity) {
      const targetPercentage = quotaInfo.usagePercentages.targets / 100;

      if (targetPercentage >= WARNING_THRESHOLDS.CRITICAL) {
        await this.sendWarning(
          organizationId,
          "targets",
          "critical",
          quotaInfo,
        );
      } else if (targetPercentage >= WARNING_THRESHOLDS.WARNING) {
        await this.sendWarning(organizationId, "targets", "warning", quotaInfo);
      }
    }
  },

  /**
   * Send usage warning email to organization admins
   */
  async sendWarning(
    organizationId: string,
    metric: "targets",
    level: WarningLevel,
    quotaInfo: Awaited<ReturnType<typeof quotaService.getQuotaInfo>>,
  ) {
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
    };

    const usagePercent =
      quotaInfo.limits.targets === "Infinity" ||
      typeof quotaInfo.limits.targets !== "number"
        ? 0
        : Math.round(
            (quotaInfo.usage.targets / quotaInfo.limits.targets) * 100,
          );

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
                <strong>${metricLabels[metric]}:</strong> ${quotaInfo.usage.targets} / ${quotaInfo.limits.targets === Infinity ? "Unlimited" : quotaInfo.limits.targets}
              </p>
              <p style="margin: 8px 0; color: #6b7280;">
                <strong>Plan:</strong> ${quotaInfo.plan}
              </p>
            </div>
            ${
              level === "critical"
                ? `<div style="background: #fee2e2; padding: 16px; border-radius: 6px; margin: 20px 0; border: 1px solid #dc2626;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">
                ⚠️ You've reached your plan limit. Upgrade your plan to continue adding targets.
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
${metricLabels[metric]}: ${quotaInfo.usage.targets} / ${quotaInfo.limits.targets === Infinity ? "Unlimited" : quotaInfo.limits.targets}
Plan: ${quotaInfo.plan}

${
  level === "critical"
    ? "⚠️ You've reached your plan limit. Upgrade your plan to continue adding targets."
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
  },
};
