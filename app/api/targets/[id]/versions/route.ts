import type { NextRequest } from "next/server";
import { getVersionHistory } from "@/lib/services/versions";
import {
  errorResponse,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

/**
 * GET /api/targets/[id]/versions
 * List version history for a target (related versions / version family view).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetId } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") ?? "15", 10)),
    );

    if (!organizationId) {
      return errorResponse("Organization ID is required", 400);
    }

    await requireOrgAccess(organizationId);

    const versions = await getVersionHistory(targetId, organizationId, limit);

    return successResponse({
      versions: versions.map((v) => ({
        id: v.id,
        targetId: v.targetId,
        contentHash: v.contentHash,
        crawledAt: v.crawledAt,
        previousVersionId: v.previousVersionId,
        hasChanges: v.hasChanges,
        metadata: v.metadata,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Get target versions error:", error);
    return errorResponse("Failed to fetch version history.", 500);
  }
}
