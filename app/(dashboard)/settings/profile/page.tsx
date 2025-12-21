import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
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
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account information
        </p>
      </div>

      <ProfileForm
        userId={user.id}
        initialName={user.name ?? ""}
        initialEmail={user.email}
      />
    </div>
  );
}
