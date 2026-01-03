"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Handshake, Plus } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CountrySelector } from "@/components/shared/country-selector";
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
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import type { CompanyProfileInput } from "@/lib/validations/organization-profile";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

interface Step5PartnershipsProps {
  initialData?: Partial<OrganizationProfile>;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step5Partnerships({
  initialData,
  onComplete,
  onBack,
}: Step5PartnershipsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankingPartners, setBankingPartners] = useState<string[]>(
    initialData?.partnerships
      ?.filter((p) => p.type === "banking_partner")
      .map((p) => p.name || "") || [],
  );
  const [newBankingPartner, setNewBankingPartner] = useState("");
  const [technologyPartners, setTechnologyPartners] = useState<string[]>(
    initialData?.partnerships
      ?.filter((p) => p.type === "technology_partner")
      .map((p) => p.name || "") || [],
  );
  const [newTechnologyPartner, setNewTechnologyPartner] = useState("");

  const form = useForm<Pick<CompanyProfileInput, "partnerships">>({
    resolver: zodResolver(companyProfileSchema.pick({ partnerships: true })),
    defaultValues: {
      partnerships: initialData?.partnerships || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partnerships",
  });

  const onSubmit = async (data: Pick<CompanyProfileInput, "partnerships">) => {
    setIsSubmitting(true);
    try {
      // Add banking partners
      const bankingPartnerships = bankingPartners.map((name) => ({
        type: "banking_partner" as const,
        name,
      }));
      // Add technology partners
      const technologyPartnerships = technologyPartners.map((name) => ({
        type: "technology_partner" as const,
        name,
      }));
      const allPartnerships = [
        ...(data.partnerships || []),
        ...bankingPartnerships,
        ...technologyPartnerships,
      ];
      onComplete({ partnerships: allPartnerships });
    } catch (error) {
      console.error("Error saving partnerships:", error);
      toast.error("Failed to save partnerships. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBankingPartner = () => {
    if (newBankingPartner.trim()) {
      setBankingPartners([...bankingPartners, newBankingPartner.trim()]);
      setNewBankingPartner("");
    }
  };

  const addTechnologyPartner = () => {
    if (newTechnologyPartner.trim()) {
      setTechnologyPartners([
        ...technologyPartners,
        newTechnologyPartner.trim(),
      ]);
      setNewTechnologyPartner("");
    }
  };

  // Get remittance partner field index and corridors value
  const remittancePartnerIndex = fields.findIndex(
    (f) => f.type === "remittance_partner",
  );
  const remittanceCorridors =
    remittancePartnerIndex !== -1
      ? fields[remittancePartnerIndex]?.details?.corridors || []
      : [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Handshake className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Partnerships</h2>
        <p className="mt-2 text-muted-foreground">
          Tell us about your key partnerships and integrations
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Banking Partners</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter banking partner name"
                value={newBankingPartner}
                onChange={(e) => setNewBankingPartner(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBankingPartner();
                  }
                }}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addBankingPartner}
                disabled={isSubmitting}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {bankingPartners.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bankingPartners.map((partner, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: Partners can have duplicates, need index for uniqueness
                    key={`${partner}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-sm"
                  >
                    <span>{partner}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setBankingPartners(
                          bankingPartners.filter((_, i) => i !== index),
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Payment Network Partners</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                "Visa",
                "Mastercard",
                "American Express",
                "Discover",
                "JCB",
                "UnionPay",
              ].map((network) => (
                // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label, which is semantically correct
                <label
                  key={network}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox
                    checked={fields.some(
                      (f) =>
                        f.type === "payment_network" &&
                        f.details?.network === network,
                    )}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        append({
                          type: "payment_network",
                          details: { network },
                        });
                      } else {
                        const index = fields.findIndex(
                          (f) =>
                            f.type === "payment_network" &&
                            f.details?.network === network,
                        );
                        if (index !== -1) remove(index);
                      }
                    }}
                  />
                  <span className="text-sm">{network}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Payment System Integrations</h3>
            <div className="grid grid-cols-2 gap-4">
              {["Raast", "UPI", "Mobile Money", "SWIFT", "SEPA"].map(
                (system) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label, which is semantically correct
                  <label
                    key={system}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={fields.some(
                        (f) =>
                          f.type === "payment_system" &&
                          f.details?.system === system,
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          append({
                            type: "payment_system",
                            details: { system },
                          });
                        } else {
                          const index = fields.findIndex(
                            (f) =>
                              f.type === "payment_system" &&
                              f.details?.system === system,
                          );
                          if (index !== -1) remove(index);
                        }
                      }}
                    />
                    <span className="text-sm">{system}</span>
                  </label>
                ),
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Remittance Partners</h3>
            <FormField
              control={form.control}
              name={
                remittancePartnerIndex !== -1
                  ? `partnerships.${remittancePartnerIndex}.details.count`
                  : "partnerships"
              }
              render={({ field: _field }) => (
                <FormItem>
                  <FormLabel>Number of Remittance Partners</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      value={
                        remittancePartnerIndex !== -1
                          ? fields[remittancePartnerIndex]?.details?.count || ""
                          : ""
                      }
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10);
                        if (!Number.isNaN(count) && count >= 0) {
                          if (remittancePartnerIndex !== -1) {
                            form.setValue(
                              `partnerships.${remittancePartnerIndex}.details.count`,
                              count,
                            );
                          } else {
                            // Get existing corridors if any
                            const existingCorridors =
                              fields.find(
                                (f) => f.type === "remittance_partner",
                              )?.details?.corridors || [];
                            append({
                              type: "remittance_partner",
                              details: {
                                count,
                                ...(existingCorridors.length > 0 && {
                                  corridors: existingCorridors,
                                }),
                              },
                            });
                          }
                        } else if (e.target.value === "") {
                          // Allow clearing the field
                          if (remittancePartnerIndex !== -1) {
                            form.setValue(
                              `partnerships.${remittancePartnerIndex}.details.count`,
                              undefined,
                            );
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={
                remittancePartnerIndex !== -1
                  ? `partnerships.${remittancePartnerIndex}.details.corridors`
                  : "partnerships"
              }
              render={() => (
                <FormItem>
                  <FormLabel>Major Remittance Corridors</FormLabel>
                  <FormControl>
                    <CountrySelector
                      value={remittanceCorridors as string[]}
                      onChange={(countries) => {
                        if (remittancePartnerIndex !== -1) {
                          form.setValue(
                            `partnerships.${remittancePartnerIndex}.details.corridors`,
                            countries,
                          );
                        } else {
                          // Get existing count if any
                          const existingCount = fields.find(
                            (f) => f.type === "remittance_partner",
                          )?.details?.count;
                          append({
                            type: "remittance_partner",
                            details: {
                              corridors: countries,
                              ...(existingCount && { count: existingCount }),
                            },
                          });
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">Technology Partners</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter technology partner name"
                value={newTechnologyPartner}
                onChange={(e) => setNewTechnologyPartner(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTechnologyPartner();
                  }
                }}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTechnologyPartner}
                disabled={isSubmitting}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {technologyPartners.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {technologyPartners.map((partner, index) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: Partners can have duplicates, need index for uniqueness
                    key={`${partner}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-sm"
                  >
                    <span>{partner}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setTechnologyPartners(
                          technologyPartners.filter((_, i) => i !== index),
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Continue"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
