import { Redis } from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Redis client (Upstash works with its rediss:// URL). Returns null when REDIS_URL is not
 * set, and callers fall back to in-memory storage, so the app runs without Redis.
 */
let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
      lazyConnect: false,
    });
    client.on("error", (err) => logger.warn({ err: err.message }, "Redis error"));
    client.on("ready", () => logger.info("Redis connected"));
  }
  return client;
}

export async function closeRedis() {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
