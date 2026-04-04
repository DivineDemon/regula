"use client";

import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { actionOptions } from "@/lib/constants";
import type { AuditAction } from "@/lib/services/audit";
import { AuditDetailSheet } from "./audit-detail-sheet";

interface AuditLog {
  id: string;
  organizationId: string;
  userId: string | null;
  action: AuditAction;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export function AuditLogsViewer({
  organizationId,
}: {
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: "all",
    limit: "100",
    offset: "0",
  });
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        organizationId,
        ...(filters.action &&
          filters.action !== "all" && { action: filters.action }),
        limit: filters.limit,
        offset: filters.offset,
      });

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data);
      // If we get exactly the limit number of items, there might be more
      // If we get fewer items, we've reached the end
      setHasMore(data.length === Number.parseInt(filters.limit, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters.action, filters.limit, filters.offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString();
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\./g, " → ");
  };

  const _formatMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return "—";
    return JSON.stringify(metadata, null, 2);
  };

  const handleViewLog = (logId: string) => {
    setSelectedLogId(logId);
    setOpen(true);
  };

  return (
    <>
      <AuditDetailSheet
        open={open}
        onOpenChange={setOpen}
        auditLogId={selectedLogId}
        organizationId={organizationId}
      />
      <div className="w-full h-full flex flex-col items-start justify-start gap-5">
        <div className="w-full flex items-center justify-end gap-2.5">
          <Select
            value={filters.action || "all"}
            onValueChange={(value) =>
              setFilters({ ...filters, action: value ?? "all", offset: "0" })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((option) => (
                <SelectItem
                  key={option.value || "all"}
                  value={option.value || "all"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Limit"
            value={filters.limit}
            onChange={(e) =>
              setFilters({ ...filters, limit: e.target.value, offset: "0" })
            }
            className="w-[100px]"
            min="1"
            max="1000"
          />
          <Button onClick={fetchLogs} variant="default" size="lg">
            Refresh
          </Button>
        </div>
        {error ? (
          <div className="w-full h-[calc(100vh-262px)] flex flex-col items-center justify-center">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert />
                </EmptyMedia>
                <EmptyTitle>Error</EmptyTitle>
                <EmptyDescription>{error}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : loading ? (
          <div className="w-full h-[calc(100vh-262px)] flex flex-col items-start justify-start overflow-y-auto border rounded-3xl divide-y">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : logs.length === 0 ? (
          <div className="w-full h-[calc(100vh-262px)] flex flex-col items-center justify-center">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert />
                </EmptyMedia>
                <EmptyTitle>No audit logs found</EmptyTitle>
                <EmptyDescription>
                  Audit logs will appear here as actions are performed in your
                  organization.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="w-full h-[calc(100vh-262px)] flex flex-col items-start justify-start overflow-y-auto border rounded-3xl divide-y">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAction(log.action)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.userId || "System"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLog(log.id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="w-full flex justify-center items-center gap-2.5 p-2.5 bg-muted sticky bottom-0">
              <span className="flex-1 text-left text-sm text-muted-foreground">
                {logs.length > 0 ? (
                  <>
                    Showing {Number.parseInt(filters.offset, 10) + 1} to&nbsp;
                    {Number.parseInt(filters.offset, 10) + logs.length}
                    {hasMore && " (more available)"}
                  </>
                ) : (
                  "No results"
                )}
              </span>
              <Button
                variant="outline"
                disabled={Number.parseInt(filters.offset, 10) === 0}
                onClick={() => {
                  const currentOffset = Number.parseInt(filters.offset, 10);
                  const limit = Number.parseInt(filters.limit, 10);
                  const newOffset = Math.max(0, currentOffset - limit);
                  setFilters({
                    ...filters,
                    offset: newOffset.toString(),
                  });
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!hasMore || logs.length === 0}
                onClick={() => {
                  const currentOffset = Number.parseInt(filters.offset, 10);
                  const limit = Number.parseInt(filters.limit, 10);
                  setFilters({
                    ...filters,
                    offset: (currentOffset + limit).toString(),
                  });
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
