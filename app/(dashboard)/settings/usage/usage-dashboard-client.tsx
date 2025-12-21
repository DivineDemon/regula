"use client";

import { Activity, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!usageData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Failed to load usage information
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const targetsUsagePercent = usageData.usagePercentages.targets;
  const targetsLimit =
    usageData.limits.targets === "Infinity"
      ? "Unlimited"
      : String(usageData.limits.targets);
  const isTargetsWarning = targetsUsagePercent >= 80;
  const isTargetsCritical = targetsUsagePercent >= 100;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the {usageData.plan} plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{usageData.plan}</p>
              <p className="text-sm text-muted-foreground">
                {usageData.limits.realTimeAlerts
                  ? "Real-time alerts enabled"
                  : "Daily digest emails"}
              </p>
            </div>
            <a href="/settings/billing">
              <button
                type="button"
                className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Manage Plan
              </button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Targets Usage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Targets</CardTitle>
              {isTargetsCritical ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : isTargetsWarning ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <CardDescription>
              {usageData.usage.targets} / {targetsLimit} targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span className="font-medium">{targetsUsagePercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    isTargetsCritical
                      ? "bg-destructive"
                      : isTargetsWarning
                        ? "bg-yellow-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(targetsUsagePercent, 100)}%` }}
                />
              </div>
              {isTargetsCritical && (
                <p className="text-sm text-destructive">
                  You&apos;ve reached your plan limit. Upgrade to add more
                  targets.
                </p>
              )}
              {isTargetsWarning && !isTargetsCritical && (
                <p className="text-sm text-yellow-600">
                  You&apos;re approaching your plan limit.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Crawls Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Crawls</CardTitle>
            <CardDescription>
              Crawls executed this month: {usageData.usage.crawls}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{usageData.usage.crawls}</p>
                <p className="text-sm text-muted-foreground">
                  Frequency: {usageData.limits.crawlFrequency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>
              Alerts generated this month: {usageData.usage.alerts}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{usageData.usage.alerts}</p>
                <p className="text-sm text-muted-foreground">
                  {usageData.limits.realTimeAlerts
                    ? "Real-time notifications"
                    : "Daily digest"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              Data retention:{" "}
              {usageData.limits.retentionDays === "Infinity"
                ? "Unlimited"
                : `${usageData.limits.retentionDays} days`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {formatBytes(usageData.usage.storageBytes)}
                </p>
                <p className="text-sm text-muted-foreground">Total storage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
