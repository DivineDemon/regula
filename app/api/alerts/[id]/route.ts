import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  addAlertComment,
  assignAlertToUsers,
  getAlertWithDetails,
  updateAlertStatus,
} from "@/lib/services/alerts";
import { createAuditLog } from "@/lib/services/audit";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

const updateAlertSchema = z.object({
  organizationId: z.string(),
  status: z.enum(["new", "triaged", "actioned", "closed"]).optional(),
  assignTo: z.array(z.string()).optional(),
  comment: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    await requireOrgAccess(organizationId);

    const alert = await getAlertWithDetails(id, organizationId);

    if (!alert) {
      return errorResponse("Alert not found", 404);
    }

    return successResponse(alert);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Error fetching alert:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAlertSchema.parse(body);

    const user = await requireOrgAccess(validatedData.organizationId);

    // Update status if provided
    if (validatedData.status) {
      const previousAlert = await getAlertWithDetails(
        id,
        validatedData.organizationId,
      );
      const updated = await updateAlertStatus(
        id,
        validatedData.organizationId,
        validatedData.status,
      );
      if (!updated) {
        return errorResponse("Alert not found", 404);
      }

      // Audit log for status change
      await createAuditLog({
        organizationId: validatedData.organizationId,
        userId: user.id,
        action: "alert.status_changed",
        metadata: {
          alertId: id,
          previousValue: previousAlert?.alert.status,
          newValue: validatedData.status,
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
        },
      });
    }

    // Assign to users if provided
    if (validatedData.assignTo && validatedData.assignTo.length > 0) {
      await assignAlertToUsers(
        id,
        validatedData.organizationId,
        validatedData.assignTo,
      );

      // Audit log for assignment
      await createAuditLog({
        organizationId: validatedData.organizationId,
        userId: user.id,
        action: "alert.assigned",
        metadata: {
          alertId: id,
          assignedTo: validatedData.assignTo,
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
        },
      });
    }

    // Add comment if provided
    if (validatedData.comment) {
      await addAlertComment(
        id,
        validatedData.organizationId,
        user.id,
        validatedData.comment,
      );

      // Audit log for comment
      await createAuditLog({
        organizationId: validatedData.organizationId,
        userId: user.id,
        action: "alert.comment_added",
        metadata: {
          alertId: id,
          ipAddress: getClientIp(request),
          userAgent: getUserAgent(request),
        },
      });
    }

    // Return updated alert
    const alert = await getAlertWithDetails(id, validatedData.organizationId);

    return successResponse(alert);
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
    console.error("Error updating alert:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
