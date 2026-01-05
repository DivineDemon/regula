import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { getAlertWithDetails } from "@/lib/services/alerts";
import { getCurrentOrganization } from "@/lib/utils/organization";
import { AlertDetailClient } from "../../../../components/alerts/alert-detail-client";

export default async function AlertDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organizationId?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id: alertId } = await params;
  const searchParamsResolved = await searchParams;
  const organizationIdFromQuery = searchParamsResolved.organizationId;

  // Get current organization from cookie or fallback to first
  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get("currentOrganizationId")?.value ?? null;
  const currentOrg = await getCurrentOrganization(
    session.user.id,
    organizationIdFromQuery || cookieOrgId,
  );

  if (!currentOrg) {
    redirect("/dashboard");
  }

  // Verify user is member of organization
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, session.user.id),
        eq(organizationMembers.organizationId, currentOrg.id),
      ),
    )
    .limit(1);

  if (!member) {
    redirect("/dashboard");
  }

  // Fetch alert details
  const alertDetail = await getAlertWithDetails(alertId, currentOrg.id);

  if (!alertDetail) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-lg font-medium">Alert not found</p>
      </div>
    );
  }

  return (
    <AlertDetailClient
      alertDetail={alertDetail}
      organizationId={currentOrg.id}
      alertId={alertId}
    />
  );
}
