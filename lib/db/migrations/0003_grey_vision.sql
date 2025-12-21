CREATE TABLE "content_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"targetId" text NOT NULL,
	"fromNodeId" text NOT NULL,
	"toNodeId" text NOT NULL,
	"relationship" text NOT NULL,
	"discoveredAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_graphs" (
	"id" text PRIMARY KEY NOT NULL,
	"targetId" text NOT NULL,
	"rootUrl" text NOT NULL,
	"graphData" text NOT NULL,
	"detectedPattern" text,
	"patternConfidence" text,
	"sitemapSource" text,
	"lastAnalyzed" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"targetId" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"fingerprint" text NOT NULL,
	"discoveredAt" timestamp DEFAULT now() NOT NULL,
	"lastSeen" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"organizationId" text NOT NULL,
	"emailEnabled" boolean DEFAULT true NOT NULL,
	"emailRealtime" boolean DEFAULT true NOT NULL,
	"emailDigest" boolean DEFAULT true NOT NULL,
	"emailDigestFrequency" text DEFAULT 'daily' NOT NULL,
	"alertThreshold" text DEFAULT 'all' NOT NULL,
	"webhookEnabled" boolean DEFAULT false NOT NULL,
	"webhookUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_edges" ADD CONSTRAINT "content_edges_targetId_targets_id_fk" FOREIGN KEY ("targetId") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_edges" ADD CONSTRAINT "content_edges_fromNodeId_content_nodes_id_fk" FOREIGN KEY ("fromNodeId") REFERENCES "public"."content_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_edges" ADD CONSTRAINT "content_edges_toNodeId_content_nodes_id_fk" FOREIGN KEY ("toNodeId") REFERENCES "public"."content_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_graphs" ADD CONSTRAINT "content_graphs_targetId_targets_id_fk" FOREIGN KEY ("targetId") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_nodes" ADD CONSTRAINT "content_nodes_targetId_targets_id_fk" FOREIGN KEY ("targetId") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;