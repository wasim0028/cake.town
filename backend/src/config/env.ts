import { z } from "zod";

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(5000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().min(1).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),

  /** Comma-separated list of allowed browser origins, e.g. http://localhost:3000,https://caketown.in */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  /** Public URL of the web app, used in emails (reset links, order links). */
  WEB_URL: z.string().default("http://localhost:3000"),
  /** Set when the web app and API live on different subdomains, e.g. ".caketown.in" */
  COOKIE_DOMAIN: optional,
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
  CLOUDINARY_FOLDER: z.string().default("caketown"),

  // Razorpay
  RAZORPAY_KEY_ID: optional,
  RAZORPAY_KEY_SECRET: optional,
  RAZORPAY_WEBHOOK_SECRET: optional,
  /** Minutes an unpaid online order holds its stock before it is cancelled. */
  PAYMENT_HOLD_MINUTES: z.coerce.number().int().min(5).default(30),

  // Redis (Upstash): rediss://default:<password>@<host>:6379
  REDIS_URL: optional,

  // Email (Resend)
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("caketown <orders@caketown.in>"),
  SHOP_EMAIL: optional,

  // SMS (MSG91) — template ids must be DLT-approved in India
  MSG91_AUTH_KEY: optional,
  MSG91_TEMPLATE_ORDER_UPDATE: optional,
  MSG91_TEMPLATE_OTP: optional,

  // Push (Expo)
  EXPO_ACCESS_TOKEN: optional,

  // Seed
  ADMIN_EMAIL: z.string().default("admin@caketown.in"),
  ADMIN_PASSWORD: optional,
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    console.error(`\nInvalid environment configuration:\n${lines.join("\n")}\n\nCopy backend/.env.example to backend/.env and fill it in.\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = load();

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const features = {
  cloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  razorpayWebhook: Boolean(env.RAZORPAY_WEBHOOK_SECRET),
  redis: Boolean(env.REDIS_URL),
  email: Boolean(env.RESEND_API_KEY),
  sms: Boolean(env.MSG91_AUTH_KEY),
  push: true, // Expo push works without an access token (token only adds security)
};

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
