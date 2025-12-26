# Migration Scripts

This directory contains database migration and data migration scripts.

## Database Migrations

### `migrate.ts`
Generates and applies database schema migrations using Drizzle Kit.

**Usage:**
```bash
bun run db:migrate
```

This script:
1. Generates migration files from schema changes
2. Applies migrations to the database

### `run-migrations.ts`
Applies existing migration files to the database.

**Usage:**
```bash
bun run db:apply
```

## Data Migrations

### `migrate-organization-profiles.ts`
Migrates existing organizations to initialize organization profiles.

**Purpose:**
After deploying the enhanced onboarding system, existing organizations may not have organization profiles. This script initializes empty profile structures for organizations that don't have profiles yet.

**Usage:**

**Dry run (preview changes):**
```bash
bun run db:migrate-profiles --dry-run
```

**Apply migration:**
```bash
bun run db:migrate-profiles
```

**Options:**
- `--dry-run`: Preview changes without applying them
- `--no-initialize`: Don't initialize empty profiles (skip organizations without profiles)
- `--include-existing`: Process organizations that already have profiles (default: skip them)

**What it does:**
1. Finds all organizations in the database
2. Identifies organizations without profiles (if `--skip-existing` is enabled)
3. Initializes empty profile structures with:
   - Organization name as `legalEntityName`
   - Default values for required fields
   - Empty arrays for services, country operations, etc.
4. Updates the database with the initialized profiles

**Example Output:**
```
🔄 Starting organization profile migration...

📊 Found 10 organization(s) in database.

📋 5 organization(s) need profile migration (5 already have profiles).

✅ Migrated organization: Example Fintech Ltd (org_123)
✅ Migrated organization: Another Company (org_456)
...

📊 Migration Summary:
   Processed: 5
   Updated: 5
   Skipped: 0
   Errors: 0

✅ Migration completed successfully!
```

**Notes:**
- This script is safe to run multiple times
- Organizations with existing profiles are skipped by default
- Empty profiles allow organizations to complete onboarding later
- The script uses transactions to ensure data consistency

**When to run:**
- After deploying the enhanced onboarding system
- When you need to initialize profiles for existing organizations
- As part of your deployment process

**Backup:**
Always backup your database before running data migrations:
```bash
# PostgreSQL backup example
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

