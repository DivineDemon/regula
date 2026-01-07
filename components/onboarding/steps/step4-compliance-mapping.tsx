"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Shield, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type {
  ComplianceRequirement,
  OrganizationProfile,
} from "@/lib/types/organization-profile";
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
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Shield className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Compliance Mapping</h2>
        <p className="mt-2 text-muted-foreground">
          Map compliance requirements to your services and countries
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Service-Country-Compliance Matrix</h3>
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
                <Plus className="mr-2 size-4" />
                Add Mapping
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Mapping {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`complianceMapping.${index}.service`}
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-start justify-start">
                        <FormLabel>Service *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., money_transfer"
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
                    name={`complianceMapping.${index}.countryCode`}
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-start justify-start">
                        <FormLabel>Country Code *</FormLabel>
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
                      <FormLabel>Compliance Requirements *</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto rounded-md border p-4">
                          {COMPLIANCE_REQUIREMENTS.map((req) => (
                            <div
                              key={req.value}
                              className="flex items-center space-x-2"
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
                              <label className="text-sm">{req.label}</label>
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
                      <FormLabel>Context / Notes</FormLabel>
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
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Compliance Framework</h3>

            <FormField
              control={form.control}
              name="complianceFramework.amlFramework"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>AML Framework</FormLabel>
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
              name="complianceFramework.kycProcedures"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>KYC Procedures</FormLabel>
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
              name="complianceFramework.dataProtectionFramework"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>Data Protection Framework</FormLabel>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="complianceFramework.privacyPolicyUrl"
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Privacy Policy URL</FormLabel>
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
                    <FormLabel>Terms of Service URL</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="complianceFramework.certifications"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>Regulatory Certifications</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {[
                        "PCI DSS",
                        "ISO 27001",
                        "ISO 9001",
                        "SOC 2",
                        "Other",
                      ].map((cert) => (
                        <div key={cert} className="flex items-center space-x-2">
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

          <div className="flex items-center justify-between gap-4 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
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
