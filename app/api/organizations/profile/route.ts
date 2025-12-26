import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { createAuditLog } from "@/lib/services/audit";
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import {
  errorResponse,
  getClientIp,
  getUserAgent,
  requireOrgAccess,
  successResponse,
} from "@/lib/utils/api-helpers";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

const _getProfileSchema = z.object({
  organizationId: z.string(),
});

const saveProfileSchema = z.object({
  organizationId: z.string(),
  profile: companyProfileSchema,
});

const updateProfileSchema = z.object({
  organizationId: z.string(),
  profile: companyProfileSchema.partial(),
});

// GET - Get organization profile
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return errorResponse("Organization ID is required", 400);
    }

    const _user = await requireOrgAccess(organizationId);

    // Get organization with profile
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return errorResponse("Organization not found", 404);
    }

    return successResponse({
      profile: org.profile ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.includes("Access denied")) {
      return errorResponse("Access denied to this organization", 403);
    }
    console.error("Get profile error:", error);
    return errorResponse("Failed to fetch profile. Please try again.", 500);
  }
}

// POST - Save organization profile (creates or replaces)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = saveProfileSchema.parse(body);

    const user = await requireOrgAccess(validatedData.organizationId);

    // Verify organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, validatedData.organizationId))
      .limit(1);

    if (!org) {
      return errorResponse("Organization not found", 404);
    }

    // Prepare profile with metadata
    // validatedData.profile is already a complete OrganizationProfile from companyProfileSchema
    const profile: OrganizationProfile = {
      ...validatedData.profile,
      createdAt: org.profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as OrganizationProfile;

    // Update organization with profile
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        profile: profile as unknown as OrganizationProfile,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, validatedData.organizationId))
      .returning();

    // Audit log
    await createAuditLog({
      organizationId: validatedData.organizationId,
      userId: user.id,
      action: "organization.updated",
      metadata: {
        profileUpdated: true,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return successResponse(
      {
        profile: updatedOrg.profile,
      },
      201,
    );
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
    console.error("Save profile error:", error);
    return errorResponse("Failed to save profile. Please try again.", 500);
  }
}

// PATCH - Update organization profile (partial update)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const user = await requireOrgAccess(validatedData.organizationId);

    // Verify organization exists
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, validatedData.organizationId))
      .limit(1);

    if (!org) {
      return errorResponse("Organization not found", 404);
    }

    // Merge existing profile with updates
    const existingProfile =
      (org.profile as OrganizationProfile | null) ??
      ({} as Partial<OrganizationProfile>);
    const updatedProfile: OrganizationProfile = {
      // Start with existing profile (for optional fields)
      ...existingProfile,
      // Apply updates (validatedData.profile is partial, so only defined fields will override)
      ...validatedData.profile,
      // Ensure required fields are present (these override the spreads above if needed)
      legalEntityName:
        validatedData.profile.legalEntityName ??
        existingProfile.legalEntityName ??
        "",
      countryOfIncorporation:
        validatedData.profile.countryOfIncorporation ??
        existingProfile.countryOfIncorporation ??
        "",
      fintechCategory:
        validatedData.profile.fintechCategory ??
        existingProfile.fintechCategory ??
        "PSP",
      businessModel:
        validatedData.profile.businessModel ??
        existingProfile.businessModel ??
        "B2C",
      primaryJurisdiction:
        validatedData.profile.primaryJurisdiction ??
        existingProfile.primaryJurisdiction ??
        "",
      services:
        validatedData.profile.services ?? existingProfile.services ?? [],
      countryOperations:
        validatedData.profile.countryOperations ??
        existingProfile.countryOperations ??
        [],
      complianceMapping:
        validatedData.profile.complianceMapping ??
        existingProfile.complianceMapping ??
        [],
      // Set metadata
      updatedAt: new Date().toISOString(),
      createdAt: existingProfile.createdAt ?? new Date().toISOString(),
    };

    // Update organization with merged profile
    const [updatedOrg] = await db
      .update(organizations)
      .set({
        profile: updatedProfile as unknown as OrganizationProfile,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, validatedData.organizationId))
      .returning();

    // Audit log
    await createAuditLog({
      organizationId: validatedData.organizationId,
      userId: user.id,
      action: "organization.updated",
      metadata: {
        profileUpdated: true,
        previousValue: existingProfile,
        newValue: updatedProfile,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return successResponse({
      profile: updatedOrg.profile,
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
    console.error("Update profile error:", error);
    return errorResponse("Failed to update profile. Please try again.", 500);
  }
}
