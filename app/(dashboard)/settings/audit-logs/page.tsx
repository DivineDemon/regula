import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import { AuditLogsViewer } from "./audit-logs-viewer";

export default async function AuditLogsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's first organization (for now, we'll use the first one)
  // In the future, this can be enhanced with organization context from session/cookie
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
          You must be an administrator to access audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="mt-2 text-muted-foreground">
          View all audit logs for your organization. Only administrators can
          access this page.
        </p>
      </div>

      <AuditLogsViewer organizationId={userOrg.organization.id} />
    </div>
  );
}
