"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ComplianceRequirement,
  OrganizationProfile,
} from "@/lib/types/organization-profile";
import { cn } from "@/lib/utils";
import type { CompanyProfileInput } from "@/lib/validations/organization-profile";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

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

const SERVICE_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "money_transfer", label: "Money Transfer" },
  { value: "payment_processing", label: "Payment Processing" },
  { value: "card_issuance", label: "Card Issuance" },
  { value: "wallet_services", label: "Wallet Services" },
  { value: "remittance", label: "Remittance" },
  { value: "fx_services", label: "FX Services" },
  { value: "crypto_exchange", label: "Crypto Exchange" },
  { value: "crypto_wallet", label: "Crypto Wallet" },
  { value: "lending", label: "Lending" },
  { value: "investment_platform", label: "Investment Platform" },
  { value: "savings_account", label: "Savings Account" },
  { value: "current_account", label: "Current Account" },
  { value: "bnpl", label: "BNPL" },
  { value: "crowdfunding", label: "Crowdfunding" },
  { value: "p2p_lending", label: "P2P Lending" },
  { value: "robo_advisor", label: "Robo Advisor" },
  { value: "insurance_distribution", label: "Insurance Distribution" },
  { value: "other", label: "Other" },
];

interface Step4ComplianceMappingProps {
  initialData?: Partial<OrganizationProfile>;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step4ComplianceMapping({
  initialData,
  onComplete,
  onBack,
}: Step4ComplianceMappingProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<
    Pick<CompanyProfileInput, "complianceMapping" | "complianceFramework">
  >({
    resolver: zodResolver(
      companyProfileSchema.pick({
        complianceMapping: true,
        complianceFramework: true,
      }),
    ),
    defaultValues: {
      complianceMapping: initialData?.complianceMapping || [],
      complianceFramework: initialData?.complianceFramework || {},
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "complianceMapping",
  });

  const onSubmit = async (
    data: Pick<
      CompanyProfileInput,
      "complianceMapping" | "complianceFramework"
    >,
  ) => {
    // Validate that each compliance mapping has at least one requirement
    if (data.complianceMapping) {
      const emptyRequirements = data.complianceMapping.filter(
        (mapping) =>
          !mapping.complianceRequirements ||
          mapping.complianceRequirements.length === 0,
      );
      if (emptyRequirements.length > 0) {
        toast.error(
          "Each compliance mapping must have at least one compliance requirement. Please add requirements to all mappings.",
        );
        form.setError("complianceMapping", {
          type: "manual",
          message: "Each mapping must have at least one compliance requirement",
        });
        return;
      }

      // Validate country codes are valid (2 uppercase letters)
      const invalidCountryCodes = data.complianceMapping.filter(
        (mapping) =>
          !mapping.countryCode || !/^[A-Z]{2}$/.test(mapping.countryCode),
      );
      if (invalidCountryCodes.length > 0) {
        toast.error(
          "Invalid country codes detected. Country codes must be 2 uppercase letters (e.g., US, UK).",
        );
        form.setError("complianceMapping", {
          type: "manual",
          message: "Invalid country code format",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      onComplete(data);
    } catch (error) {
      console.error("Error saving compliance mapping:", error);
      toast.error("Failed to save compliance mapping. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-1/2 mx-auto flex flex-col items-start justify-start gap-5">
      <div className="w-full flex items-center justify-center">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="w-full text-left text-2xl font-bold">
            Compliance Mapping
          </h2>
          <p className="w-full text-left text-muted-foreground">
            Map compliance requirements to your services and countries
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              service: "money_transfer",
              countryCode: "",
              complianceRequirements: [],
            })
          }
          disabled={isSubmitting}
        >
          <Plus />
          Add Mapping
        </Button>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full h-full grid grid-cols-2 gap-5 items-start justify-start"
        >
          {fields.length > 0 && (
            <div className="w-full h-[calc(100vh-412px)] flex flex-col items-start justify-start gap-5 overflow-y-auto col-span-1">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="w-full flex flex-col items-start justify-start gap-5 border rounded-lg p-5 col-span-1"
                >
                  <div className="w-full grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`complianceMapping.${index}.service`}
                      render={({ field }) => (
                        <FormItem className="w-full flex flex-col items-start justify-start">
                          <FormLabel className="text-xs uppercase text-muted-foreground">
                            Service <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Select
                              disabled={isSubmitting}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                              <SelectContent>
                                {SERVICE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`complianceMapping.${index}.countryCode`}
                      render={({ field }) => (
                        <FormItem className="w-full flex flex-col items-start justify-start">
                          <FormLabel className="text-xs uppercase text-muted-foreground">
                            Country Code <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., US"
                              disabled={isSubmitting}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`complianceMapping.${index}.complianceRequirements`}
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-start justify-start">
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Compliance Requirements&nbsp;
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="w-full flex flex-col items-start justify-start gap-2 max-h-[200px] overflow-y-auto rounded-md border">
                            {COMPLIANCE_REQUIREMENTS.map((req) => (
                              <div
                                key={req.value}
                                className="w-full flex items-center justify-center p-2 gap-2 border-b"
                              >
                                <Checkbox
                                  checked={field.value?.includes(req.value)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, req.value]);
                                    } else {
                                      field.onChange(
                                        current.filter((r) => r !== req.value),
                                      );
                                    }
                                  }}
                                />
                                {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label wrapper, which is semantically correct */}
                                <label className="text-sm flex-1 text-left">
                                  {req.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`complianceMapping.${index}.context`}
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-start justify-start">
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Context / Notes
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional context or notes..."
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSubmitting}
                    className="w-full col-span-2"
                    onClick={() => remove(index)}
                  >
                    Remove Mapping
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div
            className={cn(
              "w-full h-[calc(100vh-412px)] flex flex-col items-start justify-start gap-3",
              {
                "col-span-1": fields.length > 0,
                "col-span-2": fields.length === 0,
              },
            )}
          >
            <FormField
              control={form.control}
              name="complianceFramework.amlFramework"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    AML Framework
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., FATF Recommendations"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complianceFramework.dataProtectionFramework"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    Data Protection Framework
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., GDPR, CCPA"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complianceFramework.kycProcedures"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    KYC Procedures
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your KYC procedures..."
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complianceFramework.privacyPolicyUrl"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    Privacy Policy URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/privacy"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complianceFramework.termsOfServiceUrl"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    Terms of Service URL
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/terms"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complianceFramework.certifications"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    Regulatory Certifications
                  </FormLabel>
                  <FormControl>
                    <div className="w-full grid grid-cols-2 gap-2.5 items-center justify-center p-2.5 border rounded-lg">
                      {[
                        "PCI DSS",
                        "ISO 27001",
                        "ISO 9001",
                        "SOC 2",
                        "Other",
                      ].map((cert) => (
                        <div
                          key={cert}
                          className="w-full col-span-1 flex items-center justify-start gap-2.5"
                        >
                          <Checkbox
                            checked={field.value?.includes(cert)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, cert]);
                              } else {
                                field.onChange(
                                  current.filter((c) => c !== cert),
                                );
                              }
                            }}
                          />
                          {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label wrapper, which is semantically correct */}
                          <label className="text-sm">{cert}</label>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-full col-span-2 grid grid-cols-2 gap-5 mt-auto">
            <Button
              type="button"
              onClick={onBack}
              variant="outline"
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Continue"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
