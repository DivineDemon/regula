import { cache } from "./redis";

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
 * Invalidate cache for a key pattern
 */
export async function invalidateCache(_pattern: string) {
  // Note: Upstash Redis doesn't support pattern deletion directly
  // In production, you'd want to track keys or use a different approach
  // For now, we'll just return true
  return true;
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
