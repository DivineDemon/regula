"use client";

import { ExternalLink, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SuggestedTarget } from "@/lib/services/llm";
import { cn } from "@/lib/utils";

interface TargetDiscoveryResultsProps {
  targets: SuggestedTarget[];
  selectedTargets: Set<number>;
  onToggleTarget: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  disabled?: boolean;
  className?: string;
}

type SortOption = "confidence" | "jurisdiction" | "category" | "label";
type FilterOption =
  | "all"
  | "high_confidence"
  | "by_jurisdiction"
  | "by_category";

export function TargetDiscoveryResults({
  targets,
  selectedTargets,
  onToggleTarget,
  onSelectAll,
  onDeselectAll,
  disabled = false,
  className,
}: TargetDiscoveryResultsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("confidence");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Get unique jurisdictions and categories for filters
  const jurisdictions = useMemo(() => {
    const unique = new Set<string>();
    targets.forEach((t) => {
      if (t.jurisdiction) unique.add(t.jurisdiction);
    });
    return Array.from(unique).sort();
  }, [targets]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    targets.forEach((t) => {
      if (t.category) unique.add(t.category);
    });
    return Array.from(unique).sort();
  }, [targets]);

  // Filter and sort targets
  const filteredAndSortedTargets = useMemo(() => {
    let filtered = [...targets];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.label.toLowerCase().includes(term) ||
          t.url.toLowerCase().includes(term) ||
          t.reasoning?.toLowerCase().includes(term) ||
          t.jurisdiction?.toLowerCase().includes(term),
      );
    }

    // Filter by confidence
    if (filterBy === "high_confidence") {
      filtered = filtered.filter((t) => (t.confidence || 0) >= 0.7);
    }

    // Filter by jurisdiction
    if (
      filterBy === "by_jurisdiction" &&
      filterJurisdiction &&
      filterJurisdiction !== "all"
    ) {
      filtered = filtered.filter((t) => t.jurisdiction === filterJurisdiction);
    }

    // Filter by category
    if (
      filterBy === "by_category" &&
      filterCategory &&
      filterCategory !== "all"
    ) {
      filtered = filtered.filter((t) => t.category === filterCategory);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "confidence":
          return (b.confidence || 0) - (a.confidence || 0);
        case "jurisdiction":
          return (a.jurisdiction || "").localeCompare(b.jurisdiction || "");
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        case "label":
          return a.label.localeCompare(b.label);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    targets,
    searchTerm,
    sortBy,
    filterBy,
    filterJurisdiction,
    filterCategory,
  ]);

  const allSelected =
    selectedTargets.size === targets.length && targets.length > 0;
  const _someSelected =
    selectedTargets.size > 0 && selectedTargets.size < targets.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with selection info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedTargets.size} of {targets.length} target
          {targets.length === 1 ? "" : "s"} selected
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={allSelected ? onDeselectAll : onSelectAll}
            disabled={disabled || targets.length === 0}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search targets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence">Sort: Confidence</SelectItem>
              <SelectItem value="jurisdiction">Sort: Jurisdiction</SelectItem>
              <SelectItem value="category">Sort: Category</SelectItem>
              <SelectItem value="label">Sort: Name</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterBy}
            onValueChange={(v) => setFilterBy(v as FilterOption)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filter: All</SelectItem>
              <SelectItem value="high_confidence">
                Filter: High Confidence
              </SelectItem>
              <SelectItem value="by_jurisdiction">
                Filter: By Jurisdiction
              </SelectItem>
              <SelectItem value="by_category">Filter: By Category</SelectItem>
            </SelectContent>
          </Select>

          {filterBy === "by_jurisdiction" && jurisdictions.length > 0 && (
            <Select
              value={filterJurisdiction || "all"}
              onValueChange={(value) => setFilterJurisdiction(value ?? "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jurisdictions</SelectItem>
                {jurisdictions
                  .filter((j) => j && j.trim() !== "")
                  .map((j) => (
                    <SelectItem key={j} value={j}>
                      {j}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}

          {filterBy === "by_category" && categories.length > 0 && (
            <Select
              value={filterCategory || "all"}
              onValueChange={(value) => setFilterCategory(value ?? "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories
                  .filter((c) => c && c.trim() !== "")
                  .map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredAndSortedTargets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {searchTerm || filterBy !== "all"
              ? "No targets match your filters. Try adjusting your search or filters."
              : "No targets available."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedTargets.map((target, _displayIndex) => {
            // Find original index in targets array
            const originalIndex = targets.indexOf(target);
            const isSelected = selectedTargets.has(originalIndex);
            const confidencePercent = Math.round(
              (target.confidence || 0) * 100,
            );

            return (
              <Card
                key={originalIndex}
                className={cn(
                  "transition-colors",
                  isSelected && "border-primary bg-primary/5",
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleTarget(originalIndex)}
                      disabled={disabled}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium">{target.label}</h3>
                          <a
                            href={target.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                          >
                            {target.url}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                        {target.confidence !== undefined && (
                          <Badge
                            variant={
                              confidencePercent >= 70
                                ? "default"
                                : confidencePercent >= 50
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {confidencePercent}% confidence
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {target.jurisdiction && (
                          <Badge variant="outline">{target.jurisdiction}</Badge>
                        )}
                        {target.category && (
                          <Badge variant="outline">
                            {target.category.toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      {target.reasoning && (
                        <p className="text-sm text-muted-foreground">
                          {target.reasoning}
                        </p>
                      )}

                      {(target.relevantServices ||
                        target.relevantCountries) && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {target.relevantServices &&
                            target.relevantServices.length > 0 && (
                              <div>
                                <span className="font-medium">
                                  Relevant services:&nbsp;
                                </span>
                                {target.relevantServices.join(", ")}
                              </div>
                            )}
                          {target.relevantCountries &&
                            target.relevantCountries.length > 0 && (
                              <div>
                                <span className="font-medium">
                                  Relevant countries:&nbsp;
                                </span>
                                {target.relevantCountries.join(", ")}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {filteredAndSortedTargets.length !== targets.length && (
        <div className="text-xs text-muted-foreground text-center">
          Showing {filteredAndSortedTargets.length} of {targets.length} targets
        </div>
      )}
    </div>
  );
}
