"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CookieConsentRequiredBanner } from "@/components/cookie-consent-required-banner";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { AlertStatus } from "@/lib/db/schema/alerts";
import { cn } from "@/lib/utils";
import { AlertsBySeverity } from "./dashboard/alerts-by-severity";
import { AlertsByStatus } from "./dashboard/alerts-by-status";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

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

  const alertsBySeverityData = Object.entries(metrics.alerts.bySeverity)
    .filter(([severity]) => severity !== "unknown")
    .map(([severity, count]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      severityKey: severity,
      count,
      name: severity,
    }));

  const alertsByStatusData = Object.entries(metrics.alerts.byStatus).map(
    ([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      statusKey: status,
      count,
      name: status,
    }),
  );

  return (
    <>
      <CookieConsentRequiredBanner />
      <div className="w-full h-full flex flex-col items-start justify-start gap-5">
        <div className="w-full flex flex-col items-start justify-start gap-2">
          <h1 className="w-full text-left text-3xl font-bold">Dashboard</h1>
          <p className="w-full text-left text-muted-foreground">
            Overview of your regulatory monitoring activity
          </p>
        </div>
        <div className="w-full grid grid-cols-4 gap-5 items-center justify-center">
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <AlertCircle className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {metrics.alerts.active}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                Active Alerts
              </span>
            </div>
          </div>
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <Target className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {metrics.targets.total}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                Total Targets
              </span>
            </div>
          </div>
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <TrendingUp className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {metrics.alerts.bySeverity.high}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                High Impact Alerts
              </span>
            </div>
          </div>
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <Clock className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {metrics.alerts.active}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                New Alerts
              </span>
            </div>
          </div>
        </div>
        <div className="w-full grid grid-cols-2 gap-5 items-center justify-center">
          <AlertsByStatus data={alertsByStatusData} />
          {alertsBySeverityData.length > 0 && (
            <AlertsBySeverity data={alertsBySeverityData} />
          )}
        </div>
        <div className="w-full h-full border rounded-3xl flex flex-col items-start justify-start divide-y">
          <div className="w-full flex items-center justify-center p-5 border-b">
            <span className="flex-1 text-left text-lg font-bold">
              Recent Alerts
            </span>
            <Link
              href="/alerts"
              className={cn(
                buttonVariants({
                  variant: "outline",
                  size: "sm",
                }),
              )}
            >
              View All
            </Link>
          </div>
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
            <div className="w-full grid grid-cols-3 items-start justify-start divide-y gap-2.5 p-2.5">
              {metrics.alerts.recent.map((alert) => (
                <div
                  key={alert.id}
                  className="w-full col-span-1 flex flex-col items-start justify-start border rounded-lg"
                >
                  <div className="w-full flex items-center justify-center p-2.5 border-b">
                    <span className="flex-1 text-left font-bold">
                      {alert.target.label}
                    </span>
                    <Link
                      href={`/alerts/${alert.id}?organizationId=${organizationId}`}
                      className={cn(
                        buttonVariants({
                          variant: "ghost",
                          size: "icon",
                        }),
                      )}
                    >
                      <ArrowUpRight />
                    </Link>
                  </div>
                  {alert.summary && (
                    <p className="w-full text-left text-sm text-muted-foreground p-2.5 border-b">
                      {alert.summary}
                    </p>
                  )}
                  <div className="w-full flex items-center justify-center p-2.5">
                    <span className="flex-1 text-left text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      {getStatusBadge(alert.status)}
                      {getSeverityBadge(alert.impactScore)}
                      {alert.target.jurisdiction && (
                        <Badge variant="outline">
                          {alert.target.jurisdiction}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
