import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEntries } from "@/lib/db/schema/kv-store";

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed
   */
  limit: number;
  /**
   * Time window in seconds
   */
  window: number;
  /**
   * Optional identifier for the rate limit (defaults to IP address)
   */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Fixed-window rate limiting using Postgres (serialized per key via advisory lock).
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, window } = options;
  const entryKey = `rate_limit:${key}`;

  try {
    return await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${entryKey}::text))`,
      );

      const rows = await tx
        .select()
        .from(rateLimitEntries)
        .where(eq(rateLimitEntries.key, entryKey))
        .limit(1);

      const row = rows[0];
      const now = new Date();

      if (!row) {
        const expiresAt = new Date(now.getTime() + window * 1000);
        await tx.insert(rateLimitEntries).values({
          key: entryKey,
          count: 1,
          expiresAt,
        });
        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: expiresAt.getTime(),
        };
      }

      if (row.expiresAt <= now) {
        const expiresAt = new Date(now.getTime() + window * 1000);
        await tx
          .update(rateLimitEntries)
          .set({ count: 1, expiresAt })
          .where(eq(rateLimitEntries.key, entryKey));
        return {
          success: true,
          limit,
          remaining: limit - 1,
          reset: expiresAt.getTime(),
        };
      }

      if (row.count >= limit) {
        const ttlSec = Math.max(
          0,
          Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000),
        );
        return {
          success: false,
          limit,
          remaining: 0,
          reset: now.getTime() + ttlSec * 1000,
        };
      }

      const newCount = row.count + 1;
      await tx
        .update(rateLimitEntries)
        .set({ count: newCount })
        .where(eq(rateLimitEntries.key, entryKey));

      return {
        success: true,
        limit,
        remaining: limit - newCount,
        reset: row.expiresAt.getTime(),
      };
    });
  } catch (error) {
    console.error("Rate limit error:", error);
    // On error, allow the request (fail open)
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Date.now() + window * 1000,
    };
  }
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default identifier
  return "unknown";
}

/**
 * Create rate limit key from identifier and endpoint
 */
export function createRateLimitKey(
  identifier: string,
  endpoint: string,
): string {
  return `${identifier}:${endpoint}`;
}
