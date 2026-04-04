"use client";

import { ArrowLeft, ArrowRight, FileText, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";

interface VersionComparisonViewerProps {
  currentVersionId: string;
  previousVersionId: string;
  organizationId: string;
}

interface VersionContent {
  id: string;
  content: string;
  crawledAt: Date;
  metadata: {
    contentType?: string;
    title?: string;
  } | null;
}

interface DiffResult {
  hasChanges: boolean;
  changeTypes: string[];
  structuralChanges: Array<{
    type: string;
    action: "added" | "removed" | "modified";
    position?: number;
    content?: string;
  }>;
  affectedSections: string[];
  similarityScore?: number;
}

export function VersionComparisonViewer({
  currentVersionId,
  previousVersionId,
  organizationId,
}: VersionComparisonViewerProps) {
  const [currentVersion, setCurrentVersion] = useState<VersionContent | null>(
    null,
  );
  const [previousVersion, setPreviousVersion] = useState<VersionContent | null>(
    null,
  );
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">(
    "side-by-side",
  );

  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      try {
        const [currentRes, previousRes, diffRes] = await Promise.all([
          fetch(
            `/api/versions/${currentVersionId}?organizationId=${organizationId}`,
          ),
          fetch(
            `/api/versions/${previousVersionId}?organizationId=${organizationId}`,
          ),
          fetch(
            `/api/versions/compare?currentVersionId=${currentVersionId}&previousVersionId=${previousVersionId}&organizationId=${organizationId}`,
          ),
        ]);

        if (currentRes.ok) {
          const currentData = await currentRes.json();
          setCurrentVersion(currentData);
        }

        if (previousRes.ok) {
          const previousData = await previousRes.json();
          setPreviousVersion(previousData);
        }

        if (diffRes.ok) {
          const diffData = await diffRes.json();
          setDiffResult(diffData);
        }
      } catch (error) {
        console.error("Error fetching versions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [currentVersionId, previousVersionId, organizationId]);

  const renderDiffContent = (content: string, type: "current" | "previous") => {
    if (!diffResult?.hasChanges) {
      return (
        <div className="whitespace-pre-wrap font-mono text-sm p-4">
          {content}
        </div>
      );
    }

    // Simple diff highlighting (can be enhanced with a proper diff library)
    const lines = content.split("\n");
    const lineKeyCounts = new Map<string, number>();

    return (
      <div className="font-mono text-sm">
        {lines.map((line, index) => {
          const structuralChange = diffResult.structuralChanges.find(
            (change) => change.position === index,
          );
          const lineOccurrence = lineKeyCounts.get(line) ?? 0;
          lineKeyCounts.set(line, lineOccurrence + 1);
          const stableLineKey = `${type}-${line}-${lineOccurrence}`;

          if (structuralChange) {
            const bgColor =
              structuralChange.action === "added"
                ? "bg-green-500/20"
                : structuralChange.action === "removed"
                  ? "bg-red-500/20"
                  : "bg-yellow-500/20";

            return (
              <div
                key={`line-${structuralChange.action}-${structuralChange.position}-${stableLineKey}`}
                className={`${bgColor} p-1`}
              >
                {structuralChange.action === "added" && type === "current" && (
                  <span className="text-green-600">+ </span>
                )}
                {structuralChange.action === "removed" &&
                  type === "previous" && (
                    <span className="text-red-600">- </span>
                  )}
                {line}
              </div>
            );
          }

          return (
            <div key={stableLineKey} className="p-1">
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentVersion || !previousVersion) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            Could not load version content for comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {diffResult && (
        <div className="grid w-full min-w-0 grid-cols-2 items-start justify-start gap-5">
          <div className="w-full min-w-0 col-span-1 flex items-center justify-center rounded-lg border p-2.5">
            <span className="flex-1 min-w-0 text-left font-bold">
              Changes Detected
            </span>
            <span
              className={cn("text-sm px-4 py-1 rounded-full", {
                "bg-green-500/20 text-green-600": diffResult.hasChanges,
                "bg-red-500/20 text-red-600": !diffResult.hasChanges,
              })}
            >
              {diffResult.hasChanges ? "Yes" : "No"}
            </span>
          </div>
          <div className="w-full min-w-0 col-span-1 flex items-center justify-center rounded-lg border p-2.5">
            <span className="flex-1 min-w-0 text-left font-bold">
              Similarity Score
            </span>
            <span
              className={cn("text-sm px-4 py-1 rounded-full", {
                "bg-green-500/20 text-green-600":
                  diffResult.similarityScore &&
                  diffResult.similarityScore > 0.5,
                "bg-red-500/20 text-red-600":
                  diffResult.similarityScore &&
                  diffResult.similarityScore <= 0.5,
              })}
            >
              {diffResult.similarityScore
                ? `${(diffResult.similarityScore * 100).toFixed(1)}%`
                : "N/A"}
            </span>
          </div>
          <div className="w-full col-span-1 flex min-w-0 flex-col items-start justify-start gap-2.5 rounded-lg border p-2.5 overflow-hidden">
            <span className="w-full shrink-0 text-left font-bold">
              Affected Sections
            </span>
            <div className="flex min-w-0 w-full flex-wrap gap-1">
              {diffResult.affectedSections.map((t) => (
                <span key={t} className="max-w-full min-w-0 shrink">
                  <Badge className="block max-w-full truncate">{t}</Badge>
                </span>
              ))}
            </div>
          </div>
          <div className="w-full col-span-1 flex min-w-0 flex-col items-start justify-start gap-2.5 rounded-lg border p-2.5 overflow-hidden">
            <span className="w-full shrink-0 text-left font-bold">
              Change Types
            </span>
            <div className="flex min-w-0 w-full flex-wrap gap-1">
              {diffResult.changeTypes.map((t) => (
                <span key={t} className="max-w-full min-w-0 shrink">
                  <Badge>{t}</Badge>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Version Comparison
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(
                    viewMode === "side-by-side" ? "unified" : "side-by-side",
                  )
                }
              >
                {viewMode === "side-by-side" ? "Unified View" : "Side-by-Side"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="w-full flex space-y-5">
          {viewMode === "side-by-side" ? (
            <div className="w-full grid grid-cols-2 gap-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Previous Version
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(previousVersion.crawledAt).toLocaleString()}
                  </span>
                </div>
                <div className="max-h-[600px] overflow-auto">
                  {renderDiffContent(previousVersion.content, "previous")}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-sm font-medium">Current Version</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(currentVersion.crawledAt).toLocaleString()}
                  </span>
                </div>
                <div className="max-h-[600px] overflow-auto">
                  {renderDiffContent(currentVersion.content, "current")}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full border rounded-lg overflow-hidden">
              <div className="bg-muted p-2">
                <span className="text-sm font-medium">Unified Diff View</span>
              </div>
              <div className="max-h-[600px] overflow-auto p-4">
                <div className="space-y-2">
                  {diffResult?.structuralChanges.map((change) => (
                    <div
                      key={`change-${change.position ?? "na"}-${change.action}-${change.type}-${change.content ?? ""}`}
                      className={`p-2 rounded ${
                        change.action === "added"
                          ? "bg-green-500/20 border-l-4 border-green-500"
                          : change.action === "removed"
                            ? "bg-red-500/20 border-l-4 border-red-500"
                            : "bg-yellow-500/20 border-l-4 border-yellow-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {change.action === "added" && (
                          <Plus className="h-4 w-4 text-green-600" />
                        )}
                        {change.action === "removed" && (
                          <Minus className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-xs font-medium uppercase">
                          {change.action} {change.type}
                        </span>
                      </div>
                      {change.content && (
                        <div className="text-sm font-mono">
                          {change.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
