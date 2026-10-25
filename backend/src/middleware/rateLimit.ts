import { ipKeyGenerator, rateLimit, type Options } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { getRedis } from "../config/redis";
import { isTest } from "../config/env";

/**
 * Rate limiters. Counts live in Redis when REDIS_URL is set (so limits hold across several API
 * instances), otherwise in memory. If Redis is down requests are let through rather than blocked.
 */
function makeLimiter(name: string, opts: Partial<Options>) {
  const redis = getRedis();
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: true,
    skip: () => isTest,
    message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again in a little while." } },
    ...(redis
      ? {
          store: new RedisStore({
            prefix: `ct:rl:${name}:`,
            sendCommand: (command: string, ...args: string[]) => redis.call(command, ...args) as Promise<RedisReply>,
          }),
        }
      : {}),
    ...opts,
  });
}

/** Whole API: 300 requests / 15 min per IP. */
export const apiLimiter = makeLimiter("api", { windowMs: 15 * 60_000, limit: 300 });

/** Login, signup, password reset: 10 / 15 min per IP. */
export const authLimiter = makeLimiter("auth", { windowMs: 15 * 60_000, limit: 10 });

/** OTP requests: 5 / hour per IP. */
export const otpLimiter = makeLimiter("otp", { windowMs: 60 * 60_000, limit: 5 });

/** Checkout & booking: 20 / hour per user (falls back to IP). */
export const checkoutLimiter = makeLimiter("checkout", {
  windowMs: 60 * 60_000,
  limit: 20,
  keyGenerator: (req) => (req.user?.id ? `u:${req.user.id}` : ipKeyGenerator(req.ip ?? "0.0.0.0")),
});

/** Contact form and newsletter: 5 / hour per IP. */
export const formLimiter = makeLimiter("form", { windowMs: 60 * 60_000, limit: 5 });
