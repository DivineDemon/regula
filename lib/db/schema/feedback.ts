import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

export type FeedbackType = "bug" | "feature" | "general";

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("userId").references(() => users.id, { onDelete: "set null" }),
    type: text("type").$type<FeedbackType>().notNull(),
    message: text("message").notNull(),
    /** Page/path when submitted (e.g. /alerts, /settings/billing) */
    contextPage: text("contextPage"),
    /** Additional context (e.g. user agent, org name) stored as JSON string */
    contextMeta: text("contextMeta"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("feedback_organizationId_idx").on(
      table.organizationId,
    ),
    createdAtIdx: index("feedback_createdAt_idx").on(table.createdAt),
  }),
);
