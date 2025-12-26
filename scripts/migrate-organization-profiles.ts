/**
 * Migration script for existing organizations
 *
 * This script initializes organization profiles for existing organizations
 * that don't have a profile yet. It can be run after deploying the enhanced
 * onboarding system to ensure all organizations have a profile structure.
 *
 * Usage:
 *   bun run scripts/migrate-organization-profiles.ts
 *
 * Options:
 *   --dry-run: Preview changes without applying them
 *   --initialize-empty: Initialize empty profiles (default: true)
 *   --skip-existing: Skip organizations that already have profiles (default: true)
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { organizations } from "../lib/db/schema";
import type { OrganizationProfile } from "../lib/types/organization-profile";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

interface MigrationOptions {
  dryRun: boolean;
  initializeEmpty: boolean;
  skipExisting: boolean;
}

async function migrateOrganizationProfiles(options: MigrationOptions) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  try {
    console.log("🔄 Starting organization profile migration...\n");

    // Get all organizations
    const allOrgs = await db.select().from(organizations);

    if (allOrgs.length === 0) {
      console.log("ℹ️  No organizations found in database.");
      return;
    }

    console.log(`📊 Found ${allOrgs.length} organization(s) in database.\n`);

    // Filter organizations based on options
    let orgsToMigrate = allOrgs;

    if (options.skipExisting) {
      orgsToMigrate = allOrgs.filter((org) => !org.profile);
      console.log(
        `📋 ${orgsToMigrate.length} organization(s) need profile migration (${allOrgs.length - orgsToMigrate.length} already have profiles).\n`,
      );
    } else {
      console.log(
        `📋 ${orgsToMigrate.length} organization(s) will be processed.\n`,
      );
    }

    if (orgsToMigrate.length === 0) {
      console.log(
        "✅ All organizations already have profiles. Nothing to migrate.",
      );
      return;
    }

    // Process each organization
    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    for (const org of orgsToMigrate) {
      results.processed++;

      try {
        if (options.dryRun) {
          console.log(
            `[DRY RUN] Would migrate organization: ${org.name} (${org.id})`,
          );
          results.updated++;
          continue;
        }

        if (options.initializeEmpty) {
          // Initialize an empty profile structure
          // This allows organizations to complete onboarding later
          const emptyProfile: Partial<OrganizationProfile> = {
            legalEntityName: org.name, // Use organization name as fallback
            countryOfIncorporation: "", // Will be filled during onboarding
            fintechCategory: "Other", // Default category
            businessModel: "B2C", // Default model
            primaryJurisdiction: "", // Will be filled during onboarding
            services: [],
            countryOperations: [],
            complianceMapping: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await db
            .update(organizations)
            .set({
              profile: emptyProfile as unknown as OrganizationProfile,
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, org.id));

          console.log(`✅ Migrated organization: ${org.name} (${org.id})`);
          results.updated++;
        } else {
          console.log(
            `⏭️  Skipped organization: ${org.name} (${org.id}) - empty profile initialization disabled`,
          );
          results.skipped++;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `❌ Error migrating organization ${org.name} (${org.id}): ${errorMessage}`,
        );
        results.errors++;
      }
    }

    // Summary
    console.log("\n📊 Migration Summary:");
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Updated: ${results.updated}`);
    console.log(`   Skipped: ${results.skipped}`);
    console.log(`   Errors: ${results.errors}`);

    if (options.dryRun) {
      console.log(
        "\n⚠️  This was a dry run. No changes were made to the database.",
      );
      console.log("   Run without --dry-run to apply changes.");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Parse command line arguments
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    initializeEmpty: !args.includes("--no-initialize"),
    skipExisting: !args.includes("--include-existing"),
  };
}

// Main execution
const options = parseArgs();

if (options.dryRun) {
  console.log("🔍 DRY RUN MODE - No changes will be made\n");
}

migrateOrganizationProfiles(options).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
