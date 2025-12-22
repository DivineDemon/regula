import type { NextRequest } from "next/server";
import { z } from "zod";
import { consentService } from "@/lib/services/consent";
import {
  errorResponse,
  requireAuth,
  successResponse,
} from "@/lib/utils/api-helpers";

const grantConsentSchema = z.object({
  consentType: z.enum([
    "marketing_emails",
    "analytics",
    "cookies",
    "data_processing",
  ]),
  consentVersion: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const withdrawConsentSchema = z.object({
  consentType: z.enum([
    "marketing_emails",
    "analytics",
    "cookies",
    "data_processing",
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { consentType, consentVersion, metadata } =
      grantConsentSchema.parse(body);

    const consentId = await consentService.grantConsent({
      userId: user.id,
      consentType,
      consentVersion,
      metadata,
    });

    return successResponse({
      consentId,
      message: "Consent granted successfully",
    });
  } catch (error) {
    console.error("Error granting consent:", error);
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request data", 400, error.issues);
    }
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const consentType = searchParams.get("consentType");

    if (!consentType) {
      return errorResponse("consentType is required", 400);
    }

    const validated = withdrawConsentSchema.parse({ consentType });

    await consentService.withdrawConsent({
      userId: user.id,
      consentType: validated.consentType,
    });

    return successResponse({
      message: "Consent withdrawn successfully",
    });
  } catch (error) {
    console.error("Error withdrawing consent:", error);
    if (error instanceof z.ZodError) {
      return errorResponse("Invalid request data", 400, error.issues);
    }
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const user = await requireAuth();

    const consents = await consentService.getUserConsents(user.id);

    return successResponse({ consents });
  } catch (error) {
    console.error("Error fetching consents:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
    );
  }
}
