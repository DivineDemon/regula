import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export type GDPRRequestType = "deletion" | "export";
export type GDPRRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export const gdprRequests = pgTable("gdpr_requests", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  requestType: text("requestType").$type<GDPRRequestType>().notNull(),
  status: text("status")
    .$type<GDPRRequestStatus>()
    .notNull()
    .default("pending"),
  // For export requests, store the file path/URL
  exportUrl: text("exportUrl"),
  // Metadata about what was processed
  metadata: text("metadata"), // JSON string
  // Timestamps
  requestedAt: timestamp("requestedAt", { mode: "date" })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
  expiresAt: timestamp("expiresAt", { mode: "date" }), // For export links
});
