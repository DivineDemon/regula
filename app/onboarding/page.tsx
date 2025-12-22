import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations, targets } from "@/lib/db/schema";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
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
    redirect("/dashboard");
  }

  // Check if user has targets
  const existingTargets = await db
    .select()
    .from(targets)
    .where(eq(targets.organizationId, currentOrg.id))
    .limit(1);

  // If user already has targets, they've completed onboarding
  if (existingTargets.length > 0) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      organizationId={currentOrg.id}
      organizationName={currentOrg.name}
      userId={session.user.id}
    />
  );
}
