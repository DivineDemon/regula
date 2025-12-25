import { execSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

async function getMigrationFiles(): Promise<string[]> {
  const migrationsDir = "./lib/db/migrations";
  const files = await readdir(migrationsDir);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(migrationsDir, f));
}

async function main() {
  console.log("🚀 Starting migration process...\n");

  try {
    // Step 1: Get current migration files count
    const beforeMigrations = await getMigrationFiles();
    const beforeCount = beforeMigrations.length;

    // Step 2: Generate migrations from schema
    console.log("📝 Step 1: Generating migrations from schema...");
    try {
      execSync("bun run db:generate", { stdio: "inherit" });
    } catch (error) {
      // Drizzle might exit with code 1 if no changes, which is fine
      const exitCode = (error as { status?: number })?.status;
      if (exitCode === 1) {
        console.log("ℹ️  No schema changes detected.");
      } else {
        throw error;
      }
    }

    // Step 3: Check if new migrations were generated
    const afterMigrations = await getMigrationFiles();
    const afterCount = afterMigrations.length;

    if (afterCount === beforeCount) {
      console.log(
        "ℹ️  No new migrations generated. Database schema is up to date.",
      );
      return;
    }

    console.log(`✅ Generated ${afterCount - beforeCount} new migration(s)\n`);

    // Step 4: Apply migrations
    console.log("📦 Step 2: Applying migrations to database...");
    execSync("bun run scripts/run-migrations.ts", { stdio: "inherit" });
    console.log("\n✅ Migration process completed successfully!");
  } catch (error) {
    console.error("\n❌ Migration process failed:", error);
    process.exit(1);
  }
}

main();
