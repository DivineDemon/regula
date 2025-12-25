import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations, targets } from "@/lib/db/schema";
import { getCurrentOrganization } from "@/lib/utils/organization";
import { TargetsList } from "./targets-list";

export default async function TargetsPage() {
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

  // Get all targets for the current organization
  const targetsList = await db
    .select()
    .from(targets)
    .where(eq(targets.organizationId, currentOrg.id))
    .orderBy(desc(targets.createdAt));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Targets</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your regulatory monitoring targets
        </p>
      </div>

      <TargetsList
        targets={targetsList}
        organizationId={currentOrg.id}
        userOrgs={userOrgs}
      />
    </div>
  );
}
