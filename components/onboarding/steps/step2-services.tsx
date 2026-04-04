"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { cn } from "@/lib/utils";
import type { CompanyProfileInput } from "@/lib/validations/organization-profile";
import { companyProfileSchema } from "@/lib/validations/organization-profile";

interface Step2ServicesProps {
  className?: string;
  initialData?: Partial<OrganizationProfile>;
  onComplete: (data: Partial<OrganizationProfile>) => void;
  onBack: () => void;
}

export function Step2Services({
  className,
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
    <div
      className={cn(
        "w-full mx-auto flex flex-col items-start justify-start gap-5",
        className,
      )}
    >
      <div className="w-full flex flex-col items-center justify-center">
        <h2 className="w-full text-left text-2xl font-bold">
          Services & Products
        </h2>
        <p className="w-full text-left text-muted-foreground">
          Select all the services and products your company offers
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col items-start justify-start"
        >
          <div className="w-full h-[calc(100vh-412px)] flex overflow-y-auto">
            <FormField
              control={form.control}
              name="services"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel className="text-xs uppercase text-muted-foreground">
                    Services <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <ServiceSelector
                      value={field.value}
                      disabled={isSubmitting}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-full grid grid-cols-2 gap-5 items-center justify-center pt-5">
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
