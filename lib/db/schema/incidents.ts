import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "mitigating" | "resolved";

export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("createdByUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    severity: text("severity").$type<IncidentSeverity>().notNull(),
    status: text("status").$type<IncidentStatus>().notNull().default("open"),
    title: text("title").notNull(),
    description: text("description"),
    impact: text("impact"),
    startedAt: timestamp("startedAt", { mode: "date" }),
    detectedAt: timestamp("detectedAt", { mode: "date" }),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("incidents_organizationId_idx").on(
      table.organizationId,
    ),
    statusIdx: index("incidents_status_idx").on(table.status),
    severityIdx: index("incidents_severity_idx").on(table.severity),
    createdAtIdx: index("incidents_createdAt_idx").on(table.createdAt),
  }),
);
