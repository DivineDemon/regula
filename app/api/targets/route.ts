import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations, targets } from "@/lib/db/schema";
import type { TargetCategory, TargetStatus } from "@/lib/db/schema/targets";
import { triggerCrawl } from "@/lib/inngest/functions/crawl";
import { createAuditLog } from "@/lib/services/audit";
import { quotaService } from "@/lib/services/quotas";
import { isCrawlFrequencyAllowed, type PlanType } from "@/lib/services/stripe";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

const createTargetSchema = z.object({
  organizationId: z.string(),
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

const updateTargetSchema = z.object({
  targetId: z.string(),
  organizationId: z.string(),
  url: z.url("Invalid URL format").optional(),
  label: z.string().min(1, "Label is required").optional(),
  jurisdiction: z.string().optional(),
  category: z
    .enum(["aml", "kyc", "licensing", "fees", "regulations", "other"])
    .optional(),
  crawlFrequency: z.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
  status: z.enum(["active", "pending", "error", "paused"]).optional(),
});

// GET - List all targets for an organization
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return errorResponse("Organization ID is required", 400);
    }

    const _user = await requireOrgAccess(organizationId);

    // Get all targets for the organization
    const targetsList = await db
      .select()
      .from(targets)
      .where(eq(targets.organizationId, organizationId))
      .orderBy(desc(targets.createdAt));

    return successResponse({ targets: targetsList });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Get targets error:", error);
    return errorResponse("Failed to fetch targets. Please try again.", 500);
  }
}

// POST - Create a new target
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createTargetSchema.parse(body);

    const user = await requireOrgAccess(validatedData.organizationId);

    // Check quota before creating target
    const quotaCheck = await quotaService.checkQuota({
      organizationId: validatedData.organizationId,
      action: "create_target",
    });

    if (!quotaCheck.allowed) {
      return errorResponse(quotaCheck.reason || "Quota limit reached", 403);
    }

    // Validate crawl frequency against plan limits
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, validatedData.organizationId))
      .limit(1);

    if (org) {
      const plan = org.plan as PlanType;
      if (
        !isCrawlFrequencyAllowed(
          plan,
          validatedData.crawlFrequency as
            | "hourly"
            | "daily"
            | "weekly"
            | "monthly",
        )
      ) {
        return errorResponse(
          `Your plan does not allow ${validatedData.crawlFrequency} crawl frequency. Please upgrade your plan or choose a different frequency.`,
          403,
        );
      }
    }

    // Create target
    const targetId = nanoid();
    const [newTarget] = await db
      .insert(targets)
      .values({
        id: targetId,
        organizationId: validatedData.organizationId,
        url: validatedData.url,
        label: validatedData.label,
        jurisdiction: validatedData.jurisdiction ?? null,
        category: validatedData.category ?? null,
        crawlFrequency: validatedData.crawlFrequency,
        status: "pending" as TargetStatus,
      })
      .returning();

    // Audit log
    await createAuditLog({
      organizationId: validatedData.organizationId,
      userId: user.id,
      action: "target.created",
      metadata: {
        targetId: newTarget.id,
        url: newTarget.url,
        label: newTarget.label,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    // Trigger initial crawl immediately (non-blocking)
    // This ensures the target starts monitoring right away
    // If Inngest is not configured, the scheduled crawl will pick it up
    triggerCrawl(newTarget.id, validatedData.organizationId).catch((error) => {
      // Log error but don't fail the target creation
      // The scheduled crawl will pick up pending targets that have never been crawled
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Event key not found")) {
        console.info(
          `Inngest not configured. Target ${newTarget.id} will be crawled by the next scheduled crawl.`,
        );
      } else {
        console.error(
          `Failed to trigger initial crawl for target ${newTarget.id}:`,
          error,
        );
      }
    });

    return successResponse({ target: newTarget }, 201);
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
    console.error("Create target error:", error);
    return errorResponse("Failed to create target. Please try again.", 500);
  }
}

// PATCH - Update a target
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validatedData = updateTargetSchema.parse(body);

    const user = await requireOrgAccess(validatedData.organizationId);

    // Verify target belongs to organization
    const [existingTarget] = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.id, validatedData.targetId),
          eq(targets.organizationId, validatedData.organizationId),
        ),
      )
      .limit(1);

    if (!existingTarget) {
      return errorResponse("Target not found", 404);
    }

    // Validate crawl frequency against plan limits if it's being updated
    if (validatedData.crawlFrequency !== undefined) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, validatedData.organizationId))
        .limit(1);

      if (org) {
        const plan = org.plan as PlanType;
        if (
          !isCrawlFrequencyAllowed(
            plan,
            validatedData.crawlFrequency as
              | "hourly"
              | "daily"
              | "weekly"
              | "monthly",
          )
        ) {
          return errorResponse(
            `Your plan does not allow ${validatedData.crawlFrequency} crawl frequency. Please upgrade your plan or choose a different frequency.`,
            403,
          );
        }
      }
    }

    // Track changes for audit log
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    // Update target
    const updateData: Partial<{
      url: string;
      label: string;
      jurisdiction: string | null;
      category: TargetCategory | null;
      crawlFrequency: string;
      status: TargetStatus;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (validatedData.url !== undefined) {
      previousValues.url = existingTarget.url;
      newValues.url = validatedData.url;
      updateData.url = validatedData.url;
    }
    if (validatedData.label !== undefined) {
      previousValues.label = existingTarget.label;
      newValues.label = validatedData.label;
      updateData.label = validatedData.label;
    }
    if (validatedData.jurisdiction !== undefined) {
      previousValues.jurisdiction = existingTarget.jurisdiction;
      newValues.jurisdiction = validatedData.jurisdiction ?? null;
      updateData.jurisdiction = validatedData.jurisdiction ?? null;
    }
    if (validatedData.category !== undefined) {
      previousValues.category = existingTarget.category;
      newValues.category = validatedData.category ?? null;
      updateData.category = validatedData.category ?? null;
    }
    if (validatedData.crawlFrequency !== undefined) {
      previousValues.crawlFrequency = existingTarget.crawlFrequency;
      newValues.crawlFrequency = validatedData.crawlFrequency;
      updateData.crawlFrequency = validatedData.crawlFrequency;
    }
    if (validatedData.status !== undefined) {
      previousValues.status = existingTarget.status;
      newValues.status = validatedData.status;
      updateData.status = validatedData.status;
    }

    const [updatedTarget] = await db
      .update(targets)
      .set(updateData)
      .where(eq(targets.id, validatedData.targetId))
      .returning();

    // Audit log
    await createAuditLog({
      organizationId: validatedData.organizationId,
      userId: user.id,
      action: "target.updated",
      metadata: {
        targetId: updatedTarget.id,
        previousValue: previousValues,
        newValue: newValues,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return successResponse({ target: updatedTarget });
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
    console.error("Update target error:", error);
    return errorResponse("Failed to update target. Please try again.", 500);
  }
}
