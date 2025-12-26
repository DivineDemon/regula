ALTER TABLE "organizations" ADD COLUMN "profile" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_profile_primaryJurisdiction_idx" ON "organizations" USING btree (("profile"->>'primaryJurisdiction'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_profile_services_idx" ON "organizations" USING gin (("profile"->'services'));