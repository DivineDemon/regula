"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Step1CompanyProfile } from "@/components/onboarding/steps/step1-company-profile";
import { Step2Services } from "@/components/onboarding/steps/step2-services";
import { Step3GeographicOperations } from "@/components/onboarding/steps/step3-geographic-operations";
import { Step4ComplianceMapping } from "@/components/onboarding/steps/step4-compliance-mapping";
import { Step5Partnerships } from "@/components/onboarding/steps/step5-partnerships";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

export type ProfileEditingSection =
  | "company"
  | "services"
  | "geographic"
  | "compliance"
  | "partnerships"
  | null;

interface OrganizationProfileSettingsProps {
  organizationId: string;
}

export function OrganizationProfileSettings({
  organizationId,
}: OrganizationProfileSettingsProps) {
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [_isSaving, setIsSaving] = useState(false);
  const [_editingSection, setEditingSection] =
    useState<ProfileEditingSection>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/organizations/profile?organizationId=${encodeURIComponent(organizationId)}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.error ||
          `Failed to load organization profile (${response.status})`;
        toast.error(message);
        return;
      }

      const data = await response.json();
      setProfile(data.data?.profile ?? data.profile ?? null);
    } catch (error) {
      console.error("Failed to load organization profile:", error);
      toast.error("Failed to load organization profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const patchProfile = useCallback(
    async (updates: Partial<OrganizationProfile>) => {
      if (!profile) return;
      setIsSaving(true);
      try {
        const merged = { ...profile, ...updates };
        const response = await fetch("/api/organizations/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId,
            profile: merged,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 400 && errorData.details) {
            const validationErrors = Array.isArray(errorData.details)
              ? errorData.details
              : [];
            const errorSummary = validationErrors
              .map((err: { path?: string[]; message?: string }) => {
                const path = err.path?.join(".") || "field";
                return `${path}: ${err.message || "validation error"}`;
              })
              .join(", ");
            toast.error(`Validation errors: ${errorSummary}`);
          } else {
            toast.error(
              errorData.error ||
                `Failed to update profile (${response.status})`,
            );
          }
          return;
        }

        const data = await response.json();
        const updated = data.data?.profile ?? data.profile ?? merged;
        setProfile(updated);
        setEditingSection(null);
        toast.success("Section updated");
      } catch (error) {
        console.error("Error updating organization profile:", error);
        toast.error("Failed to update profile. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [organizationId, profile],
  );

  const handleSectionComplete = useCallback(
    (data: Partial<OrganizationProfile>) => {
      void patchProfile(data);
    },
    [patchProfile],
  );

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No organization profile has been created yet. Complete onboarding or
            contact an administrator to set up your profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full grid grid-cols-2 gap-5 items-start justify-start">
      <Step1CompanyProfile
        organizationId={organizationId}
        initialData={profile}
        onComplete={handleSectionComplete}
        onBack={() => setEditingSection(null)}
      />
      <Step2Services
        initialData={profile}
        onComplete={handleSectionComplete}
        onBack={() => setEditingSection(null)}
      />
      <Step3GeographicOperations
        initialData={profile}
        onComplete={handleSectionComplete}
        onBack={() => setEditingSection(null)}
      />
      <Step4ComplianceMapping
        initialData={profile}
        onComplete={handleSectionComplete}
        onBack={() => setEditingSection(null)}
      />
      <div className="w-full col-span-2">
        <Step5Partnerships
          initialData={profile}
          onComplete={handleSectionComplete}
          onBack={() => setEditingSection(null)}
        />
      </div>
    </div>
  );
}
