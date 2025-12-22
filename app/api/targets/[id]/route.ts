import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { targets } from "@/lib/db/schema";
import { createAuditLog } from "@/lib/services/audit";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

// GET - Get a single target
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return errorResponse("Organization ID is required", 400);
    }

    await requireOrgAccess(organizationId);

    // Get target
    const [target] = await db
      .select()
      .from(targets)
      .where(
        and(eq(targets.id, id), eq(targets.organizationId, organizationId)),
      )
      .limit(1);

    if (!target) {
      return errorResponse("Target not found", 404);
    }

    return successResponse({ target });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Get target error:", error);
    return errorResponse("Failed to fetch target. Please try again.", 500);
  }
}

// DELETE - Delete a target
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return errorResponse("Organization ID is required", 400);
    }

    const user = await requireOrgAccess(organizationId);

    // Verify target belongs to organization
    const [existingTarget] = await db
      .select()
      .from(targets)
      .where(
        and(eq(targets.id, id), eq(targets.organizationId, organizationId)),
      )
      .limit(1);

    if (!existingTarget) {
      return errorResponse("Target not found", 404);
    }

    // Delete target
    await db.delete(targets).where(eq(targets.id, id));

    // Audit log
    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "target.deleted",
      metadata: {
        targetId: id,
        url: existingTarget.url,
        label: existingTarget.label,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return successResponse({ message: "Target deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Delete target error:", error);
    return errorResponse("Failed to delete target. Please try again.", 500);
  }
}
