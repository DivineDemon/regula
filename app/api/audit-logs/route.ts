import type { NextRequest } from "next/server";
import { z } from "zod";
import { type AuditAction, getAuditLogs } from "@/lib/services/audit";
import {
  errorResponse,
  requireAuth,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";
import { isOrganizationAdmin } from "@/lib/utils/organization";

const getAuditLogsSchema = z.object({
  organizationId: z.string(),
  userId: z.string().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const params = {
      organizationId: searchParams.get("organizationId") || "",
      userId: searchParams.get("userId") || undefined,
      action: searchParams.get("action") || undefined,
      limit: searchParams.get("limit") || "100",
      offset: searchParams.get("offset") || "0",
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    const validatedData = getAuditLogsSchema.parse(params);

    // Verify user has access to organization
    await requireOrgAccess(validatedData.organizationId);

    // Only admins can view audit logs
    const isAdmin = await isOrganizationAdmin(
      user.id,
      validatedData.organizationId,
    );

    if (!isAdmin) {
      return errorResponse("Admin access required", 403);
    }

    const logs = await getAuditLogs({
      organizationId: validatedData.organizationId,
      userId: validatedData.userId,
      action: validatedData.action as AuditAction | undefined,
      limit: validatedData.limit,
      offset: validatedData.offset,
      dateFrom: validatedData.dateFrom
        ? new Date(validatedData.dateFrom)
        : undefined,
      dateTo: validatedData.dateTo ? new Date(validatedData.dateTo) : undefined,
    });

    return successResponse(logs);
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
    console.error("Error fetching audit logs:", error);
    return errorResponse("Internal server error", 500);
  }
}
