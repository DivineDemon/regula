import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { alerts } from "./alerts";
import { users } from "./users";

export const alertComments = pgTable("alert_comments", {
  id: text("id").primaryKey(),
  alertId: text("alertId")
    .notNull()
    .references(() => alerts.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
