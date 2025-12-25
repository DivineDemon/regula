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

      // Convert export data to JSON string
      const exportJson = JSON.stringify(exportData, null, 2);
      const exportBuffer = Buffer.from(exportJson, "utf-8");

      // Determine if we should use S3 (for large datasets) or return directly (for small datasets)
      // Threshold: 1MB (1048576 bytes)
      const LARGE_DATASET_THRESHOLD = 1048576;
      const useS3 = exportBuffer.length > LARGE_DATASET_THRESHOLD;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      if (useS3) {
        // Upload to S3 and generate signed URL
        const { storage } = await import("@/lib/services/s3");
        const s3Key = `gdpr-exports/${organizationId}/${requestId}.json`;

        const uploadSuccess = await storage.upload(
          s3Key,
          exportBuffer,
          "application/json",
          {
            userId: user.id,
            organizationId,
            requestId,
            createdAt: new Date().toISOString(),
          },
        );

        if (!uploadSuccess) {
          throw new Error("Failed to upload export to storage");
        }

        // Generate presigned URL (valid for 7 days)
        const signedUrl = await storage.getPresignedUrl(
          s3Key,
          7 * 24 * 60 * 60, // 7 days in seconds
        );

        if (!signedUrl) {
          throw new Error("Failed to generate signed URL");
        }

        await gdprService.updateRequestStatus(requestId, "completed", {
          expiresAt,
          exportUrl: signedUrl,
        });

        return successResponse({
          requestId,
          downloadUrl: signedUrl,
          expiresAt: expiresAt.toISOString(),
          message:
            "Data export generated successfully. Download URL expires in 7 days.",
        });
      } else {
        // For small datasets, return data directly
        await gdprService.updateRequestStatus(requestId, "completed", {
          expiresAt,
        });

        return successResponse({
          requestId,
          data: exportData,
          expiresAt: expiresAt.toISOString(),
          message: "Data export generated successfully",
        });
      }
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
