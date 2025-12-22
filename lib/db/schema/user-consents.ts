import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export type ConsentType =
  | "marketing_emails"
  | "analytics"
  | "cookies"
  | "data_processing";

export const userConsents = pgTable("user_consents", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consentType").$type<ConsentType>().notNull(),
  granted: timestamp("granted", { mode: "date" }), // When consent was granted
  withdrawn: timestamp("withdrawn", { mode: "date" }), // When consent was withdrawn
  // Store consent version/terms version for audit
  consentVersion: text("consentVersion"), // e.g., "v1.0" or date
  // Additional metadata
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
