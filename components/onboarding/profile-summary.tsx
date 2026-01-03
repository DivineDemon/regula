"use client";

import { Edit, FileText } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCountryName } from "@/lib/data/countries";
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import { cn } from "@/lib/utils";

const SERVICE_LABELS: Record<string, string> = {
  money_transfer: "Money Transfer",
  payment_processing: "Payment Processing",
  card_issuance: "Card Issuance",
  wallet_services: "Wallet Services",
  remittance: "Remittance",
  fx_services: "Foreign Exchange",
  crypto_exchange: "Cryptocurrency Exchange",
  crypto_wallet: "Cryptocurrency Wallet",
  lending: "Lending",
  investment_platform: "Investment Platform",
  savings_account: "Savings Account",
  current_account: "Current Account",
  bnpl: "Buy Now Pay Later",
  crowdfunding: "Crowdfunding",
  p2p_lending: "Peer-to-Peer Lending",
  robo_advisor: "Robo-Advisory",
  insurance_distribution: "Insurance Distribution",
  other: "Other",
};

interface ProfileSummaryProps {
  profile: OrganizationProfile;
  onEditSection?: (section: string) => void;
  showEditButtons?: boolean;
  className?: string;
}

export function ProfileSummary({
  profile,
  onEditSection,
  showEditButtons = true,
  className,
}: ProfileSummaryProps) {
  const [_expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([
      "company",
      "services",
      "geographic",
      "compliance",
      "partnerships",
    ]),
  );

  const _toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-4 print:space-y-2", className)}>
      <div className="flex items-center justify-between print:hidden">
        <h2 className="text-xl font-bold">Profile Summary</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <FileText className="mr-2 size-4" />
            Print / Save
          </Button>
        </div>
      </div>

      {/* Company Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Company Profile</span>
            {showEditButtons && onEditSection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditSection("company")}
              >
                <Edit className="mr-2 size-4" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="font-medium">Legal Entity Name:</span>
              <p className="text-muted-foreground mt-1">
                {profile.legalEntityName}
              </p>
            </div>
            {profile.tradingName && (
              <div>
                <span className="font-medium">Trading Name:</span>
                <p className="text-muted-foreground mt-1">
                  {profile.tradingName}
                </p>
              </div>
            )}
            {profile.companyRegistrationNumber && (
              <div>
                <span className="font-medium">Registration Number:</span>
                <p className="text-muted-foreground mt-1">
                  {profile.companyRegistrationNumber}
                </p>
              </div>
            )}
            {profile.dateOfIncorporation && (
              <div>
                <span className="font-medium">Date of Incorporation:</span>
                <p className="text-muted-foreground mt-1">
                  {new Date(profile.dateOfIncorporation).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <span className="font-medium">Country of Incorporation:</span>
              <p className="text-muted-foreground mt-1">
                {getCountryName(profile.countryOfIncorporation)}
              </p>
            </div>
            <div>
              <span className="font-medium">Primary Jurisdiction:</span>
              <p className="text-muted-foreground mt-1">
                {getCountryName(profile.primaryJurisdiction)}
              </p>
            </div>
            {profile.websiteUrl && (
              <div>
                <span className="font-medium">Website:</span>
                <p className="text-muted-foreground mt-1">
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {profile.websiteUrl}
                  </a>
                </p>
              </div>
            )}
            {profile.companySize && (
              <div>
                <span className="font-medium">Company Size:</span>
                <p className="text-muted-foreground mt-1 capitalize">
                  {profile.companySize}
                </p>
              </div>
            )}
            <div>
              <span className="font-medium">Fintech Category:</span>
              <p className="text-muted-foreground mt-1">
                {profile.fintechCategory}
              </p>
            </div>
            <div>
              <span className="font-medium">Business Model:</span>
              <p className="text-muted-foreground mt-1">
                {profile.businessModel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services & Products Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Services & Products</span>
            {showEditButtons && onEditSection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditSection("services")}
              >
                <Edit className="mr-2 size-4" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {profile.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No services selected
              </p>
            ) : (
              profile.services.map((service) => (
                <Badge key={service} variant="secondary">
                  {SERVICE_LABELS[service] || service.replace(/_/g, " ")}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Geographic Operations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Geographic Operations</span>
            {showEditButtons && onEditSection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditSection("geographic")}
              >
                <Edit className="mr-2 size-4" />
                Edit
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.countryOperations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No country operations defined
            </p>
          ) : (
            <div className="space-y-4">
              {profile.countryOperations.map((op, index) => (
                <div
                  key={`${op.countryCode}-${index}`}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-3 font-medium">
                    {getCountryName(op.countryCode)}
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Operation Type:</span>
                      <p className="text-muted-foreground mt-1 capitalize">
                        {op.operationType.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">License Status:</span>
                      <p className="text-muted-foreground mt-1 capitalize">
                        {op.licenseStatus.replace(/_/g, " ")}
                      </p>
                    </div>
                    {op.licenses && op.licenses.length > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium">Licenses:</span>
                        <div className="mt-2 space-y-2">
                          {op.licenses.map((license) => (
                            <div
                              key={`${license.licenseNumber}-${license.issuingAuthority}`}
                              className="rounded border p-2 text-xs"
                            >
                              <div className="font-medium">
                                {license.licenseNumber}
                              </div>
                              <div className="text-muted-foreground">
                                {license.issuingAuthority}
                              </div>
                              {license.expiryDate && (
                                <div className="text-muted-foreground">
                                  Expires:&nbsp;
                                  {new Date(
                                    license.expiryDate,
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="font-medium">Services:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {op.services.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No services
                          </span>
                        ) : (
                          op.services.map((service) => (
                            <Badge
                              key={service}
                              variant="outline"
                              className="text-xs"
                            >
                              {SERVICE_LABELS[service] ||
                                service.replace(/_/g, " ")}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Mapping Section */}
      {profile.complianceMapping && profile.complianceMapping.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Compliance Mapping</span>
              {showEditButtons && onEditSection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditSection("compliance")}
                >
                  <Edit className="mr-2 size-4" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.complianceMapping.map((mapping, index) => (
                <div
                  key={`${mapping.service}-${mapping.countryCode}-${index}`}
                  className="rounded-lg border p-3"
                >
                  <div className="mb-2 font-medium text-sm">
                    {SERVICE_LABELS[mapping.service] ||
                      mapping.service.replace(/_/g, " ")}
                    &nbsp; - {getCountryName(mapping.countryCode)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mapping.complianceRequirements.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No requirements
                      </span>
                    ) : (
                      mapping.complianceRequirements.map((req) => (
                        <Badge key={req} variant="outline" className="text-xs">
                          {req.replace(/_/g, " ")}
                        </Badge>
                      ))
                    )}
                  </div>
                  {mapping.context && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {mapping.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Framework Section */}
      {profile.complianceFramework && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Framework</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {profile.complianceFramework.amlFramework && (
                <div>
                  <span className="font-medium">AML Framework:</span>
                  <p className="text-muted-foreground mt-1">
                    {profile.complianceFramework.amlFramework}
                  </p>
                </div>
              )}
              {profile.complianceFramework.kycProcedures && (
                <div>
                  <span className="font-medium">KYC Procedures:</span>
                  <p className="text-muted-foreground mt-1">
                    {profile.complianceFramework.kycProcedures}
                  </p>
                </div>
              )}
              {profile.complianceFramework.dataProtectionFramework && (
                <div>
                  <span className="font-medium">
                    Data Protection Framework:
                  </span>
                  <p className="text-muted-foreground mt-1">
                    {profile.complianceFramework.dataProtectionFramework}
                  </p>
                </div>
              )}
              {profile.complianceFramework.certifications &&
                profile.complianceFramework.certifications.length > 0 && (
                  <div>
                    <span className="font-medium">Certifications:</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {profile.complianceFramework.certifications.map(
                        (cert) => (
                          <Badge
                            key={cert}
                            variant="secondary"
                            className="text-xs"
                          >
                            {cert}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partnerships Section */}
      {profile.partnerships && profile.partnerships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Partnerships</span>
              {showEditButtons && onEditSection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditSection("partnerships")}
                >
                  <Edit className="mr-2 size-4" />
                  Edit
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile.partnerships.map((partnership, index) => {
                const key =
                  partnership.name ||
                  `${partnership.type}-${JSON.stringify(
                    partnership.details,
                  )}-${index}`;
                return (
                  <div key={key} className="rounded-lg border p-3">
                    <div className="font-medium text-sm capitalize">
                      {partnership.type.replace(/_/g, " ")}
                    </div>
                    {partnership.name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {partnership.name}
                      </p>
                    )}
                    {partnership.details && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {partnership.details.network && (
                          <div>Network: {partnership.details.network}</div>
                        )}
                        {partnership.details.system && (
                          <div>System: {partnership.details.system}</div>
                        )}
                        {partnership.details.corridors &&
                          partnership.details.corridors.length > 0 && (
                            <div>
                              Corridors:&nbsp;
                              {partnership.details.corridors
                                .map((c) => getCountryName(c))
                                .join(", ")}
                            </div>
                          )}
                        {partnership.details.count && (
                          <div>Count: {partnership.details.count}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
