import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { alerts } from "./alerts";

/**
 * Alert relationships - links between related alerts
 * Types: related, duplicate, supersedes, superseded_by, blocks, blocked_by
 */
export type AlertRelationshipType =
  | "related"
  | "duplicate"
  | "supersedes"
  | "superseded_by"
  | "blocks"
  | "blocked_by";

export const alertRelationships = pgTable(
  "alert_relationships",
  {
    sourceAlertId: text("sourceAlertId")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    targetAlertId: text("targetAlertId")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    relationshipType: text("relationshipType")
      .$type<AlertRelationshipType>()
      .notNull(),
    notes: text("notes"), // Optional notes about the relationship
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    createdBy: text("createdBy"), // User ID who created the relationship
  },
  (table) => ({
    pk: {
      columns: [
        table.sourceAlertId,
        table.targetAlertId,
        table.relationshipType,
      ],
    },
    idx1: index("alert_relationships_sourceAlertId_idx").on(
      table.sourceAlertId,
    ),
    idx2: index("alert_relationships_targetAlertId_idx").on(
      table.targetAlertId,
    ),
    idx3: index("alert_relationships_type_idx").on(table.relationshipType),
  }),
);
