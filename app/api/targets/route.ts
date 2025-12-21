import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, targets } from "@/lib/db/schema";
import type { TargetCategory, TargetStatus } from "@/lib/db/schema/targets";
import { triggerCrawl } from "@/lib/inngest/functions/crawl";

const createTargetSchema = z.object({
  organizationId: z.string(),
  url: z.string().url("Invalid URL format"),
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
  url: z.string().url("Invalid URL format").optional(),
  label: z.string().min(1, "Label is required").optional(),
  jurisdiction: z.string().optional(),
  category: z
    .enum(["aml", "kyc", "licensing", "fees", "regulations", "other"])
    .optional(),
  crawlFrequency: z.enum(["hourly", "daily", "weekly", "monthly"]).optional(),
  status: z.enum(["active", "pending", "error", "paused"]).optional(),
});

// Helper function to verify user has access to organization
async function verifyOrganizationAccess(
  userId: string,
  organizationId: string,
) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  return !!member;
}

// GET - List all targets for an organization
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user has access to organization
    const hasAccess = await verifyOrganizationAccess(
      session.user.id,
      organizationId,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 },
      );
    }

    // Get all targets for the organization
    const targetsList = await db
      .select()
      .from(targets)
      .where(eq(targets.organizationId, organizationId))
      .orderBy(desc(targets.createdAt));

    return NextResponse.json({ targets: targetsList }, { status: 200 });
  } catch (error) {
    console.error("Get targets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch targets. Please try again." },
      { status: 500 },
    );
  }
}

// POST - Create a new target
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createTargetSchema.parse(body);

    // Verify user has access to organization
    const hasAccess = await verifyOrganizationAccess(
      session.user.id,
      validatedData.organizationId,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 },
      );
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

    return NextResponse.json({ target: newTarget }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Create target error:", error);
    return NextResponse.json(
      { error: "Failed to create target. Please try again." },
      { status: 500 },
    );
  }
}

// PATCH - Update a target
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTargetSchema.parse(body);

    // Verify user has access to organization
    const hasAccess = await verifyOrganizationAccess(
      session.user.id,
      validatedData.organizationId,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 },
      );
    }

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
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

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

    if (validatedData.url !== undefined) updateData.url = validatedData.url;
    if (validatedData.label !== undefined)
      updateData.label = validatedData.label;
    if (validatedData.jurisdiction !== undefined)
      updateData.jurisdiction = validatedData.jurisdiction ?? null;
    if (validatedData.category !== undefined)
      updateData.category = validatedData.category ?? null;
    if (validatedData.crawlFrequency !== undefined)
      updateData.crawlFrequency = validatedData.crawlFrequency;
    if (validatedData.status !== undefined)
      updateData.status = validatedData.status;

    const [updatedTarget] = await db
      .update(targets)
      .set(updateData)
      .where(eq(targets.id, validatedData.targetId))
      .returning();

    return NextResponse.json({ target: updatedTarget }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Update target error:", error);
    return NextResponse.json(
      { error: "Failed to update target. Please try again." },
      { status: 500 },
    );
  }
}
