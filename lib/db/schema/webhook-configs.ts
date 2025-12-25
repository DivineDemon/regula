import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

/**
 * Webhook configurations for organizations
 * Stores webhook endpoints and their configurations
 */
export type WebhookStatus = "active" | "inactive" | "error";

export const webhookConfigs = pgTable(
  "webhook_configs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Webhook name/description
    url: text("url").notNull(), // Webhook URL
    secret: text("secret"), // Optional webhook secret for signature verification
    status: text("status").$type<WebhookStatus>().notNull().default("active"),
    // Event filters (JSON)
    eventFilters: jsonb("eventFilters").$type<{
      alertStatuses?: string[]; // Only send for specific statuses
      minImpactScore?: number; // Minimum impact score
      categories?: string[]; // Only for specific categories
      jurisdictions?: string[]; // Only for specific jurisdictions
    }>(),
    // Retry configuration
    maxRetries: text("maxRetries").default("3"), // Number of retries
    timeout: text("timeout").default("10000"), // Timeout in ms
    // Statistics
    lastTriggeredAt: timestamp("lastTriggeredAt", { mode: "date" }),
    successCount: text("successCount").default("0"),
    failureCount: text("failureCount").default("0"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("webhook_configs_organizationId_idx").on(
      table.organizationId,
    ),
    statusIdx: index("webhook_configs_status_idx").on(table.status),
  }),
);
