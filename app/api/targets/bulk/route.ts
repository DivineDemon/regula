import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, targets } from "@/lib/db/schema";
import type { TargetCategory, TargetStatus } from "@/lib/db/schema/targets";
import { triggerCrawl } from "@/lib/inngest/functions/crawl";
import {
  isCrawlFrequencyAllowed,
  PLAN_CONFIGS,
  type PlanType,
} from "@/lib/plans";
import { createAuditLog } from "@/lib/services/audit";
import { quotaService } from "@/lib/services/quotas";
import { usageService } from "@/lib/services/usage";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

const targetInputSchema = z.object({
  url: z.url("Invalid URL format"),
  label: z.string().min(1, "Label is required"),
  jurisdiction: z.string().optional(),
  category: z
    .enum(["aml", "kyc", "licensing", "fees", "regulations", "other"])
    .optional(),
  crawlFrequency: z
    .enum(["hourly", "daily", "weekly", "monthly"])
    .default("daily"),
});

const bulkCreateTargetsSchema = z.object({
  organizationId: z.string(),
  targets: z
    .array(targetInputSchema)
    .min(1, "At least one target is required")
    .max(100, "Cannot create more than 100 targets at once"),
});

/**
 * POST - Create multiple targets in bulk
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = bulkCreateTargetsSchema.parse(body);

    const user = await requireOrgAccess(validatedData.organizationId);

    // Get organization to check plan limits
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, validatedData.organizationId))
      .limit(1);

    if (!org) {
      return errorResponse("Organization not found", 404);
    }

    const plan = org.plan as PlanType;
    const planConfig = PLAN_CONFIGS[plan];

    // Check quota before creating targets
    // Get current target count and check if adding new targets would exceed limit
    const currentTargetCount = await usageService.getTargetCount(
      validatedData.organizationId,
    );
    const targetCountAfterCreation =
      currentTargetCount + validatedData.targets.length;

    if (
      planConfig.targets !== Infinity &&
      targetCountAfterCreation > planConfig.targets
    ) {
      return errorResponse(
        `Cannot create ${validatedData.targets.length} targets. Your plan allows up to ${planConfig.targets} targets, and you currently have ${currentTargetCount}. Please upgrade your plan or reduce the number of targets.`,
        403,
      );
    }

    // Also check individual quota (for any other validations)
    // For bulk operations, we check once but the individual checkQuota doesn't support count
    // So we do the manual check above and then verify with checkQuota
    const quotaCheck = await quotaService.checkQuota({
      organizationId: validatedData.organizationId,
      action: "create_target",
    });

    if (!quotaCheck.allowed) {
      return errorResponse(quotaCheck.reason || "Quota limit reached", 403);
    }

    // Validate crawl frequencies against plan limits
    const invalidFrequencies: string[] = [];
    for (const target of validatedData.targets) {
      if (
        !isCrawlFrequencyAllowed(
          plan,
          target.crawlFrequency as "hourly" | "daily" | "weekly" | "monthly",
        )
      ) {
        invalidFrequencies.push(`${target.label}: ${target.crawlFrequency}`);
      }
    }

    if (invalidFrequencies.length > 0) {
      return errorResponse(
        `Your plan does not allow the following crawl frequencies: ${invalidFrequencies.join(", ")}. Please upgrade your plan or adjust the frequencies.`,
        403,
      );
    }

    // Create targets in a transaction
    const createdTargets: Array<{
      id: string;
      url: string;
      label: string;
      jurisdiction: string | null;
      category: TargetCategory | null;
      crawlFrequency: string;
      status: TargetStatus;
      organizationId: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    const errors: Array<{ target: unknown; error: string }> = [];

    // Process targets one by one to handle individual failures gracefully
    for (const targetInput of validatedData.targets) {
      try {
        const targetId = nanoid();
        const [newTarget] = await db
          .insert(targets)
          .values({
            id: targetId,
            organizationId: validatedData.organizationId,
            url: targetInput.url,
            label: targetInput.label,
            jurisdiction: targetInput.jurisdiction ?? null,
            category: targetInput.category ?? null,
            crawlFrequency: targetInput.crawlFrequency,
            status: "pending" as TargetStatus,
          })
          .returning();

        createdTargets.push(newTarget);

        // Trigger initial crawl (non-blocking)
        triggerCrawl(newTarget.id, validatedData.organizationId).catch(
          (error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes("Event key not found")) {
              console.error(
                `Failed to trigger initial crawl for target ${newTarget.id}:`,
                error,
              );
            }
          },
        );
      } catch (error) {
        errors.push({
          target: targetInput,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    // Audit log for bulk creation
    if (createdTargets.length > 0) {
      await createAuditLog({
        organizationId: validatedData.organizationId,
        userId: user.id,
        action: "target.created",
        metadata: {
          bulk: true,
          count: createdTargets.length,
          targetIds: createdTargets.map((t) => t.id),
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
        },
      });
    }

    // Return results with partial success information
    return successResponse(
      {
        created: createdTargets,
        createdCount: createdTargets.length,
        failedCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      createdTargets.length > 0 ? 201 : 400,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse("Validation error", 400, error.issues);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Bulk create targets error:", error);
    return errorResponse("Failed to create targets. Please try again.", 500);
  }
}
