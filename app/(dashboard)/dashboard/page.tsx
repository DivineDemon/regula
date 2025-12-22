import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations, targets } from "@/lib/db/schema";
import { DashboardContent } from "../dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's organizations
  const userOrgs = await db
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

  if (userOrgs.length === 0) {
    redirect("/register");
  }

  // Get the current organization (first one for now)
  const currentOrg = userOrgs[0]?.organization;

  if (!currentOrg) {
    redirect("/register");
  }

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
