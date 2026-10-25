import { getRedis } from "../config/redis";
import { logger } from "../config/logger";

/**
 * Small key/value cache with TTL. Uses Redis when configured, otherwise an in-process Map.
 * Every Redis failure degrades to a cache miss: the cache must never break a request.
 */
const PREFIX = "ct:";
const memory = new Map<string, { value: string; expiresAt: number }>();

function memGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const k = PREFIX + key;
    const redis = getRedis();
    try {
      const raw = redis ? await redis.get(k) : memGet(k);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      logger.warn({ err, key }, "cache get failed");
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const k = PREFIX + key;
    const raw = JSON.stringify(value);
    const redis = getRedis();
    try {
      if (redis) await redis.set(k, raw, "EX", ttlSeconds);
      else memory.set(k, { value: raw, expiresAt: Date.now() + ttlSeconds * 1000 });
    } catch (err) {
      logger.warn({ err, key }, "cache set failed");
    }
  },

  async del(key: string): Promise<void> {
    const k = PREFIX + key;
    const redis = getRedis();
    try {
      if (redis) await redis.del(k);
      else memory.delete(k);
    } catch (err) {
      logger.warn({ err, key }, "cache del failed");
    }
  },

  /** Delete every key starting with `prefix` (e.g. "products:"). */
  async delPrefix(prefix: string): Promise<void> {
    const pattern = PREFIX + prefix;
    const redis = getRedis();
    try {
      if (!redis) {
        for (const k of memory.keys()) if (k.startsWith(pattern)) memory.delete(k);
        return;
      }
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `${pattern}*`, "COUNT", 200);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== "0");
    } catch (err) {
      logger.warn({ err, prefix }, "cache delPrefix failed");
    }
  },

  /** Return the cached value, or compute it, cache it and return it. */
  async wrap<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const hit = await cache.get<T>(key);
    if (hit !== null) return hit;
    const value = await compute();
    await cache.set(key, value, ttlSeconds);
    return value;
  },

  /** Atomically increment a counter that expires after `ttlSeconds` (used for OTP attempts). */
  async incr(key: string, ttlSeconds: number): Promise<number> {
    const k = PREFIX + key;
    const redis = getRedis();
    try {
      if (redis) {
        const n = await redis.incr(k);
        if (n === 1) await redis.expire(k, ttlSeconds);
        return n;
      }
      const current = Number(memGet(k) ?? 0) + 1;
      const existing = memory.get(k);
      memory.set(k, { value: String(current), expiresAt: existing?.expiresAt ?? Date.now() + ttlSeconds * 1000 });
      return current;
    } catch (err) {
      logger.warn({ err, key }, "cache incr failed");
      return 0;
    }
  },

  /** Test helper. */
  _clearMemory() {
    memory.clear();
  },
};

export const CACHE_KEYS = {
  categories: "catalog:categories",
  productList: (hash: string) => `products:list:${hash}`,
  productDetail: (slug: string) => `products:detail:${slug}`,
  classes: "classes:list",
} as const;

/** Called whenever products or categories change. */
export async function invalidateCatalog() {
  await Promise.all([cache.delPrefix("products:"), cache.del(CACHE_KEYS.categories)]);
}
