import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { targets } from "./targets";
import { versions } from "./versions";

export type AlertStatus = "new" | "triaged" | "actioned" | "closed";

export const alerts = pgTable("alerts", {
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
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
