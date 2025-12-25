CREATE TABLE "alert_relationships" (
	"sourceAlertId" text NOT NULL,
	"targetAlertId" text NOT NULL,
	"relationshipType" text NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" text,
	CONSTRAINT "alert_relationships_sourceAlertId_targetAlertId_relationshipType_pk" PRIMARY KEY("sourceAlertId","targetAlertId","relationshipType")
);
--> statement-breakpoint
CREATE TABLE "alert_tag_assignments" (
	"alertId" text NOT NULL,
	"tagId" text NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_tag_assignments_alertId_tagId_pk" PRIMARY KEY("alertId","tagId")
);
--> statement-breakpoint
CREATE TABLE "alert_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "alert_tags_organizationId_name_unique" UNIQUE("organizationId","name")
);
--> statement-breakpoint
CREATE TABLE "alert_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"jurisdiction" text,
	"config" jsonb,
	"isDefault" text DEFAULT 'false',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"keyHash" text NOT NULL,
	"lastUsedAt" timestamp,
	"expiresAt" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"scopes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_alert_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"conditions" jsonb,
	"actions" jsonb,
	"priority" text DEFAULT 'normal',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"createdBy" text
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"status" text DEFAULT 'active' NOT NULL,
	"eventFilters" jsonb,
	"maxRetries" text DEFAULT '3',
	"timeout" text DEFAULT '10000',
	"lastTriggeredAt" timestamp,
	"successCount" text DEFAULT '0',
	"failureCount" text DEFAULT '0',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "snoozedUntil" timestamp;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "templateId" text;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "webhookSecret" text;--> statement-breakpoint
ALTER TABLE "alert_relationships" ADD CONSTRAINT "alert_relationships_sourceAlertId_alerts_id_fk" FOREIGN KEY ("sourceAlertId") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_relationships" ADD CONSTRAINT "alert_relationships_targetAlertId_alerts_id_fk" FOREIGN KEY ("targetAlertId") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_tag_assignments" ADD CONSTRAINT "alert_tag_assignments_alertId_alerts_id_fk" FOREIGN KEY ("alertId") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_tag_assignments" ADD CONSTRAINT "alert_tag_assignments_tagId_alert_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."alert_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_tags" ADD CONSTRAINT "alert_tags_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_templates" ADD CONSTRAINT "alert_templates_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_alert_rules" ADD CONSTRAINT "custom_alert_rules_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;