import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export type TargetStatus =
  | "active"
  | "pending"
  | "running"
  | "error"
  | "paused";
export type CrawlJobStatus = "pending" | "running" | "completed" | "failed";
export type TargetCategory =
  | "aml"
  | "kyc"
  | "licensing"
  | "fees"
  | "regulations"
  | "other";

export const targets = pgTable(
  "targets",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
    jurisdiction: text("jurisdiction"),
    category: text("category").$type<TargetCategory>(),
    status: text("status").$type<TargetStatus>().notNull().default("pending"),
    crawlFrequency: text("crawlFrequency").notNull().default("daily"), // daily, hourly, weekly, monthly
    // Job status tracking
    lastCrawlStatus: text("lastCrawlStatus").$type<CrawlJobStatus>(), // Status of the last crawl job
    lastCrawlAt: timestamp("lastCrawlAt", { mode: "date" }), // Timestamp of the last crawl attempt
    lastCrawlError: text("lastCrawlError"), // Error message if last crawl failed
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("targets_organizationId_idx").on(
      table.organizationId,
    ),
    statusIdx: index("targets_status_idx").on(table.status),
    categoryIdx: index("targets_category_idx").on(table.category),
    jurisdictionIdx: index("targets_jurisdiction_idx").on(table.jurisdiction),
  }),
);
