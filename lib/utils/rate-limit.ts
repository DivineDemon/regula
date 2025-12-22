import { redis } from "@/lib/services/redis";

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
 * Rate limit middleware using Upstash Redis
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, window } = options;
  const redisKey = `rate_limit:${key}`;

  try {
    // Get current count
    const current = await redis.get<number>(redisKey);

    if (current === null) {
      // First request in window
      await redis.setex(redisKey, window, 1);
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Date.now() + window * 1000,
      };
    }

    if (current >= limit) {
      // Rate limit exceeded
      const ttl = await redis.ttl(redisKey);
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Date.now() + (ttl > 0 ? ttl * 1000 : window * 1000),
      };
    }

    // Increment counter
    const newCount = await redis.incr(redisKey);
    const ttl = await redis.ttl(redisKey);

    // If key doesn't have TTL (shouldn't happen, but safety check), set it
    if (ttl === -1) {
      await redis.expire(redisKey, window);
    }

    return {
      success: true,
      limit,
      remaining: limit - newCount,
      reset: Date.now() + (ttl > 0 ? ttl * 1000 : window * 1000),
    };
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
