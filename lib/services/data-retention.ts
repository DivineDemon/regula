import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, organizations, targets, versions } from "@/lib/db/schema";
import { PLAN_CONFIGS, type PlanType } from "./stripe";

/**
 * Data retention service
 * Enforces data retention policies based on subscription plan
 */
export const dataRetentionService = {
  /**
   * Get retention period in days for a plan
   */
  getRetentionDays(plan: PlanType): number {
    const config = PLAN_CONFIGS[plan];
    return config.retentionDays === Infinity ? Infinity : config.retentionDays;
  },

  /**
   * Get cutoff date for data retention based on plan
   */
  getRetentionCutoffDate(plan: PlanType): Date | null {
    const retentionDays = this.getRetentionDays(plan);
    if (retentionDays === Infinity) {
      return null; // No cutoff for unlimited retention
    }
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    return cutoffDate;
  },

  /**
   * Clean up old data for an organization based on retention policy
   */
  async cleanupOrganizationData(organizationId: string): Promise<{
    deletedVersions: number;
    deletedAlerts: number;
  }> {
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
    const cutoffDate = this.getRetentionCutoffDate(plan);

    // If unlimited retention, nothing to clean up
    if (!cutoffDate) {
      return { deletedVersions: 0, deletedAlerts: 0 };
    }

    // Get all targets for this organization
    const orgTargets = await db
      .select({ id: targets.id })
      .from(targets)
      .where(eq(targets.organizationId, organizationId));

    const targetIds = orgTargets.map((t) => t.id);

    if (targetIds.length === 0) {
      return { deletedVersions: 0, deletedAlerts: 0 };
    }

    // Find old versions (before cutoff date) for all targets
    const oldVersions = await db
      .select({ id: versions.id })
      .from(versions)
      .where(
        and(
          inArray(versions.targetId, targetIds),
          lt(versions.crawledAt, cutoffDate),
        ),
      );

    const versionIds = oldVersions.map((v) => v.id);

    if (versionIds.length === 0) {
      return { deletedVersions: 0, deletedAlerts: 0 };
    }

    // Count alerts that will be deleted (for reporting)
    const alertsToDelete = await db
      .select({ id: alerts.id })
      .from(alerts)
      .where(inArray(alerts.versionId, versionIds));

    const deletedAlertsCount = alertsToDelete.length;

    // Delete alerts first (they reference versions)
    if (alertsToDelete.length > 0) {
      await db.delete(alerts).where(
        inArray(
          alerts.id,
          alertsToDelete.map((a) => a.id),
        ),
      );
    }

    // Delete old versions
    await db.delete(versions).where(inArray(versions.id, versionIds));

    return {
      deletedVersions: versionIds.length,
      deletedAlerts: deletedAlertsCount,
    };
  },

  /**
   * Clean up old data for all organizations
   * This should be run periodically (e.g., daily via Inngest)
   */
  async cleanupAllOrganizations(): Promise<
    {
      organizationId: string;
      deletedVersions: number;
      deletedAlerts: number;
    }[]
  > {
    const allOrgs = await db.select().from(organizations);
    const results = [];

    for (const org of allOrgs) {
      try {
        const result = await this.cleanupOrganizationData(org.id);
        results.push({
          organizationId: org.id,
          ...result,
        });
      } catch (error) {
        console.error(
          `Error cleaning up data for organization ${org.id}:`,
          error,
        );
      }
    }

    return results;
  },
};
