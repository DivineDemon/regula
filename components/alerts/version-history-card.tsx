"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VersionRecord {
  id: string;
  targetId: string;
  contentHash: string;
  crawledAt: string;
  previousVersionId: string | null;
  hasChanges: boolean | null;
  metadata: string | null;
}

interface VersionHistoryCardProps {
  targetId: string;
  targetLabel: string;
  currentVersionId: string;
  organizationId: string;
  className?: string;
}

export function VersionHistoryCard({
  targetId,
  targetLabel,
  currentVersionId,
  organizationId,
  className,
}: VersionHistoryCardProps) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchVersions = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/targets/${targetId}/versions?organizationId=${encodeURIComponent(organizationId)}&limit=15`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list = data?.data?.versions ?? data?.versions ?? [];
        setVersions(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setVersions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchVersions();
    return () => {
      cancelled = true;
    };
  }, [targetId, organizationId]);

  const _compareUrl = (previousVersionId: string) =>
    `/alerts?organizationId=${encodeURIComponent(organizationId)}&compare=${currentVersionId}&with=${previousVersionId}&targetId=${targetId}`;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          Version history
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Related versions for {targetLabel}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <ul className="space-y-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </li>
            ))}
          </ul>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other versions for this target yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {versions.slice(0, 10).map((v) => {
              const isCurrent = v.id === currentVersionId;
              const dateLabel = v.crawledAt
                ? new Date(v.crawledAt).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—";
              return (
                <li
                  key={v.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm",
                    isCurrent && "border-primary/50 bg-primary/5",
                  )}
                >
                  <span className="truncate text-muted-foreground">
                    {dateLabel}
                    {isCurrent && (
                      <span className="ml-1 font-medium text-foreground">
                        (current)
                      </span>
                    )}
                  </span>
                  {!isCurrent && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/alerts/compare?organizationId=${encodeURIComponent(organizationId)}&currentVersionId=${currentVersionId}&previousVersionId=${v.id}`}
                            >
                              Compare
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Compare this version with the current one
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {versions.length > 10 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing latest 10 of {versions.length} versions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
