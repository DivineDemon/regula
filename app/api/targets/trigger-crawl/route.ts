import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { targets } from "@/lib/db/schema";
import { triggerCrawl } from "@/lib/inngest/functions/crawl";
import {
  errorResponse,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

// POST - Trigger a crawl for a target
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetId, organizationId } = body;

    if (!targetId || !organizationId) {
      return errorResponse("Target ID and Organization ID are required", 400);
    }

    const _user = await requireOrgAccess(organizationId);

    // Verify target belongs to organization
    const [target] = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.id, targetId),
          eq(targets.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!target) {
      return errorResponse("Target not found", 404);
    }

    // Trigger crawl
    try {
      await triggerCrawl(targetId, organizationId);
      return successResponse({ message: "Crawl triggered successfully" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // If Inngest is not configured, still return success (scheduled crawl will pick it up)
      if (
        errorMessage.includes("Event key not found") ||
        errorMessage.includes("401")
      ) {
        return successResponse({
          message:
            "Crawl will be picked up by scheduled crawls. Inngest is not configured.",
        });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Trigger crawl error:", error);
    return errorResponse("Failed to trigger crawl. Please try again.", 500);
  }
}
