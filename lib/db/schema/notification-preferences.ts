import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  // Email preferences
  emailEnabled: boolean("emailEnabled").notNull().default(true),
  emailRealtime: boolean("emailRealtime").notNull().default(true),
  emailDigest: boolean("emailDigest").notNull().default(true),
  emailDigestFrequency: text("emailDigestFrequency").notNull().default("daily"), // daily, weekly
  // Alert threshold - only send notifications for alerts above this impact score
  alertThreshold: text("alertThreshold").notNull().default("all"), // all, low, medium, high
  // Webhook preferences
  webhookEnabled: boolean("webhookEnabled").notNull().default(false),
  webhookUrl: text("webhookUrl"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
