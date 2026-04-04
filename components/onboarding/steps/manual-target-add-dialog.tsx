"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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

const manualTargetSchema = z.object({
  url: z.url("Invalid URL format"),
  label: z.string().min(1, "Label is required").max(200, "Label is too long"),
  jurisdiction: z
    .string()
    .regex(
      /^[A-Z]{2}$/,
      "Jurisdiction must be a 2-letter country code (e.g., US, UK)",
    )
    .optional()
    .or(z.literal("")),
  category: z
    .enum(["aml", "kyc", "licensing", "fees", "regulations", "other"])
    .optional(),
});

type ManualTargetFormData = z.infer<typeof manualTargetSchema>;

interface DiscoveredTarget {
  url: string;
  label: string;
  jurisdiction?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  relevantServices?: string[];
  relevantCountries?: string[];
  isManual?: boolean;
}

interface ManualTargetAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTarget: (target: DiscoveredTarget) => void;
}

export function ManualTargetAddDialog({
  open,
  onOpenChange,
  onAddTarget,
}: ManualTargetAddDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ManualTargetFormData>({
    resolver: zodResolver(manualTargetSchema),
    defaultValues: {
      url: "",
      label: "",
      jurisdiction: "",
      category: undefined,
    },
  });

  const handleSubmit = async (data: ManualTargetFormData) => {
    setIsSubmitting(true);
    try {
      const newTarget: DiscoveredTarget = {
        url: data.url,
        label: data.label,
        jurisdiction: data.jurisdiction || undefined,
        category: data.category || undefined,
        confidence: 1.0, // Manual targets have 100% confidence
        isManual: true,
      };

      onAddTarget(newTarget);
      form.reset();
      onOpenChange(false);
      toast.success("Target added");
    } catch (_error) {
      toast.error("Failed to add target. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Target Manually</DialogTitle>
          <DialogDescription>
            Add a regulatory target manually by entering its details
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="w-full flex flex-col items-start justify-start gap-5"
          >
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="w-full flex flex-col items-start justify-start">
                  <FormLabel>URL *</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
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
                  <FormLabel>Label *</FormLabel>
                  <FormControl>
                    <Input placeholder="Target label" {...field} />
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
                  <FormLabel>Jurisdiction (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="US, UK, etc. (2 letters)" {...field} />
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
                  <FormLabel>Category (optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
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
            <DialogFooter className="w-full flex justify-end gap-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding Target..." : "Add Target"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
