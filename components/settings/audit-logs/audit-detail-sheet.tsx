"use client";

import { TriangleAlert } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";
import { JsonHighlighter } from "@/components/shared/json-highlighter";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditAction } from "@/lib/services/audit";

interface AuditLogDetail {
  id: string;
  organizationId: string;
  userId: string | null;
  action: AuditAction;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

interface AuditDetailSheetProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  auditLogId: string | null;
  organizationId: string;
}

export function AuditDetailSheet({
  open,
  onOpenChange,
  auditLogId,
  organizationId,
}: AuditDetailSheetProps) {
  const [log, setLog] = useState<AuditLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogDetails = useCallback(async () => {
    if (!auditLogId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        organizationId,
      });

      const response = await fetch(
        `/api/audit-logs/${auditLogId}?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch audit log details");
      }

      const data = await response.json();
      setLog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [auditLogId, organizationId]);

  useEffect(() => {
    if (open && auditLogId) {
      fetchLogDetails();
    } else {
      // Reset state when sheet closes
      setLog(null);
      setError(null);
    }
  }, [open, auditLogId, fetchLogDetails]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\./g, " > ");
  };

  const formatMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return null;
    return JSON.stringify(metadata, null, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 space-y-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Audit Log Details</SheetTitle>
          <SheetDescription>
            View the complete details of the audit log entry.
          </SheetDescription>
        </SheetHeader>
        <div className="w-full h-[calc(100vh-83px)] flex flex-col items-start justify-start divide-y overflow-y-auto">
          {loading ? (
            <div className="w-full flex flex-col items-start justify-start gap-4 p-4">
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-full max-w-[280px]" />
              </div>
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-32 w-full rounded-lg" />
              </div>
            </div>
          ) : error ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert />
                </EmptyMedia>
                <EmptyTitle>Error</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : log ? (
            <>
              <div className="w-full flex flex-col items-start justify-start gap-2 p-4">
                <Label className="text-sm font-semibold text-muted-foreground w-full text-left">
                  ID
                </Label>
                <p className="font-mono text-sm break-all">{log.id}</p>
              </div>
              <div className="w-full flex flex-col items-start justify-start gap-2 p-4">
                <Label className="text-sm font-semibold text-muted-foreground w-full text-left">
                  Timestamp
                </Label>
                <p className="font-mono text-sm">{formatDate(log.createdAt)}</p>
              </div>
              <div className="w-full flex flex-col items-start justify-start gap-2 p-4">
                <Label className="text-sm font-semibold text-muted-foreground w-full text-left">
                  Action
                </Label>
                <p className="font-medium">{formatAction(log.action)}</p>
              </div>
              <div className="w-full flex flex-col items-start justify-start gap-2 p-4">
                <Label className="text-sm font-semibold text-muted-foreground w-full text-left">
                  User ID
                </Label>
                <p className="font-mono text-sm">{log.userId || "System"}</p>
              </div>
              <div className="w-full flex flex-col items-start justify-start gap-2 p-4">
                <Label className="text-sm font-semibold text-muted-foreground w-full text-left">
                  Organization ID
                </Label>
                <p className="font-mono text-sm break-all">
                  {log.organizationId}
                </p>
              </div>
              <div className="w-full flex flex-col items-start justify-start gap-2 p-4">
                <Label className="text-sm font-semibold text-muted-foreground w-full text-left">
                  Metadata
                </Label>
                <div className="w-full p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                  <JsonHighlighter
                    json={formatMetadata(log.metadata)}
                    className="whitespace-pre"
                  />
                </div>
              </div>
            </>
          ) : (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>No log selected</EmptyTitle>
                <EmptyDescription>
                  Select an audit log to view its details.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
