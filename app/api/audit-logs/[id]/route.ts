import type { NextRequest } from "next/server";
import { getAuditLogById } from "@/lib/services/audit";
import {
  errorResponse,
  requireAuth,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";
import { isOrganizationAdmin } from "@/lib/utils/organization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return errorResponse("Organization ID is required", 400);
    }

    // Verify user has access to organization
    await requireOrgAccess(organizationId);

    // Only admins can view audit logs
    const isAdmin = await isOrganizationAdmin(user.id, organizationId);

    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    const log = await getAuditLogById(id, organizationId);

    if (!log) {
      return errorResponse("Audit log not found", 404);
    }

    return successResponse(log);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Error fetching audit log:", error);
    return errorResponse("Internal server error", 500);
  }
}
