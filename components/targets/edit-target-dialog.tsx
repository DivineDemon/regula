"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

    try {
      const response = await fetch("/api/targets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!data.accessible) {
        toast.error(
          data.error || "URL is not accessible. Please check the URL.",
        );
        return false;
      }

      return true;
    } catch (_error) {
      toast.error(
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
        toast.error(
          errorData.error || "Failed to update target. Please try again.",
        );
        return;
      }

      toast.success("Target updated successfully!");
      onSuccess();
    } catch (_error) {
      toast.error("Failed to update target. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="w-full p-5 border-b">
          <DialogTitle>Edit Target</DialogTitle>
          <DialogDescription>Update target configuration</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full flex flex-col items-start justify-start gap-5 p-5"
          >
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
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
                <FormItem className="w-full flex flex-col items-start justify-start">
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
                <FormItem className="w-full flex flex-col items-start justify-start">
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
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
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
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>
                    Crawl Frequency <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? "daily"}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select crawl frequency" />
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
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? "pending"}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
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
            <DialogFooter className="w-full flex items-center justify-end">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  disabled={isSubmitting || isValidating}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || isValidating}>
                {isSubmitting || isValidating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {isValidating ? "Validating..." : "Updating..."}
                  </>
                ) : (
                  "Update Target"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
