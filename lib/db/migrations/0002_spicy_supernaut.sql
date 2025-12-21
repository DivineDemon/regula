ALTER TABLE "targets" ADD COLUMN "lastCrawlStatus" text;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "lastCrawlAt" timestamp;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "lastCrawlError" text;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "previousVersionId" text;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "hasChanges" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "diffMetadata" text;