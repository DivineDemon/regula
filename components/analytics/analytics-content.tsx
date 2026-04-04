"use client";

import { AlertCircle, Clock, Target, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertsByRegulator } from "./alerts-by-regulator";
import { AlertsOverTime } from "./alerts-over-time";

interface OrgComplianceAnalytics {
  alertsOverTime: Array<{
    date: string;
    count: number;
    openedOrActed: number;
    bySeverity: { low: number; medium: number; high: number };
  }>;
  byJurisdiction: Array<{ jurisdiction: string; count: number }>;
  summary: {
    totalAlerts: number;
    openedOrActedCount: number;
    engagementRate: number;
    actionableCount: number;
    actionableRatio: number;
    falsePositiveRate: number;
  };
}

interface ComplianceHealthScore {
  overallScore: number;
  breakdown: Record<string, number>;
  metrics: Record<string, number>;
}

interface AnalyticsContentProps {
  organizationId: string;
  organizationName: string;
}

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function AnalyticsContent({
  organizationId,
  organizationName,
}: AnalyticsContentProps) {
  const [rangeDays, setRangeDays] = useState("30");
  const [analytics, setAnalytics] = useState<OrgComplianceAnalytics | null>(
    null,
  );
  const [health, setHealth] = useState<ComplianceHealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const days = Number(rangeDays) || 30;
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    try {
      const [analyticsRes, healthRes] = await Promise.all([
        fetch(
          `/api/analytics?organizationId=${organizationId}&type=compliance-analytics&startDate=${startStr}&endDate=${endStr}&groupBy=day`,
        ),
        fetch(`/api/analytics?organizationId=${organizationId}&type=health`),
      ]);

      if (!analyticsRes.ok || !healthRes.ok) {
        setError("Failed to load analytics");
        return;
      }

      const analyticsData: OrgComplianceAnalytics = await analyticsRes.json();
      const healthData = await healthRes.json();
      setAnalytics(analyticsData);
      setHealth(healthData.health);
      setError(null);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [organizationId, rangeDays]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  if (loading && !analytics) {
    return (
      <div className="w-full h-full flex flex-col items-start justify-start gap-5">
        <div className="w-full flex items-center justify-center">
          <div className="flex-1 flex flex-col items-start justify-start gap-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-[180px] rounded-md shrink-0" />
        </div>
        <div className="w-full grid grid-cols-4 gap-5 items-center justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5"
            >
              <Skeleton className="size-12 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="w-full grid grid-cols-2 items-center justify-center gap-5">
          <Skeleton className="w-full h-72 rounded-lg" />
          <Skeleton className="w-full h-72 rounded-lg" />
        </div>
        <div className="w-full grid grid-cols-3 gap-5 items-center justify-center">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5"
            >
              <Skeleton className="size-12 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                <Skeleton className="h-7 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return <p className="text-destructive">{error}</p>;
  }

  const summary = analytics?.summary;
  const overTimeData = analytics?.alertsOverTime.map((d) => ({
    ...d,
    high: d.bySeverity.high,
    medium: d.bySeverity.medium,
    low: d.bySeverity.low,
    shortDate: new Date(d.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex items-center justify-center">
        <div className="flex-1 flex flex-col items-start justify-start gap-2">
          <h1 className="w-full text-left text-3xl font-bold">Analytics</h1>
          <p className="w-full text-left text-muted-foreground">
            Alerts over time, engagement, and coverage for {organizationName}
          </p>
        </div>
        <Select value={rangeDays} onValueChange={setRangeDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            {rangeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full grid grid-cols-4 gap-5 items-center justify-center">
        <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
          <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
            <AlertCircle className="size-full" />
          </div>
          <div className="flex-1 flex items-center flex-col justify-center gap-">
            <span className="w-full text-left text-2xl font-bold">
              {summary?.totalAlerts ?? 0}
            </span>
            <span className="w-full text-left text-sm text-muted-foreground">
              Total Alerts
            </span>
          </div>
        </div>
        <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
          <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
            <TrendingUp className="size-full" />
          </div>
          <div className="flex-1 flex items-center flex-col justify-center gap-">
            <span className="w-full text-left text-2xl font-bold">
              {summary?.engagementRate != null
                ? `${Math.round(summary.engagementRate)}%`
                : "—"}
            </span>
            <span className="w-full text-left text-sm text-muted-foreground">
              Engagement rate
            </span>
          </div>
        </div>
        <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
          <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
            <Target className="size-full" />
          </div>
          <div className="flex-1 flex items-center flex-col justify-center gap-">
            <span className="w-full text-left text-2xl font-bold">
              {summary?.actionableRatio != null
                ? `${Math.round(summary.actionableRatio)}%`
                : "—"}
            </span>
            <span className="w-full text-left text-sm text-muted-foreground">
              Actionable ratio
            </span>
          </div>
        </div>
        <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
          <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
            <Clock className="size-full" />
          </div>
          <div className="flex-1 flex items-center flex-col justify-center gap-">
            <span className="w-full text-left text-2xl font-bold">
              {health?.overallScore != null ? `${health.overallScore}` : "—"}
            </span>
            <span className="w-full text-left text-sm text-muted-foreground">
              Compliance health
            </span>
          </div>
        </div>
      </div>
      <div className="w-full grid grid-cols-2 items-center justify-center gap-5">
        {overTimeData && overTimeData.length > 0 && (
          <AlertsOverTime data={overTimeData ?? []} />
        )}
        {analytics?.byJurisdiction && analytics.byJurisdiction.length > 0 && (
          <AlertsByRegulator data={analytics.byJurisdiction ?? []} />
        )}
      </div>
      {summary && (summary.totalAlerts ?? 0) > 0 && (
        <div className="w-full grid grid-cols-3 gap-5 items-center justify-center">
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <Clock className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {summary.openedOrActedCount ?? 0}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                Opened / acted alerts
              </span>
            </div>
          </div>
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <Target className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {summary.actionableCount ?? 0}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                Actionable alerts
              </span>
            </div>
          </div>
          <div className="w-full col-span-1 p-2.5 rounded-lg border flex items-center justify-center gap-2.5">
            <div className="size-12 bg-primary/20 text-primary p-3 rounded-lg">
              <AlertCircle className="size-full" />
            </div>
            <div className="flex-1 flex items-center flex-col justify-center gap-">
              <span className="w-full text-left text-2xl font-bold">
                {summary.falsePositiveRate != null
                  ? `${Math.round(summary.falsePositiveRate)}%`
                  : "—"}
              </span>
              <span className="w-full text-left text-sm text-muted-foreground">
                False positive rate
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
