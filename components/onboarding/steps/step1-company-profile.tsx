"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/lib/data/countries";
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import type { CompanyProfileInput } from "@/lib/validations/organization-profile";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

interface Step1CompanyProfileProps {
  organizationId: string;
  initialData?: Partial<OrganizationProfile>;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step1CompanyProfile({
  organizationId: _organizationId,
  initialData,
  onComplete,
  onBack,
}: Step1CompanyProfileProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Partial<CompanyProfileInput>>({
    resolver: zodResolver(companyProfileSchema.partial()),
    defaultValues: {
      legalEntityName: initialData?.legalEntityName || "",
      tradingName: initialData?.tradingName || "",
      companyRegistrationNumber: initialData?.companyRegistrationNumber || "",
      dateOfIncorporation: initialData?.dateOfIncorporation || "",
      countryOfIncorporation: initialData?.countryOfIncorporation || "",
      websiteUrl: initialData?.websiteUrl || "",
      companySize: initialData?.companySize || undefined,
      fintechCategory: initialData?.fintechCategory || undefined,
      businessModel: initialData?.businessModel || undefined,
      primaryJurisdiction: initialData?.primaryJurisdiction || "",
    },
  });

  const onSubmit = async (data: Partial<CompanyProfileInput>) => {
    setIsSubmitting(true);
    try {
      onComplete(data);
    } catch (error) {
      console.error("Error saving company profile:", error);
      toast.error("Failed to save company profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Building2 className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Company Profile</h2>
        <p className="mt-2 text-muted-foreground">
          Let's start by collecting your company's basic information
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="legalEntityName"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Legal Entity Name *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter legal entity name"
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
            name="tradingName"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Trading Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter trading name (if different)"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyRegistrationNumber"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>Company Registration Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter registration number"
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
              name="dateOfIncorporation"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>Date of Incorporation</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="countryOfIncorporation"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Country of Incorporation *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
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
            name="websiteUrl"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Company Website URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com"
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
            name="companySize"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Company Size</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">
                        Startup (&lt; 10 employees)
                      </SelectItem>
                      <SelectItem value="small">
                        Small (10-50 employees)
                      </SelectItem>
                      <SelectItem value="medium">
                        Medium (50-250 employees)
                      </SelectItem>
                      <SelectItem value="large">
                        Large (250-1000 employees)
                      </SelectItem>
                      <SelectItem value="enterprise">
                        Enterprise (&gt; 1000 employees)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fintechCategory"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Primary Fintech Category *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMI">
                        Electronic Money Institution (EMI)
                      </SelectItem>
                      <SelectItem value="Neobank">Neobank</SelectItem>
                      <SelectItem value="PSP">
                        Payment Service Provider (PSP)
                      </SelectItem>
                      <SelectItem value="Remittance">Remittance</SelectItem>
                      <SelectItem value="Cryptocurrency">
                        Cryptocurrency
                      </SelectItem>
                      <SelectItem value="Lending">Lending</SelectItem>
                      <SelectItem value="Investment">Investment</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                      <SelectItem value="Wealth Management">
                        Wealth Management
                      </SelectItem>
                      <SelectItem value="Trading Platform">
                        Trading Platform
                      </SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessModel"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Business Model *</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value || ""}
                    onValueChange={(value) => {
                      if (
                        value === "B2C" ||
                        value === "B2B" ||
                        value === "B2B2C"
                      ) {
                        field.onChange(value as "B2C" | "B2B" | "B2B2C");
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B2C" id="b2c" />
                      <Label htmlFor="b2c">B2C</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B2B" id="b2b" />
                      <Label htmlFor="b2b">B2B</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B2B2C" id="b2b2c" />
                      <Label htmlFor="b2b2c">B2B2C</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="primaryJurisdiction"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel>Primary Jurisdiction *</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
