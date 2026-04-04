import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Application key-value cache (replaces external Redis for `withCache` / invalidation).
 */
export const kvCache = pgTable("kv_cache", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().$type<unknown>(),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
});

/**
 * Fixed-window rate limit counters (Postgres-backed).
 */
export const rateLimitEntries = pgTable("rate_limit_entries", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
});
