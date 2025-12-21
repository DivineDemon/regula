import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations, targets } from "@/lib/db/schema";
import { TargetsList } from "./targets-list";

export default async function TargetsPage() {
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
