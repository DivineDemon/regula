import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

/**
 * Verify that a user has access to an organization
 */
export async function verifyOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  return !!member;
}

/**
 * Get user's role in an organization
 */
export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string,
): Promise<string | null> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  return member?.role ?? null;
}

/**
 * Check if user is admin of an organization
 */
export async function isOrganizationAdmin(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const role = await getUserRoleInOrganization(userId, organizationId);
  return role === "admin";
}

/**
 * Require organization access or throw error
 */
export async function requireOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<void> {
  const hasAccess = await verifyOrganizationAccess(userId, organizationId);
  if (!hasAccess) {
    throw new Error("Access denied to this organization");
  }
}

/**
 * Require admin role or throw error
 */
export async function requireOrganizationAdmin(
  userId: string,
  organizationId: string,
): Promise<void> {
  const isAdmin = await isOrganizationAdmin(userId, organizationId);
  if (!isAdmin) {
    throw new Error("Admin access required");
  }
}
