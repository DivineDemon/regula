import type { NextRequest } from "next/server";
import { z } from "zod";
import { gdprService } from "@/lib/services/gdpr";
import {
  errorResponse,
  requireAuth,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

const exportRequestSchema = z.object({
  organizationId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { organizationId } = exportRequestSchema.parse(body);

    // Verify user has access to organization
    await requireOrgAccess(organizationId);

    // Create export request
    const requestId = await gdprService.createRequest({
      userId: user.id,
      organizationId,
      requestType: "export",
    });

    // Process export
    await gdprService.updateRequestStatus(requestId, "processing");

    try {
      const exportData = await gdprService.exportUserData(
        user.id,
        organizationId,
      );

      // In production, you would:
      // 1. Generate a file (JSON/CSV)
      // 2. Upload to S3 or similar
      // 3. Generate a signed URL with expiration
      // For now, we'll return the data directly (not recommended for large datasets)

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      await gdprService.updateRequestStatus(requestId, "completed", {
        expiresAt,
      });

      return successResponse({
        requestId,
        data: exportData,
        expiresAt: expiresAt.toISOString(),
        message: "Data export generated successfully",
      });
    } catch (error) {
      await gdprService.updateRequestStatus(requestId, "failed");
      throw error;
    }
  } catch (error) {
    console.error("Error processing export request:", error);
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request data", 400, error.issues);
    }
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
