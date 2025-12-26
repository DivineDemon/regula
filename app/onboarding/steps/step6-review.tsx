"use client";

import { Edit, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCountryName } from "@/lib/data/countries";
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
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <FileText className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Review & Submit</h2>
        <p className="mt-2 text-muted-foreground">
          Please review your information before submitting
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Company Profile</span>
              <Button variant="ghost" size="sm" onClick={onBack}>
                <Edit className="mr-2 size-4" />
                Edit
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Legal Entity Name:</span>
                <p className="text-muted-foreground">
                  {profile.legalEntityName}
                </p>
              </div>
              {profile.tradingName && (
                <div>
                  <span className="font-medium">Trading Name:</span>
                  <p className="text-muted-foreground">{profile.tradingName}</p>
                </div>
              )}
              <div>
                <span className="font-medium">Country of Incorporation:</span>
                <p className="text-muted-foreground">
                  {getCountryName(profile.countryOfIncorporation)}
                </p>
              </div>
              <div>
                <span className="font-medium">Primary Jurisdiction:</span>
                <p className="text-muted-foreground">
                  {getCountryName(profile.primaryJurisdiction)}
                </p>
              </div>
              <div>
                <span className="font-medium">Fintech Category:</span>
                <p className="text-muted-foreground">
                  {profile.fintechCategory}
                </p>
              </div>
              <div>
                <span className="font-medium">Business Model:</span>
                <p className="text-muted-foreground">{profile.businessModel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services & Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.services.map((service) => (
                <Badge key={service} variant="secondary">
                  {service.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geographic Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.countryOperations.map((op) => (
              <div key={op.countryCode} className="rounded-lg border p-4">
                <div className="mb-2 font-medium">
                  {getCountryName(op.countryCode)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Operation Type:</span>
                    <p className="text-muted-foreground">{op.operationType}</p>
                  </div>
                  <div>
                    <span className="font-medium">License Status:</span>
                    <p className="text-muted-foreground">{op.licenseStatus}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Services:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {op.services.map((service) => (
                        <Badge
                          key={service}
                          variant="outline"
                          className="text-xs"
                        >
                          {service.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {profile.complianceMapping && profile.complianceMapping.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Compliance Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {profile.complianceMapping.map((mapping) => (
                  <div
                    key={`${mapping.service}-${mapping.countryCode}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="font-medium">
                      {mapping.service} - {getCountryName(mapping.countryCode)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {mapping.complianceRequirements.map((req) => (
                        <Badge key={req} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {profile.partnerships && profile.partnerships.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Partnerships</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {profile.partnerships.map((partnership, index) => {
                  const key =
                    partnership.name ||
                    `${partnership.type}-${JSON.stringify(partnership.details)}-${index}`;
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <div className="font-medium">
                        {partnership.type.replace(/_/g, " ")}
                      </div>
                      {partnership.name && (
                        <p className="text-muted-foreground">
                          {partnership.name}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit & Continue"}
        </Button>
      </div>
    </div>
  );
}
