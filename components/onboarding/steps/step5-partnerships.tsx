"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
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
      // Filter out existing banking_partner and technology_partner entries
      // to avoid duplicates when resubmitting
      const otherPartnerships = (data.partnerships || []).filter(
        (p) => p.type !== "banking_partner" && p.type !== "technology_partner",
      );

      // Add banking partners (replace any existing ones)
      const bankingPartnerships = bankingPartners.map((name) => ({
        type: "banking_partner" as const,
        name,
      }));

      // Add technology partners (replace any existing ones)
      const technologyPartnerships = technologyPartners.map((name) => ({
        type: "technology_partner" as const,
        name,
      }));

      // Combine: other partnerships + new banking + new technology
      const allPartnerships = [
        ...otherPartnerships,
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
    <div className="w-full max-w-1/2 mx-auto flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-center justify-center">
        <h2 className="w-full text-left text-2xl font-bold">Partnerships</h2>
        <p className="w-full text-left text-muted-foreground">
          Tell us about your key partnerships and integrations
        </p>
      </div>
      <Form {...form}>
        <form className="w-full h-full" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="w-full h-[calc(100vh-392px)] flex flex-col items-start justify-start gap-5 overflow-y-auto pb-5">
            <div className="w-full col-span-2 flex flex-col items-center justify-center gap-2">
              <Label
                htmlFor="banking-partners"
                className="w-full text-left text-xs uppercase text-muted-foreground"
              >
                Banking Partners
              </Label>
              <div className="w-full flex items-center justify-center gap-2">
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
                  size="icon"
                  type="button"
                  variant="default"
                  disabled={isSubmitting}
                  onClick={addBankingPartner}
                >
                  <Plus />
                </Button>
              </div>
              {bankingPartners.length > 0 && (
                <div className="w-full items-start justify-start flex flex-wrap gap-2">
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
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-2">
              <Label
                htmlFor="payment-network-partners"
                className="w-full text-left text-xs uppercase text-muted-foreground"
              >
                Payment Network Partners
              </Label>
              <div className="w-full grid grid-cols-2 gap-4">
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
                    className="w-full border rounded-md p-2 flex items-center gap-2 cursor-pointer"
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
                    <span className="text-sm flex-1 text-left">{network}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-2">
              <Label
                htmlFor="payment-system-integrations"
                className="w-full text-left text-xs uppercase text-muted-foreground"
              >
                Payment System Integrations
              </Label>
              <div className="w-full grid grid-cols-2 gap-4">
                {["Raast", "UPI", "Mobile Money", "SWIFT", "SEPA"].map(
                  (network) => (
                    // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside label, which is semantically correct
                    <label
                      key={network}
                      className="w-full border rounded-md p-2 flex items-center gap-2 cursor-pointer"
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
                      <span className="text-sm flex-1 text-left">
                        {network}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>
            <FormField
              control={form.control}
              name={
                remittancePartnerIndex !== -1
                  ? `partnerships.${remittancePartnerIndex}.details.count`
                  : "partnerships"
              }
              render={({ field: _field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="w-full text-left text-xs uppercase text-muted-foreground">
                    Number of Remittance Partners
                  </FormLabel>
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
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="w-full text-left text-xs uppercase text-muted-foreground">
                    Major Remittance Corridors
                  </FormLabel>
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
            <div className="w-full col-span-2 flex flex-col items-center justify-center gap-2">
              <Label
                htmlFor="banking-partners"
                className="w-full text-left text-xs uppercase text-muted-foreground"
              >
                Technology Partners
              </Label>
              <div className="w-full flex items-center justify-center gap-2">
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
                  size="icon"
                  type="button"
                  variant="default"
                  disabled={isSubmitting}
                  onClick={addTechnologyPartner}
                >
                  <Plus />
                </Button>
              </div>
              {technologyPartners.length > 0 && (
                <div className="w-full items-start justify-start flex flex-wrap gap-2">
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
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="w-full grid grid-cols-2 items-center justify-center gap-5 mt-auto">
            <Button
              type="button"
              variant="outline"
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
