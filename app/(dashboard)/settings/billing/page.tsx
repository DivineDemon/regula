import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { BillingClient } from "@/components/settings/billing-client";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

export default async function BillingSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's first organization
  const [userOrg] = await db
    .select({
      organization: organizations,
      role: organizationMembers.role,
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

  // Check if user is admin
  if (userOrg.role !== UserRole.ADMIN) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">
          You must be an administrator to access billing settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your subscription, payment methods, and invoices
        </p>
      </div>

      <BillingClient
        organizationId={userOrg.organization.id}
        organizationName={userOrg.organization.name}
      />
    </div>
  );
}
