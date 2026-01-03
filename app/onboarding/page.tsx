import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { targets } from "@/lib/db/schema";
import { getCurrentOrganization } from "@/lib/utils/organization";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get current organization from cookie or fallback to first
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("currentOrganizationId")?.value ?? null;
  const currentOrg = await getCurrentOrganization(session.user.id, cookieOrgId);

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
