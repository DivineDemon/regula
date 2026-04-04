"use client";

import { ExternalLink, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { ManualTargetAddDialog } from "./manual-target-add-dialog";

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
  const [showManualDialog, setShowManualDialog] = useState(false);

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

  const handleAddManualTarget = (target: DiscoveredTarget) => {
    setDiscoveredTargets((prev) => [...prev, target]);
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
    <div className="w-full h-full max-w-1/2 mx-auto flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-center justify-center">
        <h2 className="w-full text-left text-2xl font-bold">
          Select Regulatory Targets
        </h2>
        <p className="w-full text-left text-muted-foreground">
          Review and select the regulatory targets you want to monitor
        </p>
      </div>
      <div className="w-full h-[calc(100vh-412px)] flex flex-col items-start justify-start gap-5">
        <div className="w-full flex items-center justify-between">
          <span className="flex-1 text-left text-sm text-muted-foreground">
            {selectedTargets.size} of {discoveredTargets.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSelectAll}>
              {selectedTargets.size === discoveredTargets.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            <Button variant="outline" onClick={() => setShowManualDialog(true)}>
              Add Manually
            </Button>
          </div>
        </div>
        <ManualTargetAddDialog
          open={showManualDialog}
          onOpenChange={setShowManualDialog}
          onAddTarget={handleAddManualTarget}
        />
        <div className="w-full h-full flex flex-col items-start justify-start max-h-full overflow-y-auto gap-2.5">
          {sortedTargetsWithIndices.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert />
                </EmptyMedia>
                <EmptyTitle>No targets discovered</EmptyTitle>
                <EmptyDescription>
                  No targets discovered. You can add targets manually.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            sortedTargetsWithIndices.map(({ target, originalIndex }) => {
              const isSelected = selectedTargets.has(originalIndex);

              return (
                <div
                  key={originalIndex}
                  className="w-full border shadow rounded-xl flex flex-col items-start justify-start"
                >
                  <div className="w-full flex items-start justify-start gap-2.5 p-2.5 border-b">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleTarget(originalIndex)}
                    />
                    <span className="flex-1 text-left text-[14px] leading-[14px] font-medium">
                      {target.label}
                    </span>
                  </div>
                  <div
                    className={cn("w-full flex flex-wrap gap-2 p-2.5", {
                      "border-b": target.reasoning,
                    })}
                  >
                    {target.isManual && (
                      <Badge variant="outline" className="bg-primary/5">
                        Manual
                      </Badge>
                    )}
                    {target.jurisdiction && (
                      <Badge variant="outline">{target.jurisdiction}</Badge>
                    )}
                    {target.category && (
                      <Badge variant="outline" className="capitalize">
                        {target.category}
                      </Badge>
                    )}
                    {target.confidence !== undefined && (
                      <Badge variant="secondary">
                        {Math.round(target.confidence * 100)}% confidence
                      </Badge>
                    )}
                    <a
                      href={target.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex items-center justify-center text-muted-foreground hover:text-primary gap-2 ml-auto"
                    >
                      <span>External Link</span>
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                  {target.reasoning && (
                    <p className="w-full p-2.5 border-b text-sm text-muted-foreground">
                      {target.reasoning}
                    </p>
                  )}
                  {target.relevantServices &&
                    target.relevantServices.length > 0 && (
                      <div className="w-full flex items-start justify-start gap-2 flex-wrap p-2.5">
                        <div className="text-xs text-muted-foreground">
                          Relevant services:&nbsp;
                          {target.relevantServices.join(", ")}
                        </div>
                      </div>
                    )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="w-full grid grid-cols-2 gap-5 mt-auto">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
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
