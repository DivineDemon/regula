import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { kvCache } from "@/lib/db/schema/kv-store";

/**
 * Postgres-backed cache used by `cache-helpers` (same role as the former Redis layer).
 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const rows = await db
        .select()
        .from(kvCache)
        .where(
          and(
            eq(kvCache.key, key),
            or(isNull(kvCache.expiresAt), gt(kvCache.expiresAt, new Date())),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) {
        return null;
      }
      return row.value as T;
    } catch (error: unknown) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
      await db
        .insert(kvCache)
        .values({
          key,
          value: value as unknown,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: kvCache.key,
          set: {
            value: value as unknown,
            expiresAt,
          },
        });
      return true;
    } catch (error: unknown) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  },

  async delete(key: string): Promise<boolean> {
    try {
      await db.delete(kvCache).where(eq(kvCache.key, key));
      return true;
    } catch (error: unknown) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  },
};
