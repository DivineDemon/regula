import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { targets } from "./targets";

export type UpdatePattern =
  | "single_page_static"
  | "single_page_dynamic"
  | "new_files_added"
  | "versioned_urls"
  | "changelog_based"
  | "nested_navigation"
  | "api_based"
  | "mixed";

export const contentGraphs = pgTable("content_graphs", {
  id: text("id").primaryKey(),
  targetId: text("targetId")
    .notNull()
    .references(() => targets.id, { onDelete: "cascade" }),
  rootUrl: text("rootUrl").notNull(),
  graphData: text("graphData").notNull(), // JSON string with nodes and edges
  detectedPattern: text("detectedPattern").$type<UpdatePattern>(),
  patternConfidence: text("patternConfidence"), // 0-1 as string
  sitemapSource: text("sitemapSource"), // URL of sitemap used
  lastAnalyzed: timestamp("lastAnalyzed", { mode: "date" })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const contentNodes = pgTable("content_nodes", {
  id: text("id").primaryKey(),
  targetId: text("targetId")
    .notNull()
    .references(() => targets.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  type: text("type").notNull(), // 'page', 'pdf', 'document'
  fingerprint: text("fingerprint").notNull(),
  discoveredAt: timestamp("discoveredAt", { mode: "date" })
    .notNull()
    .defaultNow(),
  lastSeen: timestamp("lastSeen", { mode: "date" }).notNull().defaultNow(),
  status: text("status").notNull().default("active"), // 'active', 'removed', 'modified'
  metadata: text("metadata"), // JSON string
});

export const contentEdges = pgTable("content_edges", {
  id: text("id").primaryKey(),
  targetId: text("targetId")
    .notNull()
    .references(() => targets.id, { onDelete: "cascade" }),
  fromNodeId: text("fromNodeId")
    .notNull()
    .references(() => contentNodes.id, { onDelete: "cascade" }),
  toNodeId: text("toNodeId")
    .notNull()
    .references(() => contentNodes.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(), // 'links_to', 'contains', 'version_of'
  discoveredAt: timestamp("discoveredAt", { mode: "date" })
    .notNull()
    .defaultNow(),
});
