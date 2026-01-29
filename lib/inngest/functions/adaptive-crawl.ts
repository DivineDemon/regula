import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, targets } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import {
  adaptiveCrawlTarget,
  type GraphDiff,
} from "@/lib/services/adaptive-crawl";
import { generateAlert } from "@/lib/services/alerts";
import type { ChangeType, DiffMetadata } from "@/lib/services/diff";
import { getLatestVersion, getPreviousVersion } from "@/lib/services/versions";

/**
 * Background adaptive crawl function
 * Runs adaptive content discovery and crawling without blocking the main crawl
 */
export const adaptiveCrawlBackground = inngest.createFunction(
  {
    id: "adaptive-crawl-background",
    name: "Adaptive Crawl Background",
    retries: 2, // Fewer retries since this is background work
  },
  { event: "target/adaptive-crawl" },
  async ({ event, step }) => {
    const { targetId, organizationId, targetUrl, targetConfig } = event.data;

    // Wrap in try-catch to handle errors gracefully
    try {
      // Step 1: Fetch target
      const target = await step.run("fetch-target", async () => {
        const [targetRecord] = await db
          .select()
          .from(targets)
          .where(eq(targets.id, targetId))
          .limit(1);

        if (!targetRecord) {
          throw new Error(`Target ${targetId} not found`);
        }

        return targetRecord;
      });

      // Step 2: Run adaptive crawl
      const adaptiveResult = await step.run("adaptive-crawl", async () => {
        return await adaptiveCrawlTarget({
          targetId,
          organizationId,
          targetUrl,
          targetConfig,
        });
      });

      if (!adaptiveResult.success) {
        console.warn(
          `Adaptive crawl completed but was not successful for target ${targetId}`,
        );
        return { success: false, targetId };
      }

      // Step 3: Check for changes and generate alerts if needed
      if (adaptiveResult.changesDetected && adaptiveResult.graphDiff) {
        await step.run("check-graph-changes", async () => {
          const graphDiff = adaptiveResult.graphDiff as unknown as GraphDiff;
          const hasNewFiles = graphDiff.addedNodes.length > 0;
          const hasModifiedFiles = graphDiff.modifiedNodes.length > 0;
          const hasRemovedFiles = graphDiff.removedNodes.length > 0;

          if (hasNewFiles || hasModifiedFiles || hasRemovedFiles) {
            // Get organization for alert generation
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

            // Create synthetic diff metadata for graph changes
            const changeTypes: ChangeType[] = [];
            if (hasNewFiles) changeTypes.push("attachment_added");
            if (hasModifiedFiles) changeTypes.push("modified");
            if (hasRemovedFiles) changeTypes.push("attachment_removed");

            // Helper function to extract filename from URL
            function extractFilenameFromUrl(url: string): string {
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

            const diffMetadata: DiffMetadata = {
              hasChanges: true,
              changeTypes,
              structuralChanges: [] as DiffMetadata["structuralChanges"],
              attachmentChanges: [
                ...graphDiff.addedNodes
                  .filter((n: { type: string }) => n.type === "pdf")
                  .map((n: { url: string }) => ({
                    url: n.url,
                    filename: extractFilenameFromUrl(n.url),
                    action: "added" as const,
                  })),
                ...graphDiff.modifiedNodes
                  .filter(
                    (n: { node: { type: string } }) => n.node.type === "pdf",
                  )
                  .map((n: { node: { url: string } }) => ({
                    url: n.node.url,
                    filename: extractFilenameFromUrl(n.node.url),
                    action: "modified" as const,
                  })),
                ...graphDiff.removedNodes
                  .filter((n: { type: string }) => n.type === "pdf")
                  .map((n: { url: string }) => ({
                    url: n.url,
                    filename: extractFilenameFromUrl(n.url),
                    action: "removed" as const,
                  })),
              ],
              affectedSections: [],
            };

            // Generate alert for graph-based changes
            try {
              // Resolve real version IDs for the target before generating alert
              const latestVersion = await getLatestVersion(
                targetId,
                organizationId,
              );

              if (!latestVersion) {
                console.warn(
                  `No versions found for target ${targetId} when generating adaptive crawl alert. Skipping alert generation.`,
                );
                return;
              }

              const previousVersion = await getPreviousVersion(
                latestVersion.id,
                organizationId,
              );

              const alert = await generateAlert({
                organizationId,
                targetId,
                currentVersionId: latestVersion.id,
                previousVersionId: previousVersion?.id ?? latestVersion.id,
                diffMetadata,
                target,
                organization,
              });

              console.log(
                `Generated alert ${alert.id} from adaptive crawl for target ${targetId}`,
              );
            } catch (error) {
              console.error(
                "Error generating alert from adaptive crawl:",
                error,
              );
            }
          }
        });
      }

      return {
        success: true,
        targetId,
        versionsCreated: adaptiveResult.versionsCreated,
        changesDetected: adaptiveResult.changesDetected,
      };
    } catch (error) {
      // Log error but don't update target status (main crawl handles that)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Background adaptive crawl failed for target ${targetId}:`,
        errorMessage,
      );

      // Re-throw so Inngest can retry if configured
      throw error;
    }
  },
);
