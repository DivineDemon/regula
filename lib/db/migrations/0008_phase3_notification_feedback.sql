ALTER TABLE "notification_preferences" ADD COLUMN IF NOT EXISTS "categoryFilters" text[];--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"alertId" text NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"reason" text,
	"createdAt" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_feedback" ADD CONSTRAINT "alert_feedback_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_feedback" ADD CONSTRAINT "alert_feedback_alertId_alerts_id_fk" FOREIGN KEY ("alertId") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alert_feedback" ADD CONSTRAINT "alert_feedback_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_feedback_organizationId_idx" ON "alert_feedback" USING btree ("organizationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_feedback_alertId_idx" ON "alert_feedback" USING btree ("alertId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_feedback_type_idx" ON "alert_feedback" USING btree ("type");
