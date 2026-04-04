"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  DollarSign,
  MousePointerClick,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PlatformKpis {
  northStar: {
    orgsWithActionableAlertLast7Days: number;
    description: string;
  };
  product: {
    activationRate: number;
    timeToFirstAlertHours: number | null;
    weeklyActiveOrganizations: number;
    alertEngagementRate: number;
    falsePositiveRate: number;
    actionableAlertRatio: number;
    averageAlertsPerOrg: number;
  };
  growth: {
    totalOrganizations: number;
    totalAlerts: number;
    activatedOrganizations: number;
  };
  financial: {
    mrr: number;
    paidOrgs: number;
  };
  operational: {
    crawlSuccessRate: number | null;
    totalCrawlsLast30Days: number;
  };
}

export function FounderKpisClient() {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const res = await fetch("/api/admin/kpis");
        if (!res.ok) {
          if (res.status === 403) setError("Access denied");
          else setError("Failed to load KPIs");
          return;
        }
        const data: PlatformKpis = await res.json();
        setKpis(data);
      } catch {
        setError("Failed to load KPIs");
      } finally {
        setLoading(false);
      }
    };
    fetchKpis();
    const interval = setInterval(fetchKpis, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6", "sk7", "sk8"].map((id) => (
          <Skeleton key={id} className="h-32" />
        ))}
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <p className="text-destructive">
        {error ?? "Failed to load founder metrics"}
      </p>
    );
  }

  const mrrDollars = (kpis.financial.mrr / 100).toFixed(2);

  return (
    <div className="space-y-8">
      {/* North Star */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            North Star
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {kpis.northStar.orgsWithActionableAlertLast7Days}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {kpis.northStar.description}
          </p>
        </CardContent>
      </Card>

      {/* Founder metrics row (from kpi-framework) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Activation rate
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.product.activationRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Orgs with targets that got ≥1 alert
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WAO</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.product.weeklyActiveOrganizations}
            </div>
            <p className="text-xs text-muted-foreground">
              Weekly active organizations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Actionable alert ratio
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.product.actionableAlertRatio}%
            </div>
            <p className="text-xs text-muted-foreground">
              Alerts scored medium/high impact
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mrrDollars}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.financial.paidOrgs} paid orgs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Technical health */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Technical health</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Alert engagement
              </CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.product.alertEngagementRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Opened or acted upon
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                False-positive rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.product.falsePositiveRate}%
              </div>
              <p className="text-xs text-muted-foreground">Target &lt; 15%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TTFA (avg)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.product.timeToFirstAlertHours != null
                  ? `${kpis.product.timeToFirstAlertHours}h`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                Time to first alert
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Crawls (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.operational.totalCrawlsLast30Days.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Version records</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Growth */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Growth</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Organizations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.growth.totalOrganizations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activated</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.growth.activatedOrganizations}
              </div>
              <p className="text-xs text-muted-foreground">
                Orgs with ≥1 alert
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.growth.totalAlerts.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg {kpis.product.averageAlertsPerOrg} per activated org
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
