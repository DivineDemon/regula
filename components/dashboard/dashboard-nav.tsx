"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  LayoutDashboard,
  LineChart,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserRole } from "@/lib/auth/roles";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  platformAdminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: LineChart,
  },
  {
    title: "Targets",
    url: "/targets",
    icon: Target,
  },
  {
    title: "Alerts",
    url: "/alerts",
    icon: AlertCircle,
  },
];

// Org/workspace-level only. User/account items (Profile, Consent, Notifications, Data Privacy) live in nav-user dropdown.
const settingsItems: MenuItem[] = [
  {
    title: "Founder metrics",
    url: "/admin/kpis",
    icon: Activity,
    platformAdminOnly: true,
  },
  {
    title: "Members",
    url: "/settings/organization/members",
    icon: Users,
  },
  {
    title: "Billing & Usage",
    url: "/settings/billing",
    icon: BarChart3,
  },
  {
    title: "Audit Logs",
    url: "/settings/audit-logs",
    icon: FileText,
    adminOnly: true,
  },
  {
    title: "Incidents",
    url: "/settings/incidents",
    icon: AlertTriangle,
    adminOnly: true,
  },
];

interface DashboardNavProps {
  userRole?: string;
  isPlatformAdmin?: boolean;
}

export function DashboardNav({
  userRole,
  isPlatformAdmin: isPlatformAdminUser = false,
}: DashboardNavProps) {
  const pathname = usePathname();
  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuItems.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(`${item.url}/`);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {settingsItems
              .filter(
                (item) =>
                  (!item.adminOnly || isAdmin) &&
                  (!item.platformAdminOnly || isPlatformAdminUser),
              )
              .map((item) => {
                // Check for exact match
                if (pathname === item.url) {
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={true}
                        tooltip={item.title}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                // Check if this is a child route (pathname starts with item.url + "/")
                // but only if no other more specific item matches
                const isChildRoute = pathname.startsWith(`${item.url}/`);
                const hasMoreSpecificMatch = settingsItems.some(
                  (otherItem) =>
                    otherItem.url !== item.url &&
                    otherItem.url.startsWith(`${item.url}/`) &&
                    pathname.startsWith(otherItem.url),
                );
                const isActive = isChildRoute && !hasMoreSpecificMatch;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
