import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { alerts } from "./alerts";
import { organizations } from "./organizations";

/**
 * Alert tags for categorization and filtering
 */
export const alertTags = pgTable(
  "alert_tags",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Tag name
    color: text("color"), // Optional color for UI display
    description: text("description"), // Optional description
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // Ensure unique tag names per organization
    unique().on(table.organizationId, table.name),
    index("alert_tags_organizationId_idx").on(table.organizationId),
  ],
);

/**
 * Many-to-many relationship between alerts and tags
 */
export const alertTagAssignments = pgTable(
  "alert_tag_assignments",
  {
    alertId: text("alertId")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    tagId: text("tagId")
      .notNull()
      .references(() => alertTags.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assignedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: {
      columns: [table.alertId, table.tagId],
    },
    idx1: index("alert_tag_assignments_alertId_idx").on(table.alertId),
    idx2: index("alert_tag_assignments_tagId_idx").on(table.tagId),
  }),
);
