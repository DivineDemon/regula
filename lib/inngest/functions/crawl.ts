import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { targets } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { detectChanges } from "@/lib/services/diff";
import { crawlUrl } from "@/lib/services/firecrawl";
import {
  compareVersionsByHash,
  getVersion,
  storeVersion,
} from "@/lib/services/versions";

/**
 * Maximum number of retry attempts for crawl jobs
 */
const MAX_CRAWL_RETRIES = 3;

/**
 * Crawl a target and store the version
 */
export const crawlTarget = inngest.createFunction(
  {
    id: "crawl-target",
    name: "Crawl Target",
    retries: MAX_CRAWL_RETRIES,
  },
  { event: "target/crawl" },
  async ({ event, step }) => {
    const { targetId, organizationId } = event.data;

    // Step 1: Fetch target from database
    const target = await step.run("fetch-target", async () => {
      const [targetRecord] = await db
        .select()
        .from(targets)
        .where(eq(targets.id, targetId))
        .limit(1);

      if (!targetRecord) {
        throw new Error(`Target ${targetId} not found`);
      }

      // Update target status and job status to "running"
      await db
        .update(targets)
        .set({
          status: "running",
          lastCrawlStatus: "running",
          lastCrawlAt: new Date(),
          lastCrawlError: null,
          updatedAt: new Date(),
        })
        .where(eq(targets.id, targetId));

      return targetRecord;
    });

    // Step 2: Crawl the URL
    const crawlResult = await step.run("crawl-url", async () => {
      try {
        const result = await crawlUrl(target.url, {
          respectRobotsTxt: true,
          includePdfs: true,
          extractPdfContent: true,
        });
        return result;
      } catch (error) {
        // Update target status and job status to "failed" on failure
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await db
          .update(targets)
          .set({
            status: "error",
            lastCrawlStatus: "failed",
            lastCrawlError: errorMessage.substring(0, 500), // Limit error message length
            updatedAt: new Date(),
          })
          .where(eq(targets.id, targetId));

        throw error;
      }
    });

    // Step 3: Store the version
    const version = await step.run("store-version", async () => {
      return storeVersion({
        targetId,
        crawlResult,
        organizationId,
      });
    });

    // Step 4: Check for changes by comparing with previous version
    await step.run("detect-changes", async () => {
      // Get the newly created version (which has the previousVersionId set)
      const newVersion = await getVersion(version.id);

      // If there's a previous version, compare hashes first
      if (newVersion?.previousVersionId) {
        const previousVersion = await getVersion(newVersion.previousVersionId);

        if (previousVersion) {
          const hasHashChanged = !compareVersionsByHash(
            previousVersion.contentHash,
            newVersion.contentHash,
          );

          if (hasHashChanged) {
            // Perform detailed diff
            await detectChanges({
              currentVersionId: newVersion.id,
              previousVersionId: previousVersion.id,
              organizationId,
              targetId,
            });
          }
        }
      }

      // Update target status and job status to "completed" on success
      await db
        .update(targets)
        .set({
          status: "active",
          lastCrawlStatus: "completed",
          lastCrawlError: null,
          updatedAt: new Date(),
        })
        .where(eq(targets.id, targetId));
    });

    return {
      success: true,
      targetId,
      versionId: version.id,
      contentHash: version.contentHash,
    };
  },
);

/**
 * Schedule crawls for all active targets based on their crawl frequency
 */
export const scheduleCrawls = inngest.createFunction(
  {
    id: "schedule-crawls",
    name: "Schedule Crawls",
  },
  { cron: "0 * * * *" }, // Run every hour
  async ({ step }) => {
    // Get all active targets that need crawling
    const targetsToCrawl = await step.run("fetch-targets", async () => {
      const activeTargets = await db
        .select()
        .from(targets)
        .where(eq(targets.status, "active"));

      const now = new Date();
      const targetsNeedingCrawl = activeTargets.filter((target) => {
        // If never crawled, schedule it
        if (!target.lastCrawlAt) {
          return true;
        }

        const hoursSinceLastCrawl =
          (now.getTime() - target.lastCrawlAt.getTime()) / (1000 * 60 * 60);

        // Check if target needs crawling based on frequency
        switch (target.crawlFrequency) {
          case "hourly":
            return hoursSinceLastCrawl >= 1;
          case "daily":
            return hoursSinceLastCrawl >= 24;
          case "weekly":
            return hoursSinceLastCrawl >= 168; // 7 days
          case "monthly":
            return hoursSinceLastCrawl >= 720; // 30 days
          default:
            return hoursSinceLastCrawl >= 24; // Default to daily
        }
      });

      return targetsNeedingCrawl;
    });

    // Send crawl events for each target
    await step.run("send-crawl-events", async () => {
      const events = targetsToCrawl.map((target) => ({
        name: "target/crawl" as const,
        data: {
          targetId: target.id,
          organizationId: target.organizationId,
        },
      }));

      // Send events - Inngest will handle queuing and execution
      // Using Promise.all for parallel sending (Inngest handles rate limiting)
      await Promise.all(events.map((event) => inngest.send(event)));

      return { eventsSent: events.length };
    });

    return {
      success: true,
      targetsScheduled: targetsToCrawl.length,
    };
  },
);

/**
 * Manually trigger a crawl for a specific target
 */
export async function triggerCrawl(targetId: string, organizationId: string) {
  await inngest.send({
    name: "target/crawl",
    data: {
      targetId,
      organizationId,
    },
  });
}
