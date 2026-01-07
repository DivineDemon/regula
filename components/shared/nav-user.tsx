"use client";
import {
  Building2,
  ChevronsUpDown,
  ClipboardCheck,
  CreditCard,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { organizations } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface Organization {
  organization: typeof organizations.$inferSelect;
  role: string;
}

interface NavUserProps {
  user: {
    name: string | null;
    email: string;
    avatar?: string | null;
  };
  organizations: Organization[];
  currentOrganizationId?: string;
}

export function NavUser({
  user,
  organizations,
  currentOrganizationId,
}: NavUserProps) {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [selectedOrgId, setSelectedOrgId] = useState(
    currentOrganizationId || organizations[0]?.organization.id || "",
  );

  useEffect(() => {
    setSelectedOrgId(
      currentOrganizationId || organizations[0]?.organization.id || "",
    );
  }, [currentOrganizationId, organizations]);

  const handleOrganizationChange = async (newOrgId: string | null) => {
    if (!newOrgId) return;
    setSelectedOrgId(newOrgId);

    // Set cookie via API route
    try {
      const response = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId: newOrgId }),
      });

      if (!response.ok) {
        console.error("Failed to switch organization");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  const currentOrg =
    organizations.find((org) => org.organization.id === selectedOrgId) ||
    organizations[0];

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0]?.toUpperCase() || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={
                isCollapsed
                  ? `${user.name || user.email}${
                      currentOrg ? ` • ${currentOrg.organization.name}` : ""
                    }`
                  : undefined
              }
            >
              <Avatar>
                <AvatarImage
                  src={user.avatar || undefined}
                  alt={user.name || user.email}
                />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "User"}
                  </span>
                  {currentOrg && (
                    <span className="truncate text-xs text-muted-foreground">
                      {currentOrg.organization.name}
                    </span>
                  )}
                </div>
              )}
              {!isCollapsed && <ChevronsUpDown className="ml-auto size-4" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar>
                  <AvatarImage
                    src={user.avatar || undefined}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || "User"}
                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {organizations.length > 1 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.organization.id}
                      onClick={() =>
                        handleOrganizationChange(org.organization.id)
                      }
                      className={cn(
                        "cursor-pointer mb-1 last:mb-0",
                        selectedOrgId === org.organization.id && "bg-accent",
                      )}
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <span className="truncate">{org.organization.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/organization">
                  <Settings className="mr-2 h-4 w-4" />
                  Organization
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/consent">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Consent
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
