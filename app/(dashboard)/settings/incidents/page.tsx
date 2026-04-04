import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { IncidentsClient } from "@/components/incidents/incidents-client";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import { requireOrganizationAdmin } from "@/lib/utils/tenant";

export default async function IncidentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [userOrg] = await db
    .select({
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(organizationMembers.userId, session.user.id))
    .limit(1);

  if (!userOrg) {
    redirect("/dashboard");
  }

  await requireOrganizationAdmin(session.user.id, userOrg.organization.id);

  return <IncidentsClient organizationId={userOrg.organization.id} />;
}
