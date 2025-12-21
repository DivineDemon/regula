import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { alerts } from "./alerts";
import { users } from "./users";

export const alertAssignments = pgTable(
  "alert_assignments",
  {
    alertId: text("alertId")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assignedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.alertId, table.userId] }),
  }),
);
