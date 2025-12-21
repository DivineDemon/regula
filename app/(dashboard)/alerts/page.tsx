import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import {
  alerts,
  organizationMembers,
  organizations,
  targets,
} from "@/lib/db/schema";

export default async function AlertsPage() {
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

  // Get all alerts for the current organization
  const alertsList = await db
    .select({
      alert: alerts,
      target: targets,
    })
    .from(alerts)
    .innerJoin(targets, eq(alerts.targetId, targets.id))
    .where(eq(alerts.organizationId, currentOrg.id))
    .orderBy(desc(alerts.createdAt))
    .limit(100);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Alerts</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage regulatory change alerts
        </p>
      </div>

      {alertsList.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            No alerts yet. Alerts will appear here when changes are detected in
            your monitored targets.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alertsList.map(({ alert, target }) => (
            <div
              key={alert.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{target.label}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        alert.status === "new"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          : alert.status === "triaged"
                            ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                            : alert.status === "actioned"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {alert.status}
                    </span>
                    {alert.impactScore !== null && (
                      <span className="text-xs text-muted-foreground">
                        Impact: {(alert.impactScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {alert.summary && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {alert.summary}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
