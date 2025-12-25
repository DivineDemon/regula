import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * API keys for programmatic access
 */
export type ApiKeyStatus = "active" | "revoked" | "expired";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(), // This is the key prefix (first 8 chars)
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // User who created the key
    name: text("name").notNull(), // Key name/description
    keyHash: text("keyHash").notNull(), // Hashed version of the full key
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }), // Last time key was used
    expiresAt: timestamp("expiresAt", { mode: "date" }), // Optional expiration
    status: text("status").$type<ApiKeyStatus>().notNull().default("active"),
    // Permissions/scopes (JSON array)
    scopes: text("scopes").$type<string[]>(), // e.g., ["alerts:read", "alerts:write", "targets:read"]
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("api_keys_organizationId_idx").on(
      table.organizationId,
    ),
    userIdIdx: index("api_keys_userId_idx").on(table.userId),
    statusIdx: index("api_keys_status_idx").on(table.status),
  }),
);
