import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

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
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h1 className="w-full text-left text-3xl font-bold">
          Profile Settings
        </h1>
        <p className="w-full text-left text-muted-foreground">
          Manage your account information
        </p>
      </div>
      <ProfileForm
        userId={user.id}
        initialEmail={user.email}
        initialName={user.name ?? ""}
      />
    </div>
  );
}
