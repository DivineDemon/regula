import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing";

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" })
    .unique(),
  plan: text("plan").notNull(), // free, starter, growth, enterprise
  status: text("status")
    .$type<SubscriptionStatus>()
    .notNull()
    .default("trialing"),
  currentPeriodStart: timestamp("currentPeriodStart", { mode: "date" }),
  currentPeriodEnd: timestamp("currentPeriodEnd", { mode: "date" }),
  stripeCustomerId: text("stripeCustomerId").unique(),
  stripeSubscriptionId: text("stripeSubscriptionId").unique(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
