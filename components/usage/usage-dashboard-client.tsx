"use client";

import {
  Database,
  DollarSign,
  Inspect,
  Target,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

interface UsageData {
  plan: string;
  planType: string;
  limits: {
    targets: number | "Infinity";
    retentionDays: number | "Infinity";
    crawlFrequency: string;
    realTimeAlerts: boolean;
  };
  usage: {
    targets: number;
    crawls: number;
    alerts: number;
    storageBytes: number;
  };
  usagePercentages: {
    targets: number;
  };
}

export function UsageDashboardClient({
  organizationId,
  organizationName: _organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/settings/usage?organizationId=${organizationId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setUsageData(data);
        }
      } catch (error) {
        console.error("Error fetching usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="w-full grid grid-cols-5 gap-5 items-start justify-start">
        {["targets", "crawls", "alerts", "storage", "plan"].map((id) => (
          <div
            key={id}
            className="w-full col-span-1 border rounded-lg p-2.5 flex items-center justify-center gap-2.5"
          >
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Skeleton className="h-6 w-24 mr-auto" />
              <Skeleton className="h-4 w-32 mr-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!usageData) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert className="size-6" />
          </EmptyMedia>
          <EmptyTitle>Failed to load usage information</EmptyTitle>
          <EmptyDescription>
            We couldn't retrieve your usage data. Please try refreshing the page
            or contact support if the problem persists.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const targetsLimit =
    usageData.limits.targets === "Infinity" || usageData.limits.targets === null
      ? "Unlimited"
      : String(usageData.limits.targets);

  return (
    <div className="w-full grid grid-cols-5 gap-5 items-start justify-start">
      <div className="w-full col-span-1 border rounded-lg p-2.5 flex items-center justify-center gap-2.5">
        <div className="size-11 bg-primary/20 text-primary p-3 rounded-full">
          <DollarSign className="size-full" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="w-full text-left text-xl font-bold">
            {usageData.plan}
          </span>
          <span className="w-full text-left text-sm text-muted-foreground">
            {usageData.limits.realTimeAlerts
              ? "Real-time alerts enabled"
              : "Daily digest emails"}
          </span>
        </div>
      </div>
      <div className="w-full col-span-1 border rounded-lg p-2.5 flex items-center justify-center gap-2.5">
        <div className="size-11 bg-primary/20 text-primary p-3 rounded-full">
          <Target className="size-full" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="w-full text-left text-xl font-bold">
            {usageData.usage.targets ?? 0} / {targetsLimit}
          </span>
          <span className="w-full text-left text-sm text-muted-foreground">
            Targets usage
          </span>
        </div>
      </div>
      <div className="w-full col-span-1 border rounded-lg p-2.5 flex items-center justify-center gap-2.5">
        <div className="size-11 bg-primary/20 text-primary p-3 rounded-full">
          <Inspect className="size-full" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="w-full text-left text-xl font-bold">
            {usageData.usage.crawls ?? 0}
          </span>
          <span className="w-full text-left text-sm text-muted-foreground">
            Crawls executed this month
          </span>
        </div>
      </div>
      <div className="w-full col-span-1 border rounded-lg p-2.5 flex items-center justify-center gap-2.5">
        <div className="size-11 bg-primary/20 text-primary p-3 rounded-full">
          <TriangleAlert className="size-full" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="w-full text-left text-xl font-bold">
            {usageData.usage.alerts ?? 0}
          </span>
          <span className="w-full text-left text-sm text-muted-foreground">
            Alerts generated this month
          </span>
        </div>
      </div>
      <div className="w-full col-span-1 border rounded-lg p-2.5 flex items-center justify-center gap-2.5">
        <div className="size-11 bg-primary/20 text-primary p-3 rounded-full">
          <Database className="size-full" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="w-full text-left text-xl font-bold">
            {formatBytes(usageData.usage.storageBytes ?? 0)}
          </span>
          <span className="w-full text-left text-sm text-muted-foreground">
            Storage used this month
          </span>
        </div>
      </div>
    </div>
  );
}
