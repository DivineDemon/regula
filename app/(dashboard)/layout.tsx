import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { ErrorBoundary } from "@/components/error-boundary";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <Logo size={32} className="group-data-[collapsible=icon]:mx-auto" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">Regula</span>
              <span className="text-xs text-muted-foreground">
                Regulatory Monitor
              </span>
            </div>
          </div>
        </SidebarHeader>
        <DashboardNav userRole={userOrgs[0]?.role} />
        <SidebarFooter>
          <div className="space-y-2 px-2 py-2">
            <div className="group-data-[collapsible=icon]:hidden">
              <OrganizationSwitcher organizations={userOrgs} />
            </div>
            <LogoutButton />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger />
          <AnimatedThemeToggler className="h-9 w-9 p-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
