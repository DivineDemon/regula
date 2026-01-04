"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronLeftIcon,
  ChevronRightIcon,
  Download,
  Eye,
  Search,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  status: AlertStatus;
  summary: string | null;
  impactScore: number | null;
  createdAt: Date;
  target: {
    id: string;
    label: string;
    jurisdiction: string | null;
    category: string | null;
  };
}

interface AlertsResponse {
  alerts: Array<{ alert: Alert; target: Alert["target"] }>;
  total: number;
}

interface AlertsListProps {
  organizationId: string;
}

export function AlertsList({ organizationId }: AlertsListProps) {
  const [alerts, setAlerts] = useState<AlertsResponse["alerts"]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch jurisdictions and categories
  useEffect(() => {
    if (!organizationId) return;

    Promise.all([
      fetch(`/api/alerts/jurisdictions?organizationId=${organizationId}`),
      fetch(`/api/alerts/categories?organizationId=${organizationId}`),
    ])
      .then(async ([jurRes, catRes]) => {
        const [jurData, catData] = await Promise.all([
          jurRes.json(),
          catRes.json(),
        ]);
        if (jurData.jurisdictions) {
          setJurisdictions(jurData.jurisdictions);
        }
        if (catData.categories) {
          setCategories(catData.categories);
        }
      })
      .catch(() => {});
  }, [organizationId]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId,
      });

      const response = await fetch(`/api/alerts?${params.toString()}`);
      const data: AlertsResponse = await response.json();

      setAlerts(data.alerts);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(true);
    try {
      // For now, export all alerts (server-side export)
      // TODO: Implement client-side export of filtered data if needed
      const params = new URLSearchParams({
        organizationId,
        format,
      });

      const response = await fetch(`/api/alerts/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alerts-export-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Alerts exported successfully");
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export alerts. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const getSeverityBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 0.7) {
      return (
        <Badge
          variant="destructive"
          className="uppercase bg-red-500/10 text-red-700 dark:text-red-400"
        >
          High
        </Badge>
      );
    }
    if (score >= 0.4) {
      return (
        <Badge className="uppercase bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          Medium
        </Badge>
      );
    }
    return (
      <Badge className="uppercase bg-green-500/10 text-green-700 dark:text-green-400">
        Low
      </Badge>
    );
  };

  const getStatusBadge = (status: AlertStatus) => {
    const variants = {
      new: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      triaged: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      actioned: "bg-green-500/10 text-green-700 dark:text-green-400",
      closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
    };
    return (
      <Badge className={cn("uppercase", variants[status])}>{status}</Badge>
    );
  };

  const getImpactScoreBadge = (score: number | null) => {
    if (score === null) {
      return <span className="text-muted-foreground">—</span>;
    }

    const percentage = (score * 100).toFixed(0);

    if (score >= 0.7) {
      return (
        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
          {percentage}%
        </Badge>
      );
    }
    if (score >= 0.4) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          {percentage}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
        {percentage}%
      </Badge>
    );
  };

  const handleSelectAll = () => {
    if (selectedAlerts.size === alerts.length) {
      setSelectedAlerts(new Set());
    } else {
      setSelectedAlerts(new Set(alerts.map(({ alert }) => alert.id)));
    }
  };

  const handleSelectAlert = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const handleBulkStatusUpdate = async (status: AlertStatus) => {
    if (selectedAlerts.size === 0) return;

    setBulkUpdating(true);
    try {
      const response = await fetch("/api/alerts/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          alertIds: Array.from(selectedAlerts),
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update alerts");
      }

      // Clear selection and refresh
      setSelectedAlerts(new Set());
      await fetchAlerts();
      toast.success("Alerts updated successfully");
    } catch (error) {
      console.error("Error updating alerts:", error);
      toast.error("Failed to update alerts. Please try again.");
    } finally {
      setBulkUpdating(false);
    }
  };

  // Define columns for the data table
  const columns: ColumnDef<{ alert: Alert; target: Alert["target"] }>[] = [
    {
      id: "select",
      header: () => (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="h-8 w-8 p-0"
          aria-label="Select all alerts"
        >
          {selectedAlerts.size === alerts.length ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const alertId = row.original.alert.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSelectAlert(alertId)}
            className="h-6 w-6 p-0"
            aria-label={`Select alert ${alertId}`}
          >
            {selectedAlerts.has(alertId) ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const target = row.original.target;
        return (
          <Link
            href={`/alerts/${row.original.alert.id}?organizationId=${organizationId}`}
            className="font-semibold hover:underline"
            aria-label={`View alert for ${target.label}`}
          >
            {target.label}
          </Link>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        const filterValue = column.getFilterValue() as string | undefined;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-0 font-semibold hover:bg-transparent data-[state=open]:bg-muted"
              >
                Status
                {filterValue && filterValue !== "all" && (
                  <span className="ml-2 uppercase rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {filterValue}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => column.setFilterValue(undefined)}
                className={
                  !filterValue || filterValue === "all" ? "bg-muted" : ""
                }
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("new")}
                className={filterValue === "new" ? "bg-muted" : ""}
              >
                New
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("triaged")}
                className={filterValue === "triaged" ? "bg-muted" : ""}
              >
                Triaged
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("actioned")}
                className={filterValue === "actioned" ? "bg-muted" : ""}
              >
                Actioned
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("closed")}
                className={filterValue === "closed" ? "bg-muted" : ""}
              >
                Closed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      cell: ({ row }) => {
        return getStatusBadge(row.original.alert.status);
      },
      filterFn: (row, _, value) => {
        if (!value || value === "all") return true;
        return row.original.alert.status === value;
      },
    },
    {
      accessorKey: "severity",
      header: ({ column }) => {
        const filterValue = column.getFilterValue() as string | undefined;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-0 font-semibold hover:bg-transparent data-[state=open]:bg-muted"
              >
                Severity
                {filterValue && filterValue !== "all" && (
                  <span className="ml-2 uppercase rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {filterValue}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => column.setFilterValue(undefined)}
                className={
                  !filterValue || filterValue === "all" ? "bg-muted" : ""
                }
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("high")}
                className={filterValue === "high" ? "bg-muted" : ""}
              >
                High
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("medium")}
                className={filterValue === "medium" ? "bg-muted" : ""}
              >
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => column.setFilterValue("low")}
                className={filterValue === "low" ? "bg-muted" : ""}
              >
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      cell: ({ row }) => {
        return getSeverityBadge(row.original.alert.impactScore);
      },
      filterFn: (row, _, value) => {
        if (!value || value === "all") return true;
        const score = row.original.alert.impactScore;
        if (score === null) return false;
        if (value === "high") return score >= 0.7;
        if (value === "medium") return score >= 0.4 && score < 0.7;
        if (value === "low") return score < 0.4;
        return true;
      },
    },
    {
      accessorKey: "jurisdiction",
      header: ({ column }) => {
        const filterValue = column.getFilterValue() as string | undefined;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-0 font-semibold hover:bg-transparent data-[state=open]:bg-muted"
              >
                Jurisdiction
                {filterValue && filterValue !== "all" && (
                  <span className="ml-2 uppercase rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {filterValue}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => column.setFilterValue(undefined)}
                className={
                  !filterValue || filterValue === "all" ? "bg-muted" : ""
                }
              >
                All
              </DropdownMenuItem>
              {jurisdictions
                .filter((j) => j && j.trim() !== "")
                .map((j) => (
                  <DropdownMenuItem
                    key={j}
                    onClick={() => column.setFilterValue(j)}
                    className={cn("uppercase", {
                      "bg-muted": filterValue === j,
                    })}
                  >
                    {j}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      cell: ({ row }) => {
        const jurisdiction = row.original.target.jurisdiction;
        return jurisdiction ? (
          <span className="uppercase">{jurisdiction}</span>
        ) : (
          "N/A"
        );
      },
      filterFn: (row, _, value) => {
        if (!value || value === "all") return true;
        return row.original.target.jurisdiction === value;
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        const filterValue = column.getFilterValue() as string | undefined;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-0 font-semibold hover:bg-transparent data-[state=open]:bg-muted"
              >
                Category
                {filterValue && filterValue !== "all" && (
                  <span className="ml-2 uppercase rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    {filterValue}
                  </span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => column.setFilterValue(undefined)}
                className={
                  !filterValue || filterValue === "all" ? "bg-muted" : ""
                }
              >
                All
              </DropdownMenuItem>
              {categories
                .filter((c) => c && c.trim() !== "")
                .map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => column.setFilterValue(c)}
                    className={cn("uppercase", {
                      "bg-muted": filterValue === c,
                    })}
                  >
                    {c}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      cell: ({ row }) => {
        const category = row.original.target.category;
        return category ? <span className="uppercase">{category}</span> : "N/A";
      },
      filterFn: (row, _, value) => {
        if (!value || value === "all") return true;
        return row.original.target.category === value;
      },
    },
    {
      accessorKey: "impact_score",
      header: "Impact Score",
      cell: ({ row }) => {
        return getImpactScoreBadge(row.original.alert.impactScore);
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => {
        return (
          <span className="text-sm">
            {new Date(row.original.alert.createdAt).toLocaleString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-end">
            <Link
              href={`/alerts/${row.original.alert.id}?organizationId=${organizationId}`}
              aria-label={`View details for alert ${row.original.alert.id}`}
            >
              <Button type="button" variant="outline" size="icon">
                <Eye />
              </Button>
            </Link>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  // Create table instance
  const table = useReactTable({
    data: alerts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const alert = row.original.alert;
      const target = row.original.target;

      return (
        alert.summary?.toLowerCase().includes(search) ||
        target.label.toLowerCase().includes(search) ||
        target.jurisdiction?.toLowerCase().includes(search) ||
        target.category?.toLowerCase().includes(search) ||
        false
      );
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex flex-col items-start justify-start gap-2">
        <h1 className="w-full text-left text-3xl font-bold">Alerts</h1>
        <p className="w-full text-left text-muted-foreground">
          View and manage regulatory change alerts ({total} total)
        </p>
      </div>
      {loading ? (
        <div className="w-full h-full rounded-3xl flex flex-col items-start justify-start gap-5">
          {/* Search and Export Buttons Skeleton */}
          <div className="w-full flex items-center justify-end gap-2.5">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          {/* Table Skeleton */}
          <div className="w-full border rounded-3xl overflow-hidden">
            <div className="w-full h-[calc(100vh-341px)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="w-12 bg-card">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="bg-card">
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    <TableHead className="text-right bg-card">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 10 }).map((_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton rows are static and won't be reordered
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-6 w-6 rounded" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-9 w-9 rounded-md ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between flex-wrap gap-5 p-5 border-t mt-auto w-full">
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="w-full h-full rounded-3xl flex flex-col items-center justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlertCircle className="size-6" />
              </EmptyMedia>
              <EmptyTitle>No alerts found</EmptyTitle>
              <EmptyDescription>
                Alerts will appear here when changes are detected in your
                monitored targets.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="w-full h-full rounded-3xl flex flex-col items-start justify-start gap-5">
          <div className="w-full flex items-center justify-end gap-2.5">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search alerts by summary, target, or jurisdiction..."
                value={table.getState().globalFilter ?? ""}
                onChange={(e) => table.setGlobalFilter(e.target.value)}
                className="pl-10"
                aria-label="Search alerts"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={exporting || total === 0}
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
              disabled={exporting || total === 0}
            >
              <Download className="mr-2 size-4" />
              Export PDF
            </Button>
            {selectedAlerts.size > 0 && (
              <div className="flex items-center gap-2.5">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(buttonVariants({ variant: "outline" }))}
                    disabled={bulkUpdating}
                  >
                    Bulk Actions ({selectedAlerts.size})
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => handleBulkStatusUpdate("triaged")}
                    >
                      Mark as Triaged
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkStatusUpdate("actioned")}
                    >
                      Mark as Actioned
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleBulkStatusUpdate("closed")}
                    >
                      Mark as Closed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  onClick={() => setSelectedAlerts(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          {/* Data Table for Alerts */}
          <div className="w-full border rounded-3xl overflow-hidden">
            <div className="w-full h-[calc(100vh-331px)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-b">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            header.id === "actions"
                              ? "text-right bg-card"
                              : "bg-card"
                          }
                          scope="col"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={
                          selectedAlerts.has(row.original.alert.id) &&
                          "selected"
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={
                              cell.column.id === "actions"
                                ? "text-right"
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-5 p-5 border-t mt-auto w-full">
              <div className="text-sm text-muted-foreground">
                Showing&nbsp;
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
                &nbsp; to&nbsp;
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length,
                )}
                &nbsp; of {table.getFilteredRowModel().rows.length} alerts
                {table.getFilteredRowModel().rows.length !== total && (
                  <span className="ml-2">(filtered from {total} total)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon className="size-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Next page"
                >
                  <span className="sr-only sm:not-sr-only">Next</span>
                  <ChevronRightIcon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
