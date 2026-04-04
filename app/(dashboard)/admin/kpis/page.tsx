import { redirect } from "next/navigation";
import { FounderKpisClient } from "@/components/dashboard/founder-kpis-client";
import { auth } from "@/lib/auth/config";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export default async function AdminKpisPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const email = session.user.email ?? undefined;
  if (!isPlatformAdmin(email)) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Founder metrics</h1>
        <p className="text-muted-foreground">
          Platform KPIs for product, growth, and operational health
        </p>
      </div>
      <FounderKpisClient />
    </div>
  );
}
