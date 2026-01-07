"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ServiceSelector } from "@/components/onboarding/service-selector";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

interface Step3GeographicOperationsProps {
  initialData?: Partial<OrganizationProfile>;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step3GeographicOperations({
  initialData,
  onComplete,
  onBack,
}: Step3GeographicOperationsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Pick<CompanyProfileInput, "countryOperations">>({
    resolver: zodResolver(
      companyProfileSchema.pick({ countryOperations: true }),
    ),
    defaultValues: {
      countryOperations: initialData?.countryOperations || [
        {
          countryCode: "",
          operationType: "direct",
          services: [],
          licenseStatus: "not_required",
        },
      ],
    },
  });

  // Get available services from profile (from step 2)
  const availableServices = initialData?.services || [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "countryOperations",
  });

  const onSubmit = async (
    data: Pick<CompanyProfileInput, "countryOperations">,
  ) => {
    // Cross-field validation: services in country operations should match services from step 2
    if (availableServices.length > 0) {
      const invalidServices: string[] = [];
      for (const operation of data.countryOperations) {
        for (const service of operation.services) {
          if (!availableServices.includes(service)) {
            invalidServices.push(
              `${service} in ${operation.countryCode || "unknown country"}`,
            );
          }
        }
      }
      if (invalidServices.length > 0) {
        toast.error(
          `The following services are not in your service list from Step 2: ${invalidServices.join(", ")}. Please select only services you've defined earlier.`,
        );
        return;
      }
    }

    // Validate that each country operation has at least one service
    const emptyServices = data.countryOperations.filter(
      (op) => !op.services || op.services.length === 0,
    );
    if (emptyServices.length > 0) {
      toast.error(
        "Each country operation must have at least one service. Please add services to all countries.",
      );
      form.setError("countryOperations", {
        type: "manual",
        message: "Each country must have at least one service",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      onComplete(data);
    } catch (error) {
      console.error("Error saving geographic operations:", error);
      toast.error("Failed to save geographic operations. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Globe className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Geographic Operations</h2>
        <p className="mt-2 text-muted-foreground">
          Tell us about your operations in different countries
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Country {index + 1}</h3>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <FormField
                control={form.control}
                name={`countryOperations.${index}.countryCode`}
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Country *</FormLabel>
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
                name={`countryOperations.${index}.operationType`}
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Operation Type *</FormLabel>
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
                          <SelectItem value="direct">
                            Direct Operations
                          </SelectItem>
                          <SelectItem value="indirect">
                            Indirect Operations (via partners)
                          </SelectItem>
                          <SelectItem value="data_processing">
                            Data Processing Only
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
                name={`countryOperations.${index}.services`}
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>Services Offered *</FormLabel>
                    <FormControl>
                      <ServiceSelector
                        value={field.value || []}
                        onChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    {availableServices.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Tip: Select from the services you defined in Step 2
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`countryOperations.${index}.licenseStatus`}
                render={({ field }) => (
                  <FormItem className="w-full flex flex-col items-start justify-start">
                    <FormLabel>License Status *</FormLabel>
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
                          <SelectItem value="licensed">Licensed</SelectItem>
                          <SelectItem value="applying">Applying</SelectItem>
                          <SelectItem value="exempt">Exempt</SelectItem>
                          <SelectItem value="not_required">
                            Not Required
                          </SelectItem>
                          <SelectItem value="unlicensed">Unlicensed</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                countryCode: "",
                operationType: "direct",
                services: [],
                licenseStatus: "not_required",
              })
            }
            disabled={isSubmitting}
            className="w-full"
          >
            <Plus className="mr-2 size-4" />
            Add Country
          </Button>

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
