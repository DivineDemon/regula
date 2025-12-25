import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, organizations, targets, versions } from "@/lib/db/schema";
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

      case "create_crawl": {
        // Check crawl quota
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [crawlsResult] = await db
          .select({ count: count() })
          .from(versions)
          .innerJoin(targets, eq(versions.targetId, targets.id))
          .where(
            and(
              eq(targets.organizationId, organizationId),
              gte(versions.crawledAt, startOfMonth),
            ),
          );

        const crawlsCount = Number(crawlsResult?.count ?? 0);

        // If plan has crawl quota, check it
        if (planConfig.crawlQuota !== undefined) {
          if (crawlsCount >= planConfig.crawlQuota) {
            return {
              allowed: false,
              reason: `Crawl quota exceeded. Your ${planConfig.name} plan allows ${planConfig.crawlQuota} crawls per month.`,
            };
          }
        }

        return { allowed: true };
      }

      case "store_data": {
        // Check storage quota
        const [storageResult] = await db
          .select({
            totalBytes: sql<number>`COALESCE(SUM(LENGTH(${versions.content})), 0)`,
          })
          .from(versions)
          .innerJoin(targets, eq(versions.targetId, targets.id))
          .where(eq(targets.organizationId, organizationId));

        const storageBytes = Number(storageResult?.totalBytes ?? 0);

        // If plan has storage quota, check it
        if (planConfig.storageQuota !== undefined) {
          if (storageBytes >= planConfig.storageQuota) {
            const storageGB = (planConfig.storageQuota / 1073741824).toFixed(1);
            return {
              allowed: false,
              reason: `Storage quota exceeded. Your ${planConfig.name} plan allows ${storageGB}GB of storage.`,
            };
          }
        }

        return { allowed: true };
      }

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

    // Get current usage - calculate directly from database
    const targetCount = await usageService.getTargetCount(organizationId);

    // Get crawls count (versions created this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [crawlsResult] = await db
      .select({ count: count() })
      .from(versions)
      .innerJoin(targets, eq(versions.targetId, targets.id))
      .where(
        and(
          eq(targets.organizationId, organizationId),
          gte(versions.crawledAt, startOfMonth),
        ),
      );

    const crawlsCount = Number(crawlsResult?.count ?? 0);

    // Get alerts count (alerts created this month)
    const [alertsResult] = await db
      .select({ count: count() })
      .from(alerts)
      .where(
        and(
          eq(alerts.organizationId, organizationId),
          gte(alerts.createdAt, startOfMonth),
        ),
      );

    const alertsCount = Number(alertsResult?.count ?? 0);

    // Get storage bytes (sum of content lengths from versions)
    const [storageResult] = await db
      .select({
        totalBytes: sql<number>`COALESCE(SUM(LENGTH(${versions.content})), 0)`,
      })
      .from(versions)
      .innerJoin(targets, eq(versions.targetId, targets.id))
      .where(eq(targets.organizationId, organizationId));

    const storageBytes = Number(storageResult?.totalBytes ?? 0);

    // Handle Infinity for JSON serialization (Infinity becomes null in JSON)
    const targetsLimit =
      planConfig.targets === Infinity
        ? ("Infinity" as const)
        : planConfig.targets;
    const retentionDaysLimit =
      planConfig.retentionDays === Infinity
        ? ("Infinity" as const)
        : planConfig.retentionDays;
    const crawlQuotaLimit =
      planConfig.crawlQuota === undefined
        ? ("Infinity" as const)
        : planConfig.crawlQuota;
    const storageQuotaLimit =
      planConfig.storageQuota === undefined
        ? ("Infinity" as const)
        : planConfig.storageQuota;

    return {
      plan: planConfig.name,
      planType: plan,
      limits: {
        targets: targetsLimit,
        retentionDays: retentionDaysLimit,
        crawlFrequency: planConfig.crawlFrequency,
        realTimeAlerts: planConfig.realTimeAlerts,
        crawlQuota: crawlQuotaLimit,
        storageQuota: storageQuotaLimit,
      },
      usage: {
        targets: targetCount,
        crawls: crawlsCount,
        alerts: alertsCount,
        storageBytes: storageBytes,
      },
      usagePercentages: {
        targets:
          planConfig.targets === Infinity
            ? 0
            : Math.round((targetCount / planConfig.targets) * 100),
        crawls:
          planConfig.crawlQuota === undefined
            ? 0
            : Math.round((crawlsCount / planConfig.crawlQuota) * 100),
        storage:
          planConfig.storageQuota === undefined
            ? 0
            : Math.round((storageBytes / planConfig.storageQuota) * 100),
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
      quotaInfo.limits.targets !== "Infinity" &&
      typeof quotaInfo.limits.targets === "number" &&
      quotaInfo.usage.targets >= quotaInfo.limits.targets
    ) {
      return true;
    }

    return false;
  },
};
