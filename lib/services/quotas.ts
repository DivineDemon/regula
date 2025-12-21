import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { PLAN_CONFIGS, type PlanType } from "./stripe";
import { usageService } from "./usage";

/**
 * Quota enforcement service
 */
export const quotaService = {
  /**
   * Check if organization can perform an action based on plan limits
   */
  async checkQuota({
    organizationId,
    action,
  }: {
    organizationId: string;
    action: "create_target" | "create_crawl" | "store_data";
  }): Promise<{ allowed: boolean; reason?: string }> {
    // Get organization plan
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return { allowed: false, reason: "Organization not found" };
    }

    const plan = org.plan as PlanType;
    const planConfig = PLAN_CONFIGS[plan];

    switch (action) {
      case "create_target": {
        const targetCount = await usageService.getTargetCount(organizationId);
        if (planConfig.targets === Infinity) {
          return { allowed: true };
        }
        if (targetCount >= planConfig.targets) {
          return {
            allowed: false,
            reason: `Plan limit reached. Your ${planConfig.name} plan allows up to ${planConfig.targets} targets.`,
          };
        }
        return { allowed: true };
      }

      case "create_crawl":
      case "store_data":
        // For now, we allow unlimited crawls and storage within retention limits
        // These can be enforced later if needed
        return { allowed: true };

      default:
        return { allowed: false, reason: "Unknown action" };
    }
  },

  /**
   * Get quota information for an organization
   */
  async getQuotaInfo(organizationId: string) {
    // Get organization plan
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      throw new Error("Organization not found");
    }

    const plan = org.plan as PlanType;
    const planConfig = PLAN_CONFIGS[plan];

    // Get current usage
    const targetCount = await usageService.getTargetCount(organizationId);
    const usage = await usageService.getCurrentUsage(organizationId);

    return {
      plan: planConfig.name,
      planType: plan,
      limits: {
        targets: planConfig.targets,
        retentionDays: planConfig.retentionDays,
        crawlFrequency: planConfig.crawlFrequency,
        realTimeAlerts: planConfig.realTimeAlerts,
      },
      usage: {
        targets: targetCount,
        crawls: usage.crawls,
        alerts: usage.alerts,
        storageBytes: usage.storageBytes,
      },
      usagePercentages: {
        targets:
          planConfig.targets === Infinity
            ? 0
            : Math.round((targetCount / planConfig.targets) * 100),
        // Other metrics don't have hard limits currently
      },
    };
  },

  /**
   * Check if organization has exceeded any quotas
   */
  async hasExceededQuota(organizationId: string): Promise<boolean> {
    const quotaInfo = await this.getQuotaInfo(organizationId);

    // Check targets
    if (
      quotaInfo.limits.targets !== Infinity &&
      quotaInfo.usage.targets >= quotaInfo.limits.targets
    ) {
      return true;
    }

    return false;
  },
};
