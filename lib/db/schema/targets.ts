import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export type TargetStatus = "active" | "pending" | "error" | "paused";
export type TargetCategory =
  | "aml"
  | "kyc"
  | "licensing"
  | "fees"
  | "regulations"
  | "other";

export const targets = pgTable("targets", {
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
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
