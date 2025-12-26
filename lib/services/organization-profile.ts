import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

/**
 * Error class for organization profile operations
 */
export class OrganizationProfileError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "OrganizationProfileError";
  }
}

/**
 * Save organization profile to database
 * Creates or replaces the entire profile
 *
 * @param organizationId - The organization ID
 * @param profile - The complete organization profile
 * @returns The saved profile
 * @throws OrganizationProfileError if validation fails or organization not found
 */
export async function saveOrganizationProfile(
  organizationId: string,
  profile: OrganizationProfile,
): Promise<OrganizationProfile> {
  // Validate profile data
  const validationResult = companyProfileSchema.safeParse(profile);

  if (!validationResult.success) {
    throw new OrganizationProfileError(
      "Profile validation failed",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Verify organization exists
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new OrganizationProfileError(
      "Organization not found",
      "ORGANIZATION_NOT_FOUND",
      404,
    );
  }

  // Prepare profile with metadata
  // validationResult.data is already validated as OrganizationProfile by companyProfileSchema
  const profileWithMetadata: OrganizationProfile = {
    ...validationResult.data,
    createdAt: org.profile?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as OrganizationProfile;

  // Update organization with profile
  const [updatedOrg] = await db
    .update(organizations)
    .set({
      profile: profileWithMetadata as unknown as OrganizationProfile,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updatedOrg?.profile) {
    throw new OrganizationProfileError(
      "Failed to save profile",
      "SAVE_ERROR",
      500,
    );
  }

  return updatedOrg.profile as OrganizationProfile;
}

/**
 * Get organization profile from database
 *
 * @param organizationId - The organization ID
 * @returns The organization profile or null if not found
 * @throws OrganizationProfileError if organization not found
 */
export async function getOrganizationProfile(
  organizationId: string,
): Promise<OrganizationProfile | null> {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new OrganizationProfileError(
      "Organization not found",
      "ORGANIZATION_NOT_FOUND",
      404,
    );
  }

  return (org.profile as OrganizationProfile | null) ?? null;
}

/**
 * Update organization profile (partial update)
 * Merges the provided updates with the existing profile
 *
 * @param organizationId - The organization ID
 * @param updates - Partial profile updates
 * @returns The updated profile
 * @throws OrganizationProfileError if validation fails or organization not found
 */
export async function updateOrganizationProfile(
  organizationId: string,
  updates: Partial<OrganizationProfile>,
): Promise<OrganizationProfile> {
  // Validate updates (partial validation)
  const partialValidation = companyProfileSchema.partial().safeParse(updates);

  if (!partialValidation.success) {
    throw new OrganizationProfileError(
      "Profile update validation failed",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Get existing organization
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new OrganizationProfileError(
      "Organization not found",
      "ORGANIZATION_NOT_FOUND",
      404,
    );
  }

  // Merge existing profile with updates
  const existingProfile =
    (org.profile as OrganizationProfile | null) ??
    ({} as Partial<OrganizationProfile>);

  const mergedProfile: OrganizationProfile = {
    // Start with existing profile
    ...existingProfile,
    // Apply updates (only defined fields will override)
    ...updates,
    // Ensure required fields are present
    legalEntityName:
      updates.legalEntityName ?? existingProfile.legalEntityName ?? "",
    countryOfIncorporation:
      updates.countryOfIncorporation ??
      existingProfile.countryOfIncorporation ??
      "",
    fintechCategory:
      updates.fintechCategory ?? existingProfile.fintechCategory ?? "PSP",
    businessModel:
      updates.businessModel ?? existingProfile.businessModel ?? "B2C",
    primaryJurisdiction:
      updates.primaryJurisdiction ?? existingProfile.primaryJurisdiction ?? "",
    services: updates.services ?? existingProfile.services ?? [],
    countryOperations:
      updates.countryOperations ?? existingProfile.countryOperations ?? [],
    complianceMapping:
      updates.complianceMapping ?? existingProfile.complianceMapping ?? [],
    // Set metadata
    updatedAt: new Date().toISOString(),
    createdAt: existingProfile.createdAt ?? new Date().toISOString(),
  };

  // Validate the merged profile
  const fullValidation = companyProfileSchema.safeParse(mergedProfile);

  if (!fullValidation.success) {
    throw new OrganizationProfileError(
      "Merged profile validation failed",
      "VALIDATION_ERROR",
      400,
    );
  }

  // Update organization with merged profile
  const [updatedOrg] = await db
    .update(organizations)
    .set({
      profile: fullValidation.data as unknown as OrganizationProfile,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  if (!updatedOrg?.profile) {
    throw new OrganizationProfileError(
      "Failed to update profile",
      "UPDATE_ERROR",
      500,
    );
  }

  return updatedOrg.profile as OrganizationProfile;
}

/**
 * Validate organization profile data
 *
 * @param profile - The profile data to validate
 * @returns Validation result with success flag and errors if any
 */
export function validateProfile(profile: unknown): {
  success: boolean;
  errors?: Array<{ path: string; message: string }>;
} {
  const result = companyProfileSchema.safeParse(profile);

  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    errors: result.error.issues.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    })),
  };
}

/**
 * Merge profile updates with existing profile
 * This is a utility function that performs a deep merge of profile data
 *
 * @param existing - The existing profile (can be partial)
 * @param updates - The updates to merge
 * @returns The merged profile
 */
export function mergeProfileUpdates(
  existing: Partial<OrganizationProfile>,
  updates: Partial<OrganizationProfile>,
): Partial<OrganizationProfile> {
  // Deep merge arrays and objects
  const merged: Partial<OrganizationProfile> = {
    ...existing,
    ...updates,
  };

  // Merge arrays (replace, don't concatenate)
  if (updates.services !== undefined) {
    merged.services = updates.services;
  } else if (existing.services) {
    merged.services = existing.services;
  }

  if (updates.countryOperations !== undefined) {
    merged.countryOperations = updates.countryOperations;
  } else if (existing.countryOperations) {
    merged.countryOperations = existing.countryOperations;
  }

  if (updates.complianceMapping !== undefined) {
    merged.complianceMapping = updates.complianceMapping;
  } else if (existing.complianceMapping) {
    merged.complianceMapping = existing.complianceMapping;
  }

  if (updates.partnerships !== undefined) {
    merged.partnerships = updates.partnerships;
  } else if (existing.partnerships) {
    merged.partnerships = existing.partnerships;
  }

  // Merge nested objects
  if (updates.complianceFramework || existing.complianceFramework) {
    merged.complianceFramework = {
      ...existing.complianceFramework,
      ...updates.complianceFramework,
    };
  }

  // Preserve metadata
  if (existing.createdAt) {
    merged.createdAt = existing.createdAt;
  }
  merged.updatedAt = new Date().toISOString();

  return merged;
}
