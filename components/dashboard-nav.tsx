"use client";

import { Building2, LayoutDashboard, Target, User, Users } from "lucide-react";
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
    icon: Target, // Using Target as placeholder, can be changed to AlertCircle later
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
              const isActive = pathname.startsWith(item.url);
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
