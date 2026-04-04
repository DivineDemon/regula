import { cache } from "./cache-store";

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  alert: (alertId: string) => `alert:${alertId}`,
  alertTemplates: (organizationId: string) =>
    `alert-templates:${organizationId}`,
  alertTags: (organizationId: string) => `alert-tags:${organizationId}`,
  alertStatistics: (organizationId: string) =>
    `alert-statistics:${organizationId}`,
  targetStatistics: (organizationId: string) =>
    `target-statistics:${organizationId}`,
  complianceHealth: (organizationId: string) =>
    `compliance-health:${organizationId}`,
  apiKey: (keyPrefix: string) => `api-key:${keyPrefix}`,
  webhookConfigs: (organizationId: string) =>
    `webhook-configs:${organizationId}`,
} as const;

/**
 * Cache TTLs (in seconds)
 */
export const CACHE_TTL = {
  alert: 300, // 5 minutes
  alertTemplates: 3600, // 1 hour
  alertTags: 3600, // 1 hour
  alertStatistics: 300, // 5 minutes
  targetStatistics: 600, // 10 minutes
  complianceHealth: 300, // 5 minutes
  apiKey: 86400, // 24 hours
  webhookConfigs: 3600, // 1 hour
} as const;

/**
 * Invalidate cache for a specific key
 * Only exact keys are deleted (no pattern scan). For bulk invalidation,
 * call invalidateCacheKeys with an array of specific keys.
 */
export async function invalidateCache(key: string): Promise<boolean> {
  try {
    return await cache.delete(key);
  } catch (error) {
    console.error(`Cache invalidation error for key ${key}:`, error);
    return false;
  }
}

/**
 * Invalidate multiple cache keys
 */
export async function invalidateCacheKeys(keys: string[]): Promise<boolean> {
  try {
    const results = await Promise.all(keys.map((key) => cache.delete(key)));
    return results.every((result) => result === true);
  } catch (error) {
    console.error(`Cache invalidation error for keys:`, error);
    return false;
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute function
  const result = await fn();

  // Store in cache
  await cache.set(key, result, ttl);

  return result;
}
