import { inngest } from "@/lib/inngest/client";
import { dataRetentionService } from "@/lib/services/data-retention";

/**
 * Periodic data retention cleanup job
 * Runs daily to clean up old data based on plan retention policies
 */
export const dataRetentionCleanup = inngest.createFunction(
  {
    id: "data-retention-cleanup",
    name: "Data Retention Cleanup",
    retries: 2,
  },
  { cron: "0 2 * * *" }, // Run daily at 2 AM
  async ({ step }) => {
    const results = await step.run("cleanup-all-organizations", async () => {
      return dataRetentionService.cleanupAllOrganizations();
    });

    return {
      success: true,
      organizationsProcessed: results.length,
      totalVersionsDeleted: results.reduce(
        (sum, r) => sum + r.deletedVersions,
        0,
      ),
      totalAlertsDeleted: results.reduce((sum, r) => sum + r.deletedAlerts, 0),
      details: results,
    };
  },
);
