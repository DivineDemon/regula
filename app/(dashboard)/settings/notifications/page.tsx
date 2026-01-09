import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NotificationPreferencesClient } from "@/components/settings/notification-preferences-client";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

export default async function NotificationPreferencesPage() {
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
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h1 className="w-full text-left text-3xl font-bold">
          Notification Preferences
        </h1>
        <p className="w-full text-left text-muted-foreground">
          Configure how you receive alerts and notifications
        </p>
      </div>
      <NotificationPreferencesClient organizationId={userOrg.organization.id} />
    </div>
  );
}
