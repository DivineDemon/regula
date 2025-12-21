import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, targets } from "@/lib/db/schema";

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

// GET - Get a single target
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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

    // Get target
    const [target] = await db
      .select()
      .from(targets)
      .where(
        and(eq(targets.id, id), eq(targets.organizationId, organizationId)),
      )
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    return NextResponse.json({ target }, { status: 200 });
  } catch (error) {
    console.error("Get target error:", error);
    return NextResponse.json(
      { error: "Failed to fetch target. Please try again." },
      { status: 500 },
    );
  }
}

// DELETE - Soft delete a target (set status to paused, or we can add a deletedAt field later)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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

    // Verify target belongs to organization
    const [existingTarget] = await db
      .select()
      .from(targets)
      .where(
        and(eq(targets.id, id), eq(targets.organizationId, organizationId)),
      )
      .limit(1);

    if (!existingTarget) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    // Soft delete: set status to paused (or we can add a deletedAt field later)
    // For now, we'll actually delete it since the schema doesn't have deletedAt
    // In production, you might want to add a deletedAt timestamp field
    await db.delete(targets).where(eq(targets.id, id));

    return NextResponse.json(
      { message: "Target deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete target error:", error);
    return NextResponse.json(
      { error: "Failed to delete target. Please try again." },
      { status: 500 },
    );
  }
}
