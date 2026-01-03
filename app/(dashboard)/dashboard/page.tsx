import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations, targets } from "@/lib/db/schema";
import { getCurrentOrganization } from "@/lib/utils/organization";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get current organization from cookie or fallback to first
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("currentOrganizationId")?.value ?? null;
  const currentOrg = await getCurrentOrganization(session.user.id, cookieOrgId);

  if (!currentOrg) {
    redirect("/register");
  }

  // Get user's organizations for organization switcher
  const _userOrgs = await db
    .select({
      organization: organizations,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, session.user.id));

  // Check if user has targets - if not, redirect to onboarding
  const existingTargets = await db
    .select()
    .from(targets)
    .where(eq(targets.organizationId, currentOrg.id))
    .limit(1);

  // If user has no targets, they need to complete onboarding
  if (existingTargets.length === 0) {
    redirect("/onboarding");
  }

  return <DashboardContent organizationId={currentOrg.id} />;
}
