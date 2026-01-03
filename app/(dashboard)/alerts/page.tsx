import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AlertsList } from "@/components/alerts/alerts-list";
import { auth } from "@/lib/auth/config";
import { getCurrentOrganization } from "@/lib/utils/organization";

export default async function AlertsPage() {
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

  return <AlertsList organizationId={currentOrg.id} />;
}
