import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { UserRole } from "@/lib/auth/roles";
import { organizations } from "./organizations";
import { users } from "./users";

export const organizationMembers = pgTable(
  "organization_members",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role")
      .$type<UserRole>()
      .notNull()
      .default(UserRole.VIEWER as UserRole), // Default to viewer role
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.organizationId] }),
  }),
);
