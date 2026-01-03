import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ConsentManagementClient } from "@/components/settings/consent-management-client";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function ConsentPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consent Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your consent preferences for data processing and communications
        </p>
      </div>

      <ConsentManagementClient userId={user.id} />
    </div>
  );
}
