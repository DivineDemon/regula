import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {session.user?.email || session.user?.name || "User"}!
      </p>
    </div>
  );
}
