"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { organizations } from "@/lib/db/schema";

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
  const [selectedOrgId, setSelectedOrgId] = useState(
    currentOrganizationId || organizations[0]?.organization.id || "",
  );

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

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedOrgId} onValueChange={handleOrganizationChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {currentOrg?.organization.name || "Select organization"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.organization.id} value={org.organization.id}>
              {org.organization.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
