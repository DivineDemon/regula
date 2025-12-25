import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export type MetricType =
  | "targets"
  | "crawls"
  | "alerts"
  | "storage_bytes"
  | "api_calls";

export const usageMetrics = pgTable(
  "usage_metrics",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    metricType: text("metricType").$type<MetricType>().notNull(),
    value: integer("value").notNull(),
    period: text("period").notNull(), // e.g., "2024-01" for monthly, "2024-01-15" for daily
    recordedAt: timestamp("recordedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("usage_metrics_organizationId_idx").on(
      table.organizationId,
    ),
    metricTypeIdx: index("usage_metrics_metricType_idx").on(table.metricType),
    recordedAtIdx: index("usage_metrics_recordedAt_idx").on(table.recordedAt),
    organizationIdRecordedAtIdx: index(
      "usage_metrics_organizationId_recordedAt_idx",
    ).on(table.organizationId, table.recordedAt),
  }),
);
