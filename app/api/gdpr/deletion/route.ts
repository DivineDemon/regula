import type { NextRequest } from "next/server";
import { z } from "zod";
import { gdprService } from "@/lib/services/gdpr";
import {
  errorResponse,
  requireAuth,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

const deletionRequestSchema = z.object({
  organizationId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { organizationId } = deletionRequestSchema.parse(body);

    // Verify user has access to organization
    await requireOrgAccess(organizationId);

    // Create deletion request
    const requestId = await gdprService.createRequest({
      userId: user.id,
      organizationId,
      requestType: "deletion",
    });

    // Process deletion (in production, you might want to queue this)
    await gdprService.updateRequestStatus(requestId, "processing");

    try {
      await gdprService.deleteUserData(user.id, organizationId);
      await gdprService.updateRequestStatus(requestId, "completed");
    } catch (error) {
      await gdprService.updateRequestStatus(requestId, "failed");
      throw error;
    }

    return successResponse({
      requestId,
      message: "Data deletion request processed successfully",
    });
  } catch (error) {
    console.error("Error processing deletion request:", error);
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request data", 400, error.issues);
    }
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
