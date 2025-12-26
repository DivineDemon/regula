"use client";

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCountryName } from "@/lib/data/countries";
import type {
  ComplianceRequirement,
  FintechService,
  ServiceCountryCompliance,
} from "@/lib/types/organization-profile";
import { cn } from "@/lib/utils";

const COMPLIANCE_REQUIREMENTS: {
  value: ComplianceRequirement;
  label: string;
}[] = [
  { value: "AML", label: "Anti-Money Laundering (AML)" },
  { value: "KYC", label: "Know Your Customer (KYC)" },
  { value: "CTF", label: "Counter-Terrorism Financing (CTF)" },
  { value: "GDPR", label: "General Data Protection Regulation (GDPR)" },
  { value: "PCI_DSS", label: "PCI DSS" },
  { value: "PSD2", label: "Payment Services Directive 2 (PSD2)" },
  { value: "EMI_License", label: "EMI License" },
  { value: "PSP_License", label: "PSP License" },
  { value: "Banking_License", label: "Banking License" },
  { value: "Remittance_License", label: "Remittance License" },
  { value: "Crypto_License", label: "Cryptocurrency License" },
  { value: "Securities_License", label: "Securities License" },
  { value: "Insurance_License", label: "Insurance License" },
  { value: "Data_Protection", label: "Data Protection" },
  { value: "Consumer_Protection", label: "Consumer Protection" },
  { value: "Capital_Requirements", label: "Capital Requirements" },
  { value: "Reporting_Requirements", label: "Regulatory Reporting" },
  { value: "Audit_Requirements", label: "Audit Requirements" },
  { value: "Other", label: "Other" },
];

const SERVICE_LABELS: Record<FintechService, string> = {
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

interface ComplianceMatrixProps {
  value: ServiceCountryCompliance[];
  onChange: (value: ServiceCountryCompliance[]) => void;
  availableServices?: FintechService[];
  availableCountries?: string[];
  disabled?: boolean;
  className?: string;
}

export function ComplianceMatrix({
  value = [],
  onChange,
  availableServices,
  availableCountries,
  disabled = false,
  className,
}: ComplianceMatrixProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addMapping = () => {
    onChange([
      ...value,
      {
        service: availableServices?.[0] || "money_transfer",
        countryCode: availableCountries?.[0] || "",
        complianceRequirements: [],
      },
    ]);
  };

  const removeMapping = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  const updateMapping = (
    index: number,
    updates: Partial<ServiceCountryCompliance>,
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const toggleComplianceRequirement = (
    index: number,
    requirement: ComplianceRequirement,
  ) => {
    const mapping = value[index];
    const current = mapping.complianceRequirements || [];
    const updated = current.includes(requirement)
      ? current.filter((r) => r !== requirement)
      : [...current, requirement];
    updateMapping(index, { complianceRequirements: updated });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">
            Service-Country-Compliance Matrix
          </h3>
          <p className="text-xs text-muted-foreground">
            Map compliance requirements to service-country combinations
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addMapping}
          disabled={disabled}
        >
          <Plus className="mr-2 size-4" />
          Add Mapping
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No compliance mappings yet. Click "Add Mapping" to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((mapping, index) => {
            const isExpanded = expandedRows.has(index);
            const serviceLabel =
              SERVICE_LABELS[mapping.service as FintechService] ||
              mapping.service;
            const countryLabel = getCountryName(mapping.countryCode);

            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: Mappings can have duplicates, index is used for state management
                key={index}
                className="rounded-lg border bg-card transition-colors"
              >
                {/* Row Header */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => toggleRow(index)}
                    disabled={disabled}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                  <div className="flex flex-1 items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {serviceLabel}
                    </Badge>
                    <span className="text-muted-foreground">×</span>
                    <Badge variant="outline" className="text-xs">
                      {countryLabel || mapping.countryCode}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({mapping.complianceRequirements?.length || 0}{" "}
                      requirements)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMapping(index)}
                    disabled={disabled}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium mb-2 block">
                          Service
                        </div>
                        <Select
                          value={mapping.service}
                          onValueChange={(service) =>
                            updateMapping(index, {
                              service: service as FintechService,
                            })
                          }
                          disabled={disabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              availableServices || Object.keys(SERVICE_LABELS)
                            ).map((service) => (
                              <SelectItem key={service} value={service}>
                                {SERVICE_LABELS[service as FintechService] ||
                                  service}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor={`country-${index}`}
                          className="text-xs font-medium mb-2 block"
                        >
                          Country
                        </label>
                        <Input
                          id={`country-${index}`}
                          placeholder="Country code (e.g., US, GB)"
                          value={mapping.countryCode}
                          onChange={(e) =>
                            updateMapping(index, {
                              countryCode: e.target.value.toUpperCase(),
                            })
                          }
                          disabled={disabled}
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium mb-2 block">
                        Compliance Requirements
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto rounded-md border p-3">
                        {COMPLIANCE_REQUIREMENTS.map((req) => {
                          const isSelected =
                            mapping.complianceRequirements?.includes(
                              req.value,
                            ) || false;
                          const checkboxId = `compliance-${index}-${req.value}`;
                          return (
                            <label
                              key={req.value}
                              htmlFor={checkboxId}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <Checkbox
                                id={checkboxId}
                                checked={isSelected}
                                onCheckedChange={() =>
                                  toggleComplianceRequirement(index, req.value)
                                }
                                disabled={disabled}
                              />
                              <span className="text-sm flex-1">
                                {req.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`context-${index}`}
                        className="text-xs font-medium mb-2 block"
                      >
                        Context / Notes
                      </label>
                      <Textarea
                        id={`context-${index}`}
                        placeholder="Additional context or notes..."
                        value={mapping.context || ""}
                        onChange={(e) =>
                          updateMapping(index, { context: e.target.value })
                        }
                        disabled={disabled}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
