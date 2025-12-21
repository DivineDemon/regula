import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { UserRole } from "@/lib/auth/roles";
import { organizations } from "./organizations";

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role")
    .$type<UserRole>()
    .notNull()
    .default(UserRole.VIEWER as UserRole),
  token: text("token").notNull().unique(),
  invitedBy: text("invitedBy").notNull(), // userId of the person who sent the invitation
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  acceptedAt: timestamp("acceptedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
