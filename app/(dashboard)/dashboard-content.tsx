"use client";

import { AlertCircle, Clock, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { AlertStatus } from "@/lib/db/schema/alerts";

interface DashboardMetrics {
  alerts: {
    active: number;
    total: number;
    byStatus: Record<AlertStatus, number>;
    bySeverity: Record<string, number>;
    recent: Array<{
      id: string;
      summary: string | null;
      impactScore: number | null;
      status: AlertStatus;
      createdAt: Date;
      target: {
        id: string;
        label: string;
        jurisdiction: string | null;
      };
    }>;
    overTime: Array<{ date: string; count: number }>;
  };
  targets: {
    total: number;
    byStatus: Record<string, number>;
  };
  usage: Record<string, number>;
}

interface DashboardContentProps {
  organizationId: string;
}

export function DashboardContent({ organizationId }: DashboardContentProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/metrics?organizationId=${organizationId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }
        const data: DashboardMetrics = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [organizationId]);

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

  // Chart configurations
  const alertsOverTimeConfig: ChartConfig = {
    count: {
      label: "Alerts",
      color: "hsl(var(--primary))",
    },
  };

  const alertsByStatusConfig: ChartConfig = {
    new: {
      label: "New",
      color: "hsl(217, 91%, 60%)",
    },
    triaged: {
      label: "Triaged",
      color: "hsl(43, 96%, 56%)",
    },
    actioned: {
      label: "Actioned",
      color: "hsl(142, 76%, 36%)",
    },
    closed: {
      label: "Closed",
      color: "hsl(215, 16%, 47%)",
    },
  };

  const alertsBySeverityConfig: ChartConfig = {
    high: {
      label: "High",
      color: "hsl(0, 84%, 60%)",
    },
    medium: {
      label: "Medium",
      color: "hsl(43, 96%, 56%)",
    },
    low: {
      label: "Low",
      color: "hsl(142, 76%, 36%)",
    },
  };

  // Color mapping functions for individual bars
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    return (
      alertsByStatusConfig[statusLower as keyof typeof alertsByStatusConfig]
        ?.color || "hsl(var(--primary))"
    );
  };

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    return (
      alertsBySeverityConfig[
        severityLower as keyof typeof alertsBySeverityConfig
      ]?.color || "hsl(var(--primary))"
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">
          Failed to load dashboard metrics
        </p>
      </div>
    );
  }

  // Prepare chart data
  const alertsOverTimeData = metrics.alerts.overTime.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: item.count,
  }));

  const alertsByStatusData = Object.entries(metrics.alerts.byStatus).map(
    ([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      statusKey: status, // Keep original key for color mapping
      count,
      name: status, // For chart config lookup
    }),
  );

  const alertsBySeverityData = Object.entries(metrics.alerts.bySeverity)
    .filter(([severity]) => severity !== "unknown")
    .map(([severity, count]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      severityKey: severity, // Keep original key for color mapping
      count,
      name: severity, // For chart config lookup
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Overview of your regulatory monitoring activity
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.alerts.active}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.alerts.total} total alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Targets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.targets.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.targets.byStatus.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Impact Alerts
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.alerts.bySeverity.high || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Alerts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.alerts.byStatus.new || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting triage</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alerts Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={alertsOverTimeConfig} className="h-[300px]">
              <AreaChart data={alertsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--color-count))"
                  fill="hsl(var(--color-count))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={alertsByStatusConfig} className="h-[300px]">
              <BarChart data={alertsByStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="status"
                      nameKey="statusKey"
                    />
                  }
                />
                <Bar dataKey="count">
                  {alertsByStatusData.map((entry) => (
                    <Cell
                      key={`cell-${entry.statusKey}`}
                      fill={getStatusColor(entry.statusKey)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Chart */}
      {alertsBySeverityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={alertsBySeverityConfig}
              className="h-[300px]"
            >
              <BarChart data={alertsBySeverityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelKey="severity"
                      nameKey="severityKey"
                    />
                  }
                />
                <Bar dataKey="count">
                  {alertsBySeverityData.map((entry) => (
                    <Cell
                      key={`cell-${entry.severityKey}`}
                      fill={getSeverityColor(entry.severityKey)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Alerts</CardTitle>
          <Link href="/alerts">
            <Button variant="outline">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {metrics.alerts.recent.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No alerts yet</EmptyTitle>
                <EmptyDescription>
                  Alerts will appear here when changes are detected in your
                  monitored targets.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-4">
              {metrics.alerts.recent.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/alerts/${alert.id}?organizationId=${organizationId}`}
                        className="font-semibold hover:underline"
                      >
                        {alert.target.label}
                      </Link>
                      {getStatusBadge(alert.status)}
                      {getSeverityBadge(alert.impactScore)}
                      {alert.target.jurisdiction && (
                        <Badge variant="outline">
                          {alert.target.jurisdiction}
                        </Badge>
                      )}
                    </div>
                    {alert.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {alert.summary}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/alerts/${alert.id}?organizationId=${organizationId}`}
                  >
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Target Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(metrics.targets.byStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
