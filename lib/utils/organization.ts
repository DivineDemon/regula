import { and, eq } from "drizzle-orm";
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
 * Get the user's current organization from cookie, or fallback to first one
 */
export async function getCurrentOrganization(
  userId: string,
  cookieOrgId?: string | null,
) {
  const userOrgs = await getUserOrganizations(userId);

  // If cookie has organization ID and user is member of it, use that
  if (cookieOrgId) {
    const orgFromCookie = userOrgs.find(
      (org) => org.organization.id === cookieOrgId,
    );
    if (orgFromCookie) {
      return orgFromCookie.organization;
    }
  }

  // Fallback to first organization
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
) {
  const role = await getUserRoleInOrganization(userId, organizationId);
  return role === "admin";
}
