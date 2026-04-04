import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { alerts } from "./alerts";
import { organizations } from "./organizations";
import { users } from "./users";

export type AlertFeedbackType = "false_positive" | "not_relevant";

export const alertFeedback = pgTable(
  "alert_feedback",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    alertId: text("alertId")
      .notNull()
      .references(() => alerts.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AlertFeedbackType>().notNull(),
    reason: text("reason"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("alert_feedback_organizationId_idx").on(
      table.organizationId,
    ),
    alertIdIdx: index("alert_feedback_alertId_idx").on(table.alertId),
    typeIdx: index("alert_feedback_type_idx").on(table.type),
  }),
);
