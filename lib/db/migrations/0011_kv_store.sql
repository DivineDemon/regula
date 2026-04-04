CREATE TABLE IF NOT EXISTS "kv_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"expiresAt" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kv_cache_expiresAt_idx" ON "kv_cache" ("expiresAt");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limit_entries" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expiresAt" timestamp NOT NULL
);
