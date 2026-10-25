import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { corsOrigins, env } from "./config/env";
import { logger } from "./config/logger";
import { razorpayWebhook } from "./controllers/commerce.controller";
import { health } from "./controllers/misc.controller";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import { v1 } from "./routes/v1";

export function createApp() {
  const app = express();

  // Correct client IPs behind Render/Railway/Vercel proxies (needed for rate limits).
  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      // Mobile apps send no Origin header and are allowed; browsers must be on the list.
      origin: (origin, cb) => cb(null, !origin || corsOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.get("/health", health);

  // Razorpay signs the exact raw bytes, so this route must come BEFORE express.json().
  app.post("/api/v1/payments/razorpay/webhook", express.raw({ type: "application/json", limit: "1mb" }), razorpayWebhook);

  // Order matters: cookie-parser must run before the routes that read cookies (old bug).
  app.use(cookieParser());
  app.use(express.json({ limit: "200kb" }));

  app.use("/api/v1", apiLimiter, v1);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
