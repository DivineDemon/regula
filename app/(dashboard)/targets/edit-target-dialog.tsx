"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
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
import type { targets } from "@/lib/db/schema";

type Target = typeof targets.$inferSelect;

const targetFormSchema = z.object({
  url: z.string().url("Invalid URL format"),
  label: z.string().min(1, "Label is required"),
  jurisdiction: z.string().optional(),
  category: z
    .enum(["aml", "kyc", "licensing", "fees", "regulations", "other"])
    .optional(),
  crawlFrequency: z
    .enum(["hourly", "daily", "weekly", "monthly"])
    .default("daily"),
  status: z
    .enum(["active", "pending", "running", "error", "paused"])
    .optional(),
});

type TargetFormData = z.infer<typeof targetFormSchema>;

interface EditTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
  organizationId: string;
  onSuccess: () => void;
}

export function EditTargetDialog({
  open,
  onOpenChange,
  target,
  organizationId,
  onSuccess,
}: EditTargetDialogProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(targetFormSchema),
    defaultValues: {
      url: target.url,
      label: target.label,
      jurisdiction: target.jurisdiction || "",
      category: target.category || undefined,
      crawlFrequency: target.crawlFrequency as
        | "daily"
        | "hourly"
        | "weekly"
        | "monthly",
      status: target.status === "running" ? "pending" : target.status,
    },
  });

  useEffect(() => {
    if (open && target) {
      form.reset({
        url: target.url,
        label: target.label,
        jurisdiction: target.jurisdiction || "",
        category: target.category || undefined,
        crawlFrequency: target.crawlFrequency as
          | "daily"
          | "hourly"
          | "weekly"
          | "monthly",
        status: target.status === "running" ? "pending" : target.status,
      });
    }
  }, [open, target, form]);

  const validateUrl = async (url: string) => {
    // Skip validation if URL hasn't changed
    if (url === target.url) {
      return true;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/targets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.accessible) {
        setValidationError(
          data.error || "URL is not accessible. Please check the URL.",
        );
        return false;
      }

      return true;
    } catch (_error) {
      setValidationError(
        "Failed to validate URL. Please check your connection and try again.",
      );
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: TargetFormData) => {
    // Validate URL accessibility if URL changed
    if (data.url !== target.url) {
      const isValid = await validateUrl(data.url);
      if (!isValid) {
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: target.id,
          organizationId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setValidationError(
          errorData.error || "Failed to update target. Please try again.",
        );
        return;
      }

      setValidationError(null);
      onSuccess();
    } catch (_error) {
      setValidationError("Failed to update target. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default" className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Target</AlertDialogTitle>
          <AlertDialogDescription>
            Update target configuration
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    URL <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/regulations"
                      disabled={isSubmitting || isValidating}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Label <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., UK FCA AML Regulations"
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
              name="jurisdiction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jurisdiction</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., UK, US, EU"
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="aml">AML</SelectItem>
                      <SelectItem value="kyc">KYC</SelectItem>
                      <SelectItem value="licensing">Licensing</SelectItem>
                      <SelectItem value="fees">Fees</SelectItem>
                      <SelectItem value="regulations">Regulations</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="crawlFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Crawl Frequency <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? "daily"}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? "pending"}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting || isValidating}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={isSubmitting || isValidating}
              >
                {isSubmitting || isValidating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {isValidating ? "Validating..." : "Updating..."}
                  </>
                ) : (
                  "Update Target"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
