"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganizationId?: string;
}

export function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [selectedOrgId, setSelectedOrgId] = useState(
    currentOrganizationId || organizations[0]?.organization.id || "",
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSelectedOrgId(
      currentOrganizationId || organizations[0]?.organization.id || "",
    );
  }, [currentOrganizationId, organizations]);

  // Don't show if user only has one organization
  if (organizations.length <= 1) {
    return null;
  }

  const handleOrganizationChange = async (newOrgId: string | null) => {
    if (!newOrgId) return;
    setSelectedOrgId(newOrgId);

    // Store selected organization in localStorage
    localStorage.setItem("currentOrganizationId", newOrgId);

    // Refresh the page to update context
    router.refresh();
  };

  const currentOrg =
    organizations.find((org) => org.organization.id === selectedOrgId) ||
    organizations[0];

  if (isCollapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                tooltip={currentOrg?.organization.name || "Organization"}
              >
                <Building2 />
                <span>{currentOrg?.organization.name || "Organization"}</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-56 p-1">
              <div className="flex flex-col">
                {organizations.map((org) => (
                  <button
                    key={org.organization.id}
                    type="button"
                    onClick={() => {
                      handleOrganizationChange(org.organization.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left w-full",
                      selectedOrgId === org.organization.id &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{org.organization.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[200px] justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {currentOrg?.organization.name || "Select organization"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.organization.id}
              onClick={() => handleOrganizationChange(org.organization.id)}
              className={cn(
                "cursor-pointer",
                selectedOrgId === org.organization.id && "bg-accent",
              )}
            >
              <Building2 className="mr-2 h-4 w-4" />
              <span className="truncate">{org.organization.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
