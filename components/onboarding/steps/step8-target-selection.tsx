"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiscoveredTarget {
  url: string;
  label: string;
  jurisdiction?: string;
  category?: string;
  confidence?: number;
  reasoning?: string;
  relevantServices?: string[];
  relevantCountries?: string[];
}

const manualTargetSchema = z.object({
  url: z.string().url("Invalid URL format"),
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

interface Step8TargetSelectionProps {
  organizationId: string;
  discoveredTargets: DiscoveredTarget[];
  onComplete: () => void;
  onBack: () => void;
}

export function Step8TargetSelection({
  organizationId,
  discoveredTargets: initialDiscoveredTargets,
  onComplete,
  onBack,
}: Step8TargetSelectionProps) {
  const [discoveredTargets, setDiscoveredTargets] = useState<
    DiscoveredTarget[]
  >(initialDiscoveredTargets);
  const [selectedTargets, setSelectedTargets] = useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const manualTargetForm = useForm<ManualTargetFormData>({
    resolver: zodResolver(manualTargetSchema),
    defaultValues: {
      url: "",
      label: "",
      jurisdiction: "",
      category: undefined,
    },
  });

  const handleToggleTarget = (index: number) => {
    setSelectedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTargets.size === discoveredTargets.length) {
      setSelectedTargets(new Set());
    } else {
      setSelectedTargets(new Set(discoveredTargets.map((_, index) => index)));
    }
  };

  const handleAddManualTarget = async (data: ManualTargetFormData) => {
    const newTarget: DiscoveredTarget = {
      url: data.url,
      label: data.label,
      jurisdiction: data.jurisdiction || undefined,
      category: data.category || undefined,
      confidence: 1.0, // Manual targets have 100% confidence
    };

    setDiscoveredTargets((prev) => [...prev, newTarget]);
    manualTargetForm.reset();
    setShowManualForm(false);
    toast.success("Target added");
  };

  const handleSubmit = async () => {
    if (selectedTargets.size === 0) {
      toast.error("Please select at least one target");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetsToCreate = Array.from(selectedTargets).map(
        (index) => discoveredTargets[index],
      );

      // Validate target structure before sending
      const invalidTargets = targetsToCreate.filter(
        (target) => !target.url || !target.label,
      );
      if (invalidTargets.length > 0) {
        toast.error(
          "Some selected targets have invalid data. Please check your selections.",
        );
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/targets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          targets: targetsToCreate.map((target) => ({
            url: target.url,
            label: target.label,
            jurisdiction: target.jurisdiction,
            category: target.category,
            crawlFrequency: "daily" as const,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Failed to create targets (${response.status})`;

        // Handle quota/limit errors specifically
        if (response.status === 403 && errorData.error) {
          toast.error(errorData.error);
        } else {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const createdCount = data.createdCount || targetsToCreate.length;
      const failedCount = data.failedCount || 0;

      if (failedCount > 0) {
        toast.warning(
          `Created ${createdCount} target(s), but ${failedCount} failed. Please check the errors and try again.`,
        );
      } else {
        toast.success(`Successfully created ${createdCount} target(s)`);
      }

      onComplete();
    } catch (error) {
      console.error("Error creating targets:", error);
      // Error toast already shown above for specific cases
      if (
        !(error instanceof Error && error.message.includes("Failed to create"))
      ) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to create targets. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort targets by confidence but preserve original indices for selection
  const sortedTargetsWithIndices = discoveredTargets
    .map((target, index) => ({ target, originalIndex: index }))
    .sort((a, b) => {
      const aConf = a.target.confidence || 0;
      const bConf = b.target.confidence || 0;
      return bConf - aConf;
    });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle2 className="size-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Select Regulatory Targets</h2>
        <p className="mt-2 text-muted-foreground">
          Review and select the regulatory targets you want to monitor
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedTargets.size} of {discoveredTargets.length} selected
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {selectedTargets.size === discoveredTargets.length
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowManualForm(!showManualForm)}
          >
            <Plus className="mr-2 size-4" />
            Add Manually
          </Button>
        </div>
      </div>

      {showManualForm && (
        <Card>
          <CardContent className="pt-6">
            <Form {...manualTargetForm}>
              <form
                onSubmit={manualTargetForm.handleSubmit(handleAddManualTarget)}
                className="space-y-4"
              >
                <h3 className="font-medium">Add Manual Target</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={manualTargetForm.control}
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
                    control={manualTargetForm.control}
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
                    control={manualTargetForm.control}
                    name="jurisdiction"
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-start justify-start">
                        <FormLabel>Jurisdiction (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="US, UK, etc. (2 letters)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={manualTargetForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="w-full flex flex-col items-start justify-start">
                        <FormLabel>Category (optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
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
                            <SelectItem value="regulations">
                              Regulations
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowManualForm(false);
                      manualTargetForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add Target</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {sortedTargetsWithIndices.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No targets discovered. You can add targets manually.
            </CardContent>
          </Card>
        ) : (
          sortedTargetsWithIndices.map(({ target, originalIndex }) => {
            const isSelected = selectedTargets.has(originalIndex);

            return (
              <Card
                key={`target-${originalIndex}`}
                className={isSelected ? "border-primary" : ""}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleTarget(originalIndex)}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{target.label}</h3>
                          <a
                            href={target.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            {target.url}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                        {target.confidence !== undefined && (
                          <Badge variant="secondary">
                            {Math.round(target.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {target.jurisdiction && (
                          <Badge variant="outline">{target.jurisdiction}</Badge>
                        )}
                        {target.category && (
                          <Badge variant="outline">{target.category}</Badge>
                        )}
                      </div>
                      {target.reasoning && (
                        <p className="text-sm text-muted-foreground">
                          {target.reasoning}
                        </p>
                      )}
                      {target.relevantServices &&
                        target.relevantServices.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Relevant services:&nbsp;
                            {target.relevantServices.join(", ")}
                          </div>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? "Creating Targets..."
            : `Create ${selectedTargets.size} Target${selectedTargets.size === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
