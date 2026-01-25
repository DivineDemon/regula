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
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h1 className="w-full text-left text-3xl font-bold">
          Consent Management
        </h1>
        <p className="w-full text-left text-muted-foreground">
          Manage your consent preferences for data processing and communications
        </p>
      </div>
      <ConsentManagementClient userId={user.id} />
    </div>
  );
}
