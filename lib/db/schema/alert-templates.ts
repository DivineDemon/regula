import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

/**
 * Alert templates for common alert types
 * Organizations can create custom templates for recurring alert patterns
 */
export const alertTemplates = pgTable(
  "alert_templates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Template name
    description: text("description"), // Template description
    category: text("category"), // aml, kyc, licensing, fees, regulations, other
    jurisdiction: text("jurisdiction"), // Optional jurisdiction filter
    // Template configuration
    config: jsonb("config").$type<{
      minImpactScore?: number; // Minimum impact score to trigger
      requiredKeywords?: string[]; // Keywords that must be present
      excludedKeywords?: string[]; // Keywords that exclude from template
      autoStatus?: "new" | "triaged" | "actioned"; // Auto-assign status
      autoAssignTo?: string[]; // User IDs to auto-assign
      notificationChannels?: string[]; // Which channels to notify
    }>(),
    isDefault: text("isDefault").default("false"), // Whether this is a default template
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("alert_templates_organizationId_idx").on(
      table.organizationId,
    ),
    categoryIdx: index("alert_templates_category_idx").on(table.category),
  }),
);
