import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { targets } from "./targets";

export const versions = pgTable("versions", {
  id: text("id").primaryKey(),
  targetId: text("targetId")
    .notNull()
    .references(() => targets.id, { onDelete: "cascade" }),
  contentHash: text("contentHash").notNull(), // SHA-256 hash for change detection
  content: text("content"), // Full text content (can be large, consider storing in blob storage)
  metadata: text("metadata"), // JSON string with additional metadata (content type, size, etc.)
  crawledAt: timestamp("crawledAt", { mode: "date" }).notNull().defaultNow(),
  // Diff metadata fields
  previousVersionId: text("previousVersionId"), // Reference to previous version for comparison
  hasChanges: boolean("hasChanges").default(false), // Whether changes were detected compared to previous version
  diffMetadata: text("diffMetadata"), // JSON string with diff details (change types, affected sections, etc.)
});
