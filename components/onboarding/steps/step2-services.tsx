"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import type { OrganizationProfile } from "@/lib/types/organization-profile";
import type { CompanyProfileInput } from "@/lib/validations/organization-profile";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

interface Step2ServicesProps {
  initialData?: Partial<OrganizationProfile>;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step2Services({
  initialData,
  onComplete,
  onBack,
}: Step2ServicesProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Pick<CompanyProfileInput, "services">>({
    resolver: zodResolver(companyProfileSchema.pick({ services: true })),
    defaultValues: {
      services: initialData?.services || [],
    },
  });

  const onSubmit = async (data: Pick<CompanyProfileInput, "services">) => {
    if (data.services.length === 0) {
      toast.error("Please select at least one service");
      return;
    }

    setIsSubmitting(true);
    try {
      onComplete(data);
    } catch (error) {
      console.error("Error saving services:", error);
      toast.error("Failed to save services. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Package className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Services & Products</h2>
        <p className="mt-2 text-muted-foreground">
          Select all the services and products your company offers
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="services"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Services *</FormLabel>
                <FormControl>
                  <ServiceSelector
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
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
