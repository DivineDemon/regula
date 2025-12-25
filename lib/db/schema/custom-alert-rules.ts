import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

/**
 * Custom alert rules for organizations
 * Allows organizations to define custom logic for when alerts should be generated
 */
export type AlertRuleStatus = "active" | "inactive" | "draft";

export const customAlertRules = pgTable(
  "custom_alert_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Rule name
    description: text("description"), // Rule description
    status: text("status").$type<AlertRuleStatus>().notNull().default("draft"),
    // Rule conditions (JSON)
    conditions: jsonb("conditions").$type<{
      targetIds?: string[]; // Specific targets to apply to
      categories?: string[]; // Categories to apply to
      jurisdictions?: string[]; // Jurisdictions to apply to
      minImpactScore?: number; // Minimum impact score
      maxImpactScore?: number; // Maximum impact score
      keywords?: string[]; // Keywords that must be present in summary
      excludeKeywords?: string[]; // Keywords that exclude
      changeTypes?: string[]; // Specific change types (structural, content, attachment)
    }>(),
    // Rule actions (JSON)
    actions: jsonb("actions").$type<{
      autoStatus?: "new" | "triaged" | "actioned" | "closed"; // Auto-assign status
      autoAssignTo?: string[]; // User IDs to auto-assign
      applyTemplate?: string; // Template ID to apply
      addTags?: string[]; // Tag IDs to add
      notificationChannels?: string[]; // Which channels to notify
      suppressNotification?: boolean; // Suppress notifications
    }>(),
    priority: text("priority").default("normal"), // Rule priority (high, normal, low)
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    createdBy: text("createdBy"), // User ID who created the rule
  },
  (table) => ({
    organizationIdIdx: index("custom_alert_rules_organizationId_idx").on(
      table.organizationId,
    ),
    statusIdx: index("custom_alert_rules_status_idx").on(table.status),
  }),
);
