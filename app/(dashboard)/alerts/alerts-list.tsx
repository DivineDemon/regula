"use client";

import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Download,
  Filter,
  Search,
  Square,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AlertStatus } from "@/lib/db/schema/alerts";

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
  const [filters, setFilters] = useState({
    status: "" as string,
    severity: "" as string,
    jurisdiction: "" as string,
    category: "" as string,
    dateFrom: "" as string,
    dateTo: "" as string,
    search: "" as string,
  });
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== ""),
        ),
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
  }, [organizationId, filters]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        organizationId,
        format,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== ""),
        ),
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
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Failed to export alerts. Please try again.");
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
          className="bg-red-500/10 text-red-700 dark:text-red-400"
        >
          High
        </Badge>
      );
    }
    if (score >= 0.4) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
          Medium
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
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
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      severity: "",
      jurisdiction: "",
      category: "",
      dateFrom: "",
      dateTo: "",
      search: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

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
    } catch (error) {
      console.error("Error updating alerts:", error);
      alert("Failed to update alerts. Please try again.");
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage regulatory change alerts ({total} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedAlerts.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedAlerts.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" disabled={bulkUpdating}>
                    Bulk Actions
                  </Button>
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
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAlerts(new Set())}
              >
                Clear
              </Button>
            </div>
          )}
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
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 size-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {Object.values(filters).filter((v) => v !== "").length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search alerts by summary, target, or jurisdiction..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="pl-10"
          />
        </div>
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filter Alerts</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value || "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="triaged">Triaged</SelectItem>
                    <SelectItem value="actioned">Actioned</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={filters.severity}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, severity: value || "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All severities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jurisdiction</Label>
                <Select
                  value={filters.jurisdiction}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      jurisdiction: value || "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All jurisdictions</SelectItem>
                    {jurisdictions.map((j) => (
                      <SelectItem key={j} value={j}>
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, category: value || "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  Date From
                </Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  Date To
                </Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No alerts found</EmptyTitle>
            <EmptyDescription>
              {hasActiveFilters
                ? "Try adjusting your filters to see more results."
                : "Alerts will appear here when changes are detected in your monitored targets."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 pb-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 w-8 p-0"
            >
              {selectedAlerts.size === alerts.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Select all ({alerts.length})
            </span>
          </div>

          {alerts.map(({ alert, target }) => (
            <Card
              key={alert.id}
              className={`hover:bg-muted/50 transition-colors ${
                selectedAlerts.has(alert.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAlert(alert.id)}
                    className="h-6 w-6 p-0 mt-1"
                  >
                    {selectedAlerts.has(alert.id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/alerts/${alert.id}?organizationId=${organizationId}`}
                        className="font-semibold hover:underline"
                      >
                        {target.label}
                      </Link>
                      {getStatusBadge(alert.status)}
                      {getSeverityBadge(alert.impactScore)}
                      {target.jurisdiction && (
                        <Badge variant="outline">{target.jurisdiction}</Badge>
                      )}
                      {target.category && (
                        <Badge variant="outline">{target.category}</Badge>
                      )}
                    </div>
                    {alert.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alert.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                      {alert.impactScore !== null && (
                        <span>
                          Impact: {(alert.impactScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/alerts/${alert.id}?organizationId=${organizationId}`}
                  >
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
