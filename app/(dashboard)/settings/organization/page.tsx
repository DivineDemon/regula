import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CreateOrganizationDialog } from "@/components/organizations/create-organization-dialog";
import { OrganizationList } from "@/components/organizations/organization-list";
import { OrganizationSettingsForm } from "@/components/organizations/organization-settings-form";
import { OrganizationProfileSettings } from "@/components/settings/organization-profile-settings";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import {
  getCurrentOrganization,
  getUserOrganizations,
} from "@/lib/utils/organization";

export default async function OrganizationSettingsPage() {
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

  // Get user's role in the current organization
  const [userOrg] = await db
    .select({
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, session.user.id),
        eq(organizationMembers.organizationId, currentOrg.id),
      ),
    )
    .limit(1);

  if (!userOrg) {
    redirect("/dashboard");
  }

  // Check if user is admin
  if (userOrg.role !== UserRole.ADMIN) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">
          You must be an administrator to access organization settings.
        </p>
      </div>
    );
  }

  // Get all user's organizations
  const userOrganizations = await getUserOrganizations(session.user.id);

  return (
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex items-end justify-enditems-end">
        <div className="flex-1 flex flex-col items-start justify-start gap-2">
          <h1 className="w-full text-left text-3xl font-bold">
            Organization Settings
          </h1>
          <p className="w-full text-left text-muted-foreground">
            Manage your organization information
          </p>
        </div>
        <CreateOrganizationDialog />
      </div>
      <div className="w-full grid grid-cols-2 items-start justify-start gap-5">
        <OrganizationList organizations={userOrganizations} />
        <OrganizationSettingsForm
          organizationId={currentOrg.id}
          initialName={currentOrg.name}
        />
        <div className="w-full h-full col-span-2">
          <OrganizationProfileSettings organizationId={currentOrg.id} />
        </div>
      </div>
    </div>
  );
}
