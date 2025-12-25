import {
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { targets } from "./targets";
import { versions } from "./versions";

export type AlertStatus = "new" | "triaged" | "actioned" | "closed";

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: text("targetId")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    versionId: text("versionId")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    summary: text("summary"), // AI-generated summary
    impactScore: doublePrecision("impactScore"), // 0-1 score
    status: text("status").$type<AlertStatus>().notNull().default("new"),
    snoozedUntil: timestamp("snoozedUntil", { mode: "date" }), // Snooze until this date
    templateId: text("templateId"), // Optional template ID that was applied
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("alerts_organizationId_idx").on(
      table.organizationId,
    ),
    targetIdIdx: index("alerts_targetId_idx").on(table.targetId),
    versionIdIdx: index("alerts_versionId_idx").on(table.versionId),
    statusIdx: index("alerts_status_idx").on(table.status),
    impactScoreIdx: index("alerts_impactScore_idx").on(table.impactScore),
    createdAtIdx: index("alerts_createdAt_idx").on(table.createdAt),
    snoozedUntilIdx: index("alerts_snoozedUntil_idx").on(table.snoozedUntil),
    organizationIdStatusIdx: index("alerts_organizationId_status_idx").on(
      table.organizationId,
      table.status,
    ),
    organizationIdCreatedAtIdx: index("alerts_organizationId_createdAt_idx").on(
      table.organizationId,
      table.createdAt,
    ),
  }),
);
