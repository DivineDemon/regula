"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface Step1WelcomeProps {
  organizationName: string;
  organizationId: string;
  onComplete: (data: { organizationName: string }) => void;
  onSkip: () => void;
}

export function Step1Welcome({
  organizationName,
  organizationId,
  onComplete,
  onSkip,
}: Step1WelcomeProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organizationName,
    },
  });

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);
    try {
      // Update organization name if changed
      if (data.name !== organizationName) {
        const response = await fetch("/api/settings/organization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, name: data.name }),
        });

        if (!response.ok) {
          throw new Error("Failed to update organization");
        }
      }

      onComplete({ organizationName: data.name });
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization. Please try again.");
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
        <h2 className="text-2xl font-bold">Welcome to Regula</h2>
        <p className="mt-2 text-muted-foreground">
          Let's start by setting up your organization
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
          <div>
            <h3 className="font-medium">Automated Regulatory Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              Track changes to regulatory websites automatically
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
          <div>
            <h3 className="font-medium">AI-Powered Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Get intelligent summaries and impact scores for every change
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
          <div>
            <h3 className="font-medium">Compliance Workspace</h3>
            <p className="text-sm text-muted-foreground">
              Manage alerts, track compliance, and collaborate with your team
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your organization name"
                    disabled={isSubmitting}
                    {...field}
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
              onClick={onSkip}
              disabled={isSubmitting}
            >
              Skip
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
