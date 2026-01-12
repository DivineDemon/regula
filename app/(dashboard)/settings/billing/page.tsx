import { eq } from "drizzle-orm";
import { TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { BillingClient } from "@/components/settings/billing-client";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UsageDashboardClient } from "@/components/usage/usage-dashboard-client";
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

  const isAdmin = userOrg.role === UserRole.ADMIN;

  return (
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h1 className="w-full text-left text-3xl font-bold">Billing & Usage</h1>
        <p className="w-full text-left text-muted-foreground">
          Monitor your plan usage and manage your subscription, payment methods,
          and invoices
        </p>
      </div>
      <UsageDashboardClient
        organizationId={userOrg.organization.id}
        organizationName={userOrg.organization.name}
      />
      {isAdmin ? (
        <BillingClient
          organizationId={userOrg.organization.id}
          organizationName={userOrg.organization.name}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              You must be an administrator to access billing settings
            </EmptyTitle>
            <EmptyDescription>
              Only administrators can access billing settings. Please contact
              the administrator to get access.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
