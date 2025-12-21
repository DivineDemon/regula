import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import { UsageDashboardClient } from "./usage-dashboard-client";

export default async function UsageDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's first organization
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage & Limits</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor your plan usage and limits
        </p>
      </div>

      <UsageDashboardClient
        organizationId={userOrg.organization.id}
        organizationName={userOrg.organization.name}
      />
    </div>
  );
}
