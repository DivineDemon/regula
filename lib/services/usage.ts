import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { usageMetrics } from "@/lib/db/schema";
import type { MetricType } from "@/lib/db/schema/usage-metrics";

/**
 * Usage tracking service
 */
export const usageService = {
  /**
   * Record a usage metric
   */
  async recordMetric({
    organizationId,
    metricType,
    value,
    period,
  }: {
    organizationId: string;
    metricType: MetricType;
    value: number;
    period: string; // e.g., "2024-01" for monthly, "2024-01-15" for daily
  }) {
    const metricId = nanoid();

    await db.insert(usageMetrics).values({
      id: metricId,
      organizationId,
      metricType,
      value,
      period,
    });

    return metricId;
  },

  /**
   * Get current usage for an organization
   */
  async getCurrentUsage(organizationId: string) {
    // Get current period (this month)
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get all metrics for current period
    const metrics = await db
      .select({
        metricType: usageMetrics.metricType,
        totalValue: sql<number>`SUM(${usageMetrics.value})`,
      })
      .from(usageMetrics)
      .where(
        and(
          eq(usageMetrics.organizationId, organizationId),
          eq(usageMetrics.period, currentPeriod),
        ),
      )
      .groupBy(usageMetrics.metricType);

    // Convert to object
    const usage: Partial<Record<MetricType, number>> = {};
    for (const metric of metrics) {
      usage[metric.metricType] = Number(metric.totalValue) || 0;
    }

    return {
      targets: usage.targets ?? 0,
      crawls: usage.crawls ?? 0,
      alerts: usage.alerts ?? 0,
      storageBytes: usage.storage_bytes ?? 0,
      apiCalls: usage.api_calls ?? 0,
      period: currentPeriod,
    };
  },

  /**
   * Get usage for a specific metric type
   */
  async getMetricUsage(
    organizationId: string,
    metricType: MetricType,
    period?: string,
  ) {
    const now = new Date();
    const currentPeriod =
      period ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const metrics = await db
      .select({
        totalValue: sql<number>`SUM(${usageMetrics.value})`,
      })
      .from(usageMetrics)
      .where(
        and(
          eq(usageMetrics.organizationId, organizationId),
          eq(usageMetrics.period, currentPeriod),
          eq(usageMetrics.metricType, metricType),
        ),
      );

    return Number(metrics[0]?.totalValue) || 0;
  },

  /**
   * Get usage history for an organization
   */
  async getUsageHistory(
    organizationId: string,
    metricType?: MetricType,
    limit = 12,
  ) {
    const conditions = [eq(usageMetrics.organizationId, organizationId)];
    if (metricType) {
      conditions.push(eq(usageMetrics.metricType, metricType));
    }

    const query = db
      .select({
        period: usageMetrics.period,
        metricType: usageMetrics.metricType,
        totalValue: sql<number>`SUM(${usageMetrics.value})`,
      })
      .from(usageMetrics)
      .where(and(...conditions))
      .groupBy(usageMetrics.period, usageMetrics.metricType)
      .orderBy(desc(usageMetrics.period));

    const metrics = await query.limit(limit);

    return metrics.map((m) => ({
      period: m.period,
      metricType: m.metricType,
      value: Number(m.totalValue) || 0,
    }));
  },

  /**
   * Increment a metric (atomic operation)
   */
  async incrementMetric({
    organizationId,
    metricType,
    amount = 1,
    period,
  }: {
    organizationId: string;
    metricType: MetricType;
    amount?: number;
    period?: string;
  }) {
    const now = new Date();
    const currentPeriod =
      period ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Check if metric exists for this period
    const existing = await db
      .select()
      .from(usageMetrics)
      .where(
        and(
          eq(usageMetrics.organizationId, organizationId),
          eq(usageMetrics.period, currentPeriod),
          eq(usageMetrics.metricType, metricType),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing metric
      await db
        .update(usageMetrics)
        .set({
          value: sql`${usageMetrics.value} + ${amount}`,
        })
        .where(eq(usageMetrics.id, existing[0].id));
    } else {
      // Create new metric
      await this.recordMetric({
        organizationId,
        metricType,
        value: amount,
        period: currentPeriod,
      });
    }
  },

  /**
   * Get current count of targets (real-time from targets table)
   */
  async getTargetCount(organizationId: string): Promise<number> {
    const { targets } = await import("@/lib/db/schema");
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(targets)
      .where(eq(targets.organizationId, organizationId));

    return Number(result[0]?.count) || 0;
  },
};
