"use client";

import { ArrowLeft, ArrowRight, FileText, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
    if (!diffResult || !diffResult.hasChanges) {
      return (
        <div className="whitespace-pre-wrap font-mono text-sm p-4">
          {content}
        </div>
      );
    }

    // Simple diff highlighting (can be enhanced with a proper diff library)
    const lines = content.split("\n");
    return (
      <div className="font-mono text-sm">
        {lines.map((line, index) => {
          const structuralChange = diffResult.structuralChanges.find(
            (change) => change.position === index,
          );

          if (structuralChange) {
            const bgColor =
              structuralChange.action === "added"
                ? "bg-green-500/20"
                : structuralChange.action === "removed"
                  ? "bg-red-500/20"
                  : "bg-yellow-500/20";

            return (
              <div
                key={`line-${index}-${structuralChange.action}-${structuralChange.position}`}
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
            <div key={`line-${index}-${line.slice(0, 20)}`} className="p-1">
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
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
    <Card>
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
      <CardContent className="space-y-4">
        {/* Diff Summary */}
        {diffResult && (
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-sm font-medium">Changes Detected: </span>
                <span className="text-sm">
                  {diffResult.hasChanges ? "Yes" : "No"}
                </span>
              </div>
              {diffResult.similarityScore !== undefined && (
                <div>
                  <span className="text-sm font-medium">Similarity: </span>
                  <span className="text-sm">
                    {(diffResult.similarityScore * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {diffResult.changeTypes.length > 0 && (
                <div>
                  <span className="text-sm font-medium">Change Types: </span>
                  <span className="text-sm">
                    {diffResult.changeTypes.join(", ")}
                  </span>
                </div>
              )}
              {diffResult.affectedSections.length > 0 && (
                <div>
                  <span className="text-sm font-medium">
                    Affected Sections:&nbsp;
                  </span>
                  <span className="text-sm">
                    {diffResult.affectedSections.slice(0, 3).join(", ")}
                    {diffResult.affectedSections.length > 3 && "..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Version Content */}
        {viewMode === "side-by-side" ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm font-medium">Previous Version</span>
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
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted p-2">
              <span className="text-sm font-medium">Unified Diff View</span>
            </div>
            <div className="max-h-[600px] overflow-auto p-4">
              <div className="space-y-2">
                {diffResult?.structuralChanges.map((change, index) => (
                  <div
                    key={`change-${change.position}-${change.action}-${index}`}
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
                      <div className="text-sm font-mono">{change.content}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
