"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCountryName } from "@/lib/data/countries";
import type {
  OrganizationProfile,
  Partnership,
} from "@/lib/types/organization-profile";

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

  const splitPartnerships = () => {
    let final = {};
    const types = new Set(profile.partnerships?.map((ps) => ps.type));

    types.forEach((type) => {
      final = {
        ...final,
        [type]: profile?.partnerships?.filter((ps) => ps.type === type),
      };
    });

    return final;
  };

  return (
    <div className="w-full max-w-1/2 mx-auto flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-center justify-center">
        <h2 className="w-full text-left text-2xl font-bold">Review & Submit</h2>
        <p className="w-full text-left text-muted-foreground">
          Please review your information before submitting
        </p>
      </div>
      <div className="w-full h-[calc(100vh-412px)] overflow-y-auto grid grid-cols-2 gap-5 items-start justify-start">
        <div className="w-full col-span-1 flex flex-col items-start justify-start gap-5">
          <div className="w-full flex flex-col items-start justify-start border rounded-lg shadow">
            <span className="p-2.5 w-full text-left border-b font-semibold">
              Company Profile
            </span>
            <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
              <span className="font-medium w-full text-left">
                Legal Entity Name:
              </span>
              <p className="text-muted-foreground w-full text-right">
                {profile.legalEntityName}
              </p>
            </div>
            <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
              <span className="font-medium w-full text-left">
                Trading Name:
              </span>
              <p className="text-muted-foreground w-full text-right">
                {profile.tradingName}
              </p>
            </div>
            <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
              <span className="font-medium w-full text-left">
                Country of Incorporation:
              </span>
              <p className="text-muted-foreground w-full text-right">
                {profile.countryOfIncorporation}
              </p>
            </div>
            <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
              <span className="font-medium w-full text-left">
                Primary Jurisdiction:
              </span>
              <p className="text-muted-foreground w-full text-right">
                {profile.primaryJurisdiction}
              </p>
            </div>
            <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
              <span className="font-medium w-full text-left">
                Fintech Category:
              </span>
              <p className="text-muted-foreground w-full text-right">
                {profile.fintechCategory}
              </p>
            </div>
            <div className="w-full flex items-center justify-center gap-2.5 p-2.5 text-sm">
              <span className="font-medium w-full text-left">
                Business Model:
              </span>
              <p className="text-muted-foreground w-full text-right">
                {profile.businessModel}
              </p>
            </div>
          </div>
          {profile.complianceMapping &&
            profile.complianceMapping.length > 0 && (
              <div className="w-full flex flex-col items-start justify-start border rounded-lg shadow">
                <span className="p-2.5 w-full text-left border-b font-semibold">
                  Compliance Mapping
                </span>
                {profile.complianceMapping.map((mapping) => (
                  <div
                    key={`${mapping.service}-${mapping.countryCode}`}
                    className="w-full"
                  >
                    <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
                      <span className="font-medium w-full text-left capitalize">
                        {mapping.service.split("_").join(" ")}:
                      </span>
                      <span className="text-muted-foreground w-full text-right capitalize">
                        {getCountryName(mapping.countryCode)}
                      </span>
                    </div>
                    <div className="w-full flex flex-wrap items-start justify-start gap-2 p-2.5">
                      {mapping.complianceRequirements.map((req) => (
                        <Badge key={req} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
        <div className="w-full col-span-1 flex flex-col items-start justify-start gap-5">
          <div className="w-full flex flex-col items-start justify-start border rounded-lg shadow">
            <span className="p-2.5 w-full text-left border-b font-semibold">
              Services & Products
            </span>
            <div className="w-full flex flex-wrap items-start justify-start gap-2 p-2.5">
              {profile.services.map((service) => (
                <Badge key={service} variant="secondary" className="capitalize">
                  {service.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="w-full flex flex-col items-start justify-start border rounded-lg shadow">
            <span className="p-2.5 w-full text-left border-b font-semibold">
              Geographic Operations
            </span>
            {profile.countryOperations.map((op) => (
              <div
                key={op.countryCode}
                className="w-full flex flex-col items-start justify-start"
              >
                <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
                  <span className="font-medium w-full text-left">Country:</span>
                  <p className="text-muted-foreground w-full text-right">
                    {getCountryName(op.countryCode)}
                  </p>
                </div>
                <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
                  <span className="font-medium w-full text-left">
                    Operation Type:
                  </span>
                  <p className="text-muted-foreground w-full text-right capitalize">
                    {op.operationType}
                  </p>
                </div>
                <div className="w-full flex items-center justify-center gap-2.5 p-2.5 border-b text-sm">
                  <span className="font-medium w-full text-left">
                    License Status:
                  </span>
                  <p className="text-muted-foreground w-full text-right capitalize">
                    {op.licenseStatus}
                  </p>
                </div>
                <div className="w-full flex items-center justify-center gap-2.5 p-2.5 text-sm">
                  <span className="font-medium text-left">Services:</span>
                  <div className="w-full flex flex-wrap items-end justify-end gap-2">
                    {op.services.map((service) => (
                      <Badge
                        key={service}
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {service.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {profile.partnerships && profile.partnerships.length > 0 && (
          <div className="w-full col-span-2 flex flex-col items-start justify-start border rounded-lg shadow">
            <span className="p-2.5 w-full text-left border-b font-semibold">
              Partnerships
            </span>
            {Object.entries(splitPartnerships()).map(
              ([type, ps], typeIndex, allTypes) => {
                const partnerships = ps as Partnership[];
                const isLastType = typeIndex === allTypes.length - 1;

                return (
                  <div
                    key={type}
                    className="w-full flex flex-col items-start justify-start"
                  >
                    {type === "banking_partner" && partnerships.length > 0 && (
                      <div
                        className={`w-full flex items-center justify-center gap-2.5 p-2.5 text-sm ${
                          !isLastType ? "border-b" : ""
                        }`}
                      >
                        <span className="font-medium w-full text-left capitalize">
                          Banking Partners:
                        </span>
                        <div className="w-full flex flex-wrap items-end justify-end gap-2">
                          {partnerships.map((p) => (
                            <Badge
                              key={p.name}
                              variant="outline"
                              className="text-xs"
                            >
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {type === "technology_partner" &&
                      partnerships.length > 0 && (
                        <div
                          className={`w-full flex items-center justify-center gap-2.5 p-2.5 text-sm ${
                            !isLastType ? "border-b" : ""
                          }`}
                        >
                          <span className="font-medium w-full text-left capitalize">
                            Technology Partners:
                          </span>
                          <div className="w-full flex flex-wrap items-end justify-end gap-2">
                            {partnerships.map((p) => (
                              <Badge
                                key={p.name}
                                variant="outline"
                                className="text-xs"
                              >
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    {type === "payment_network" && partnerships.length > 0 && (
                      <div
                        className={`w-full flex items-center justify-center gap-2.5 p-2.5 text-sm ${
                          !isLastType ? "border-b" : ""
                        }`}
                      >
                        <span className="font-medium w-full text-left capitalize">
                          Payment Networks:
                        </span>
                        <div className="w-full flex flex-wrap items-end justify-end gap-2">
                          {partnerships.map((p, idx) => (
                            <Badge
                              key={p.details?.network || idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {p.details?.network}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {type === "remittance_partner" &&
                      partnerships.length > 0 &&
                      partnerships.map((p, partnerIndex) => {
                        const isLastPartner =
                          partnerIndex === partnerships.length - 1;
                        const hasCorridors =
                          p.details?.corridors &&
                          p.details.corridors.length > 0;
                        const shouldShowBorder =
                          !isLastType || !isLastPartner || hasCorridors;
                        // Create unique key from count and corridors
                        // Using index as fallback since remittance partners can have identical data
                        const corridorsKey = (p.details?.corridors || [])
                          .sort()
                          .join("-");
                        const uniqueKey = `remittance-${p.details?.count || 0}-${corridorsKey || "none"}-${partnerIndex}`;
                        return (
                          <div
                            key={uniqueKey}
                            className="w-full flex flex-col items-start justify-start"
                          >
                            <div
                              className={`w-full flex items-center justify-center gap-2.5 p-2.5 text-sm ${
                                shouldShowBorder ? "border-b" : ""
                              }`}
                            >
                              <span className="font-medium w-full text-left capitalize">
                                Remittance Partners:
                              </span>
                              <p className="text-muted-foreground w-full text-right">
                                {p.details?.count || 0} partner
                                {p.details?.count !== 1 ? "s" : ""}
                              </p>
                            </div>
                            {hasCorridors && (
                              <div className="w-full flex items-center justify-center gap-2.5 p-2.5 text-sm border-b">
                                <span className="font-medium w-full text-left">
                                  Major Corridors:
                                </span>
                                <div className="w-full flex flex-wrap items-end justify-end gap-2">
                                  {p.details?.corridors?.map((countryCode) => (
                                    <Badge
                                      key={countryCode}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {getCountryName(countryCode)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              },
            )}
          </div>
        )}
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
