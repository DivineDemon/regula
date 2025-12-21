import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }), // Allow null for system actions
  action: text("action").notNull(), // e.g., "user.login", "target.created", "alert.updated"
  metadata: text("metadata"), // JSON string with additional action details
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
