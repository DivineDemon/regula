import { Redis } from "@upstash/redis";

if (
  !process.env.UPSTASH_REDIS_REST_URL ||
  !process.env.UPSTASH_REDIS_REST_TOKEN
) {
  throw new Error(
    "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in environment variables",
  );
}

/**
 * Upstash Redis client for caching and queue management
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get<T>(key);
      return value;
    } catch (error: unknown) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL (time to live in seconds)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
      return true;
    } catch (error: unknown) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error: unknown) {
      console.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error: unknown) {
      console.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error: unknown) {
      console.error(`Redis expire error for key ${key}:`, error);
      return false;
    }
  },
};

/**
 * Queue helper functions
 */
export const queue = {
  /**
   * Push an item to the end of a list (queue)
   */
  async push(queueName: string, value: string): Promise<boolean> {
    try {
      await redis.rpush(queueName, value);
      return true;
    } catch (error: unknown) {
      console.error(`Redis queue push error for ${queueName}:`, error);
      return false;
    }
  },

  /**
   * Pop an item from the beginning of a list (queue)
   */
  async pop(queueName: string): Promise<string | null> {
    try {
      const value = await redis.lpop<string>(queueName);
      return value;
    } catch (error: unknown) {
      console.error(`Redis queue pop error for ${queueName}:`, error);
      return null;
    }
  },

  /**
   * Get the length of a queue
   */
  async length(queueName: string): Promise<number> {
    try {
      return await redis.llen(queueName);
    } catch (error: unknown) {
      console.error(`Redis queue length error for ${queueName}:`, error);
      return 0;
    }
  },
};
