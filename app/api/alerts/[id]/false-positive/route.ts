import type { NextRequest } from "next/server";
import { markAlertFalsePositive } from "@/lib/services/alerts";
import { createAuditLog } from "@/lib/services/audit";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

/**
 * POST - Mark alert as false positive
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: alertId } = await params;
    const body = await request.json().catch(() => ({}));
    const organizationId = body.organizationId as string | undefined;
    const reason = body.reason as string | undefined;

    if (!organizationId) {
      return errorResponse("organizationId is required", 400);
    }

    const user = await requireOrgAccess(organizationId);

    await markAlertFalsePositive(alertId, organizationId, user.id, reason);

    await createAuditLog({
      organizationId,
      userId: user.id,
      action: "alert.false_positive_marked",
      metadata: {
        alertId,
        ...(reason ? { reason } : {}),
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    if (error instanceof Error && error.message.includes("Alert not found")) {
      return errorResponse("Alert not found", 404);
    }
    console.error("Error marking alert as false positive:", error);
    return errorResponse("Internal server error", 500);
  }
}
