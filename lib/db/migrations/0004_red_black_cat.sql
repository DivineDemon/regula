CREATE TABLE "gdpr_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text NOT NULL,
	"requestType" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"exportUrl" text,
	"metadata" text,
	"requestedAt" timestamp DEFAULT now() NOT NULL,
	"processedAt" timestamp,
	"completedAt" timestamp,
	"expiresAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"consentType" text NOT NULL,
	"granted" timestamp,
	"withdrawn" timestamp,
	"consentVersion" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gdpr_requests" ADD CONSTRAINT "gdpr_requests_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdpr_requests" ADD CONSTRAINT "gdpr_requests_organizationId_organizations_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;