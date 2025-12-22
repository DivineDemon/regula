import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, targets } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { shouldRefreshContentGraph } from "@/lib/services/adaptive-crawl";
import { generateAlert } from "@/lib/services/alerts";
import { detectChanges } from "@/lib/services/diff";
import type { CrawlResult } from "@/lib/services/firecrawl";
import { crawlUrl } from "@/lib/services/firecrawl";
import { getVersion, storeVersion } from "@/lib/services/versions";

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

    // Wrap entire function in try-catch to ensure target status is updated on any error
    try {
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

      // Step 2: Check if we should use adaptive discovery
      const useAdaptiveDiscovery = await step.run(
        "check-adaptive-discovery",
        async () => {
          try {
            // Use adaptive discovery on first crawl or if graph needs refresh
            return shouldRefreshContentGraph(targetId);
          } catch (error) {
            // If check fails (e.g., table doesn't exist), log and default to false
            console.warn(
              "Failed to check if content graph needs refresh, defaulting to simple crawl:",
              error,
            );
            return false;
          }
        },
      );

      let crawlResult: CrawlResult | undefined;

      if (useAdaptiveDiscovery) {
        // Trigger adaptive crawl as a separate background job (non-blocking)
        // This prevents timeout issues while still discovering content
        await step.run("trigger-adaptive-crawl", async () => {
          try {
            await inngest.send({
              name: "target/adaptive-crawl",
              data: {
                targetId,
                organizationId,
                targetUrl: target.url,
                targetConfig: {
                  url: target.url,
                  label: target.label,
                  jurisdiction: target.jurisdiction || undefined,
                  category: target.category || undefined,
                },
              },
            });
            console.log(
              `Triggered background adaptive crawl for target ${targetId}`,
            );
            return { triggered: true };
          } catch (error) {
            console.error(
              "Failed to trigger adaptive crawl, continuing with simple crawl:",
              error,
            );
            // Don't fail the main crawl if adaptive crawl trigger fails
            return { triggered: false };
          }
        });
      }

      // Always crawl the main URL (adaptive crawl runs in background)
      if (!crawlResult) {
        crawlResult = await step.run("crawl-url", async () => {
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
      }

      // Step 3: Store the version
      const version = await step.run("store-version", async () => {
        return storeVersion({
          targetId,
          crawlResult,
          organizationId,
        });
      });

      // Step 4: Check for changes
      // Note: Adaptive crawl runs in background, so we only do traditional change detection here
      // Graph-based changes will be detected by the background adaptive crawl function
      const changeDetectionResult = await step.run(
        "detect-changes",
        async () => {
          // Use traditional version-based change detection
          const newVersion = await getVersion(version.id, organizationId);

          if (!newVersion) {
            console.error(
              `Failed to retrieve new version ${version.id} for change detection`,
            );
            return {
              hasChanges: false,
              diffMetadata: null,
              currentVersionId: null,
              previousVersionId: null,
              graphBased: false,
            };
          }

          console.log(
            `Change detection for target ${targetId}: newVersion.id=${newVersion.id}, previousVersionId=${newVersion.previousVersionId}`,
          );

          // If there's a previous version, compare hashes first
          if (newVersion.previousVersionId) {
            const previousVersion = await getVersion(
              newVersion.previousVersionId,
              organizationId,
            );

            if (!previousVersion) {
              console.warn(
                `Previous version ${newVersion.previousVersionId} not found for target ${targetId}`,
              );
              return {
                hasChanges: false,
                diffMetadata: null,
                currentVersionId: null,
                previousVersionId: null,
                graphBased: false,
              };
            }

            const hasHashChanged =
              previousVersion.contentHash !== newVersion.contentHash;

            console.log(
              `Hash comparison for target ${targetId}: previousHash=${previousVersion.contentHash.substring(
                0,
                8,
              )}..., newHash=${newVersion.contentHash.substring(
                0,
                8,
              )}..., hasChanged=${hasHashChanged}`,
            );

            if (hasHashChanged) {
              console.log(
                `Content hash changed for target ${targetId}, performing detailed diff`,
              );
              // Perform detailed diff
              const diffMetadata = await detectChanges({
                currentVersionId: newVersion.id,
                previousVersionId: previousVersion.id,
                organizationId,
                targetId,
              });

              console.log(
                `Diff completed for target ${targetId}: hasChanges=${
                  diffMetadata.hasChanges
                }, changeTypes=${diffMetadata.changeTypes.join(", ")}`,
              );

              // Return diff metadata for alert generation
              return {
                hasChanges: true,
                diffMetadata,
                currentVersionId: newVersion.id,
                previousVersionId: previousVersion.id,
                graphBased: false,
              };
            } else {
              console.log(
                `No hash change detected for target ${targetId}, skipping diff`,
              );
            }
          } else {
            console.log(
              `No previous version for target ${targetId} (first crawl), skipping change detection`,
            );
          }

          return {
            hasChanges: false,
            diffMetadata: null,
            currentVersionId: null,
            previousVersionId: null,
            graphBased: false,
          };
        },
      );

      // Helper function to extract filename from URL
      function _extractFilenameFromUrl(url: string): string {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const filename = pathname.split("/").pop() || "document";
          return decodeURIComponent(filename);
        } catch {
          const parts = url.split("/");
          return parts[parts.length - 1] || "document";
        }
      }

      // Step 5: Generate alert if changes were detected
      console.log(
        `Alert generation check for target ${targetId}: hasChanges=${
          changeDetectionResult.hasChanges
        }, hasDiffMetadata=${!!changeDetectionResult.diffMetadata}, hasCurrentVersionId=${!!changeDetectionResult.currentVersionId}`,
      );

      if (
        changeDetectionResult.hasChanges &&
        changeDetectionResult.diffMetadata &&
        (changeDetectionResult.currentVersionId ||
          changeDetectionResult.graphBased)
      ) {
        await step.run("generate-alert", async () => {
          console.log(
            `Generating alert for target ${targetId} with changes detected`,
          );
          // Get organization record
          const [organization] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

          if (!organization) {
            console.error(
              `Organization ${organizationId} not found for alert generation`,
            );
            return;
          }

          // Generate alert using AI summarization and impact scoring
          try {
            // For graph-based changes, we need to create a version for the alert system
            // Use the main URL version or create a synthetic one
            let currentVersionId = changeDetectionResult.currentVersionId;
            let previousVersionId = changeDetectionResult.previousVersionId;

            if (changeDetectionResult.graphBased && !currentVersionId) {
              // Use the main URL version
              const mainVersion = await getVersion(version.id, organizationId);
              currentVersionId = mainVersion?.id || version.id;
              previousVersionId = mainVersion?.previousVersionId || version.id;
            }

            if (!currentVersionId) {
              currentVersionId = version.id;
            }

            if (!previousVersionId) {
              previousVersionId = version.id;
            }

            const alert = await generateAlert({
              organizationId,
              targetId,
              currentVersionId,
              previousVersionId,
              diffMetadata: changeDetectionResult.diffMetadata,
              target,
              organization,
            });

            console.log(
              `Alert generated successfully for target ${targetId}: alertId=${alert.id}, impactScore=${alert.impactScore}`,
            );

            return { alertId: alert.id, impactScore: alert.impactScore };
          } catch (error) {
            console.error("Error generating alert:", error);
            // Don't fail the crawl job if alert generation fails
            // The change is still detected and stored in the version
            return {
              error: error instanceof Error ? error.message : String(error),
            };
          }
        });
      }

      // Update target status and job status to "completed" on success
      await step.run("update-target-status", async () => {
        await db
          .update(targets)
          .set({
            status: "active",
            lastCrawlStatus: "completed",
            lastCrawlAt: new Date(), // Update to reflect completion time
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
    } catch (error) {
      // Catch any unhandled errors and update target status
      // This ensures the target status is always updated even if an error occurs
      // in a step that doesn't have explicit error handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await step.run("update-target-on-error", async () => {
        try {
          await db
            .update(targets)
            .set({
              status: "error",
              lastCrawlStatus: "failed",
              lastCrawlError: errorMessage.substring(0, 500),
              updatedAt: new Date(),
            })
            .where(eq(targets.id, targetId));
        } catch (updateError) {
          console.error(
            `Failed to update target status on crawl failure: ${targetId}`,
            updateError,
          );
        }
      });

      // Re-throw the error so Inngest can handle retries
      throw error;
    }
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
    // Get all active targets and pending targets that have never been crawled
    const targetsToCrawl = await step.run("fetch-targets", async () => {
      const allTargets = await db
        .select()
        .from(targets)
        .where(
          or(
            eq(targets.status, "active"),
            // Include pending targets that have never been crawled (fallback for initial crawl)
            and(eq(targets.status, "pending"), isNull(targets.lastCrawlAt)),
          ),
        );

      const now = new Date();
      const targetsNeedingCrawl = allTargets.filter((target) => {
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
 *
 * Note: When running locally with production Inngest, the event will be sent
 * but the function may not execute because Inngest can't reach your local
 * /api/inngest endpoint. In this case, the scheduled crawl (runs every hour)
 * will pick up pending targets as a fallback.
 */
export async function triggerCrawl(targetId: string, organizationId: string) {
  try {
    console.log(`Triggering crawl for target ${targetId}`);
    const result = await inngest.send({
      name: "target/crawl",
      data: {
        targetId,
        organizationId,
      },
    });
    console.log(
      `Crawl event sent successfully for target ${targetId}. Event ID: ${
        result.ids?.[0] || "unknown"
      }`,
    );
    console.log(
      `Note: If running locally, the function may not execute immediately. The scheduled crawl will pick up pending targets.`,
    );
    return result;
  } catch (error) {
    // Log detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`Failed to trigger crawl for target ${targetId}:`, {
      error: errorMessage,
      stack: errorStack,
      eventKey: process.env.INNGEST_EVENT_KEY ? "present" : "missing",
    });

    // If Inngest is not configured (e.g., in development), log and re-throw
    // The caller should handle this gracefully
    if (
      errorMessage.includes("Event key not found") ||
      errorMessage.includes("401")
    ) {
      console.warn(
        `Inngest not configured. Crawl for target ${targetId} will be picked up by scheduled crawls.`,
      );
    }
    throw error;
  }
}
