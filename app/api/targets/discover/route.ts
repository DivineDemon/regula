import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import {
  discoverRelevantTargetsFromProfile,
  type SuggestedTarget,
} from "@/lib/services/llm";
import {
  errorResponse,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";

const discoverTargetsSchema = z.object({
  organizationId: z.string(),
});

/**
 * POST - Discover relevant targets using LLM analysis of organization profile
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = discoverTargetsSchema.parse(body);

    const _user = await requireOrgAccess(validatedData.organizationId);

    // Get organization profile
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, validatedData.organizationId))
      .limit(1);

    if (!org) {
      return errorResponse("Organization not found", 404);
    }

    if (!org.profile) {
      return errorResponse(
        "Organization profile not found. Please complete the onboarding process first.",
        400,
      );
    }

    // Call LLM service to discover targets
    let suggestedTargets: SuggestedTarget[] = [];
    try {
      suggestedTargets = await discoverRelevantTargetsFromProfile(org.profile);
    } catch (error) {
      console.error("LLM target discovery error:", error);

      // Provide user-friendly error messages based on error type
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let userMessage = "Failed to discover targets using AI.";

      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("timed out")
      ) {
        userMessage =
          "Target discovery timed out. Please try again or add targets manually.";
      } else if (
        errorMessage.includes("API key") ||
        errorMessage.includes("unauthorized")
      ) {
        userMessage = "AI service configuration error. Please contact support.";
      } else if (
        errorMessage.includes("quota") ||
        errorMessage.includes("rate limit")
      ) {
        userMessage =
          "AI service rate limit reached. Please try again in a few minutes or add targets manually.";
      } else if (errorMessage.includes("failed after")) {
        userMessage =
          "Target discovery failed after multiple attempts. Please try again later or add targets manually.";
      }

      // Return error with helpful message
      return errorResponse(userMessage, 500, {
        retryable:
          !errorMessage.includes("API key") &&
          !errorMessage.includes("unauthorized"),
        originalError:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      });
    }

    // If no targets discovered, return empty array (not an error)
    return successResponse({
      targets: suggestedTargets,
      count: suggestedTargets.length,
    });
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
    console.error("Discover targets error:", error);
    return errorResponse("Failed to discover targets. Please try again.", 500);
  }
}
