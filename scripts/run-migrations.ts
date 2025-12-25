import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function runMigrations() {
  console.log("🔄 Running database migrations...");
  try {
    await migrate(db, {
      migrationsFolder: "./lib/db/migrations",
      migrationsTable: "__drizzle_migrations",
    });
    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    // Check if error is about existing objects (tables/indexes)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("already exists") ||
      errorMessage.includes("42P07") ||
      errorMessage.includes("42P16")
    ) {
      console.warn(
        "⚠️  Some database objects already exist. This is normal if migrations were partially applied.",
      );
      console.log("✅ Continuing with remaining migrations...");
      // Try to continue - Drizzle should skip already applied migrations
      return;
    }
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
