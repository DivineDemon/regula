"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ProfileSummary } from "@/components/onboarding/profile-summary";
import { Button } from "@/components/ui/button";
import type { OrganizationProfile } from "@/lib/types/organization-profile";

interface Step6ReviewProps {
  organizationId: string;
  profile: OrganizationProfile;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step6Review({
  organizationId,
  profile,
  onComplete,
  onBack,
}: Step6ReviewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Save profile to database
      const response = await fetch("/api/organizations/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          profile,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Failed to save profile (${response.status})`;

        // Handle validation errors specifically
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
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      onComplete(data.profile || profile);
    } catch (error) {
      console.error("Error saving profile:", error);
      // Error toast already shown above for specific cases
      if (
        !(error instanceof Error && error.message.includes("Failed to save"))
      ) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to save profile. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-center justify-center">
        <h2 className="w-full text-left text-2xl font-bold">Review & Submit</h2>
        <p className="w-full text-left text-muted-foreground">
          Review your full organization profile. You can print or save this
          summary before submitting.
        </p>
      </div>
      <div className="w-full h-[calc(100vh-412px)] overflow-y-auto">
        <ProfileSummary profile={profile} showEditButtons={false} />
      </div>
      <div className="w-full grid grid-cols-2 gap-5 mt-auto">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="w-full"
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit & Continue"}
        </Button>
      </div>
    </div>
  );
}
