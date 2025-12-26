import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { OrganizationProfile } from "../../types/organization-profile";

export type PlanType = "free" | "starter" | "growth" | "enterprise";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").$type<PlanType>().notNull().default("free"),
  // Comprehensive organization profile (JSONB)
  profile: jsonb("profile").$type<OrganizationProfile>(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
