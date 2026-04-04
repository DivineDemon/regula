import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import {
  getAlertStatistics,
  getAlertTrends,
  getCrawlStatistics,
  getTargetStatistics,
  getUsageAnalytics,
} from "@/lib/services/analytics";
import { calculateComplianceHealthScore } from "@/lib/services/compliance-health";
import { getOrgAdaptiveSignalsSnapshot } from "@/lib/services/feedback-features";
import { getOrgComplianceAnalytics } from "@/lib/services/kpi";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    const type = searchParams.get("type"); // trends, statistics, health, usage, compliance-analytics, adaptive-signals

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

    switch (type) {
      case "trends": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const groupBy = searchParams.get("groupBy") as
          | "day"
          | "week"
          | "month"
          | undefined;

        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: "startDate and endDate are required for trends" },
            { status: 400 },
          );
        }

        const trends = await getAlertTrends({
          organizationId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          groupBy: groupBy || "day",
        });

        return NextResponse.json({ trends });
      }

      case "statistics": {
        const [alertStats, targetStats, crawlStats] = await Promise.all([
          getAlertStatistics(organizationId),
          getTargetStatistics(organizationId),
          getCrawlStatistics(organizationId),
        ]);

        return NextResponse.json({
          alerts: alertStats,
          targets: targetStats,
          crawls: crawlStats,
        });
      }

      case "health": {
        const health = await calculateComplianceHealthScore(organizationId);
        return NextResponse.json({ health });
      }

      case "usage": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const usage = await getUsageAnalytics(
          organizationId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined,
        );
        return NextResponse.json({ usage });
      }

      case "compliance-analytics": {
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const groupBy =
          (searchParams.get("groupBy") as "day" | "week") || "day";
        if (!startDate || !endDate) {
          return NextResponse.json(
            {
              error:
                "startDate and endDate are required for compliance-analytics",
            },
            { status: 400 },
          );
        }
        const analytics = await getOrgComplianceAnalytics(
          organizationId,
          new Date(startDate),
          new Date(endDate),
          groupBy,
        );
        return NextResponse.json(analytics);
      }

      case "adaptive-signals": {
        const snapshot = await getOrgAdaptiveSignalsSnapshot(organizationId);
        return NextResponse.json(snapshot);
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid type. Must be trends, statistics, health, usage, compliance-analytics, or adaptive-signals",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
