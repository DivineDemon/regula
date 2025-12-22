"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Target } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const targetSchema = z.object({
  url: z.string().url("Invalid URL format"),
  label: z.string().min(1, "Label is required"),
  jurisdiction: z.string().optional(),
  category: z
    .enum(["aml", "kyc", "licensing", "fees", "regulations", "other"])
    .optional(),
});

type TargetFormData = z.infer<typeof targetSchema>;

interface Step2AddTargetsProps {
  organizationId: string;
  onComplete: (data: { targetIds: string[] }) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function Step2AddTargets({
  organizationId,
  onComplete,
  onBack,
  onSkip,
}: Step2AddTargetsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [targets, setTargets] = useState<TargetFormData[]>([]);

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      url: "",
      label: "",
      jurisdiction: "",
      category: undefined,
    },
  });

  const validateUrl = async (url: string) => {
    setIsValidating(true);
    try {
      const response = await fetch("/api/targets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      return data.accessible === true;
    } catch {
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddTarget = async (data: TargetFormData) => {
    const isValid = await validateUrl(data.url);
    if (!isValid) {
      toast.error("URL is not accessible. Please check the URL and try again.");
      return;
    }

    setTargets((prev) => [...prev, data]);
    form.reset();
    toast.success("Target added successfully");
  };

  const handleRemoveTarget = (url: string) => {
    setTargets((prev) => prev.filter((target) => target.url !== url));
  };

  const handleContinue = async () => {
    if (targets.length === 0) {
      toast.error("Please add at least one target to continue");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetIds: string[] = [];

      for (const target of targets) {
        const response = await fetch("/api/targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...target,
            organizationId,
            crawlFrequency: "daily",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create target: ${target.label}`);
        }

        const data = await response.json();
        targetIds.push(data.target.id);
      }

      onComplete({ targetIds });
    } catch (error) {
      console.error("Error creating targets:", error);
      toast.error("Failed to create targets. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Target className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Add Your First Targets</h2>
        <p className="mt-2 text-muted-foreground">
          Add regulatory websites you want to monitor for changes
        </p>
      </div>

      {targets.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
          <h3 className="font-medium">Added Targets ({targets.length})</h3>
          {targets.map((target) => (
            <div
              key={target.url}
              className="flex items-center justify-between rounded-md border bg-background p-3"
            >
              <div className="flex-1">
                <p className="font-medium">{target.label}</p>
                <p className="text-sm text-muted-foreground">{target.url}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveTarget(target.url)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleAddTarget)}
          className="space-y-4"
        >
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    value={field.value || ""}
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
          </div>

          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting || isValidating}
            className="w-full"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Add Target
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting || targets.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
