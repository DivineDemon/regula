import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

/**
 * Get the user's organizations
 */
export async function getUserOrganizations(userId: string) {
  const userOrgs = await db
    .select({
      organization: organizations,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, userId));

  return userOrgs;
}

/**
 * Get the user's current organization (first one, or can be enhanced with session storage)
 */
export async function getCurrentOrganization(userId: string) {
  const userOrgs = await getUserOrganizations(userId);
  return userOrgs[0]?.organization ?? null;
}

/**
 * Get user's role in an organization
 */
export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string,
) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      eq(organizationMembers.userId, userId) &&
        eq(organizationMembers.organizationId, organizationId),
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
) {
  const role = await getUserRoleInOrganization(userId, organizationId);
  return role === "admin";
}
