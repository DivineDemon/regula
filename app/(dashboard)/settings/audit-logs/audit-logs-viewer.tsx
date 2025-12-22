"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditAction } from "@/lib/services/audit";

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action: "",
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
        ...(filters.action && { action: filters.action }),
        limit: filters.limit,
        offset: filters.offset,
      });

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setLogs(data);
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
    return action.replace(/_/g, " ").replace(/\./g, " > ");
  };

  const formatMetadata = (metadata: Record<string, unknown> | null) => {
    if (!metadata) return "—";
    return JSON.stringify(metadata, null, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select
          value={filters.action}
          onValueChange={(value) =>
            setFilters({ ...filters, action: value ?? "", offset: "0" })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            <SelectItem value="user.login">User Login</SelectItem>
            <SelectItem value="user.logout">User Logout</SelectItem>
            <SelectItem value="target.created">Target Created</SelectItem>
            <SelectItem value="target.updated">Target Updated</SelectItem>
            <SelectItem value="target.deleted">Target Deleted</SelectItem>
            <SelectItem value="alert.created">Alert Created</SelectItem>
            <SelectItem value="alert.status_changed">
              Alert Status Changed
            </SelectItem>
            <SelectItem value="alert.assigned">Alert Assigned</SelectItem>
            <SelectItem value="alert.comment_added">
              Alert Comment Added
            </SelectItem>
            <SelectItem value="alert.exported">Alert Exported</SelectItem>
            <SelectItem value="organization.member_invited">
              Member Invited
            </SelectItem>
            <SelectItem value="organization.member_removed">
              Member Removed
            </SelectItem>
            <SelectItem value="organization.member_role_changed">
              Member Role Changed
            </SelectItem>
            <SelectItem value="billing.subscription_created">
              Subscription Created
            </SelectItem>
            <SelectItem value="billing.subscription_updated">
              Subscription Updated
            </SelectItem>
            <SelectItem value="export.alerts">Alerts Exported</SelectItem>
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

        <Button onClick={fetchLogs} variant="outline">
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No audit logs found</EmptyTitle>
            <EmptyDescription>
              Audit logs will appear here as actions are performed in your
              organization.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Metadata</TableHead>
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
                    <TableCell className="max-w-md">
                      <pre className="text-xs overflow-auto whitespace-pre-wrap break-words">
                        {formatMetadata(log.metadata)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              disabled={Number.parseInt(filters.offset, 10) === 0}
              onClick={() =>
                setFilters({
                  ...filters,
                  offset: Math.max(
                    0,
                    Number.parseInt(filters.offset, 10) -
                      Number.parseInt(filters.limit, 10),
                  ).toString(),
                })
              }
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Showing {Number.parseInt(filters.offset, 10) + 1} to{" "}
              {Number.parseInt(filters.offset, 10) + logs.length}
            </span>
            <Button
              variant="outline"
              disabled={!hasMore}
              onClick={() =>
                setFilters({
                  ...filters,
                  offset: (
                    Number.parseInt(filters.offset, 10) +
                    Number.parseInt(filters.limit, 10)
                  ).toString(),
                })
              }
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
