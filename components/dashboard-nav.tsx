"use client";

import {
  AlertCircle,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  Target,
  User,
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

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
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

const settingsItems = [
  {
    title: "Organization",
    url: "/settings/organization",
    icon: Building2,
  },
  {
    title: "Members",
    url: "/settings/organization/members",
    icon: Users,
  },
  {
    title: "Profile",
    url: "/settings/profile",
    icon: User,
  },
  {
    title: "Notifications",
    url: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "Usage",
    url: "/settings/usage",
    icon: BarChart3,
  },
  {
    title: "Billing",
    url: "/settings/billing",
    icon: CreditCard,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuItems.map((item) => {
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive}
                  >
                    <item.icon />
                    <span>{item.title}</span>
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
            {settingsItems.map((item) => {
              // Check for exact match
              if (pathname === item.url) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={true}
                    >
                      <item.icon />
                      <span>{item.title}</span>
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
                    render={<Link href={item.url} />}
                    isActive={isActive}
                  >
                    <item.icon />
                    <span>{item.title}</span>
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
