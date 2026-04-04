import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AnalyticsContent } from "@/components/analytics/analytics-content";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations, targets } from "@/lib/db/schema";
import { getCurrentOrganization } from "@/lib/utils/organization";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("currentOrganizationId")?.value ?? null;
  const currentOrg = await getCurrentOrganization(session.user.id, cookieOrgId);

  if (!currentOrg) {
    redirect("/register");
  }

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

  const existingTargets = await db
    .select()
    .from(targets)
    .where(eq(targets.organizationId, currentOrg.id))
    .limit(1);

  if (existingTargets.length === 0) {
    redirect("/onboarding");
  }

  return (
    <AnalyticsContent
      organizationId={currentOrg.id}
      organizationName={currentOrg.name}
    />
  );
}
