import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import {
  getAlertStatistics,
  getCrawlStatistics,
  getTargetStatistics,
  getUsageAnalytics,
} from "@/lib/services/analytics";
import { calculateComplianceHealthScore } from "@/lib/services/compliance-health";

/**
 * Export analytics data as CSV
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    const format = searchParams.get("format") || "csv"; // csv or json

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify user is member of organization
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Fetch all analytics data
    const [alertStats, targetStats, crawlStats, usage, health] =
      await Promise.all([
        getAlertStatistics(organizationId),
        getTargetStatistics(organizationId),
        getCrawlStatistics(
          organizationId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        ),
        getUsageAnalytics(
          organizationId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        ),
        calculateComplianceHealthScore(organizationId),
      ]);

    if (format === "json") {
      return NextResponse.json({
        alerts: alertStats,
        targets: targetStats,
        crawls: crawlStats,
        usage,
        health,
        exportedAt: new Date().toISOString(),
      });
    }

    // Generate CSV
    const csvLines: string[] = [];
    csvLines.push("Analytics Export");
    csvLines.push(`Exported At,${new Date().toISOString()}`);
    csvLines.push("");

    // Alert Statistics
    csvLines.push("Alert Statistics");
    csvLines.push("Metric,Value");
    csvLines.push(`Total Alerts,${alertStats.total}`);
    csvLines.push(`New,${alertStats.byStatus.new}`);
    csvLines.push(`Triaged,${alertStats.byStatus.triaged}`);
    csvLines.push(`Actioned,${alertStats.byStatus.actioned}`);
    csvLines.push(`Closed,${alertStats.byStatus.closed}`);
    csvLines.push(
      `Average Impact Score,${alertStats.avgImpactScore.toFixed(2)}`,
    );
    csvLines.push(`High Impact Count,${alertStats.highImpactCount}`);
    csvLines.push("");

    // Target Statistics
    csvLines.push("Target Statistics");
    csvLines.push("Metric,Value");
    csvLines.push(`Total Targets,${targetStats.total}`);
    csvLines.push(`Active,${targetStats.active}`);
    csvLines.push(`Pending,${targetStats.pending}`);
    csvLines.push(`Error,${targetStats.error}`);
    csvLines.push("");

    // Crawl Statistics
    csvLines.push("Crawl Statistics");
    csvLines.push("Metric,Value");
    csvLines.push(`Total Crawls,${crawlStats.total}`);
    csvLines.push(`With Changes,${crawlStats.withChanges}`);
    csvLines.push(`Without Changes,${crawlStats.withoutChanges}`);
    csvLines.push("");

    // Compliance Health
    csvLines.push("Compliance Health Score");
    csvLines.push("Metric,Value");
    csvLines.push(`Overall Score,${health.overallScore}`);
    csvLines.push(`Alert Response Time,${health.breakdown.alertResponseTime}`);
    csvLines.push(
      `Alert Resolution Rate,${health.breakdown.alertResolutionRate}`,
    );
    csvLines.push(`Target Coverage,${health.breakdown.targetCoverage}`);
    csvLines.push(`High Impact Alerts,${health.breakdown.highImpactAlerts}`);
    csvLines.push("");

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
