import { createApp } from "./app";
import { connectDb, disconnectDb } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { closeRedis } from "./config/redis";
import { expireUnpaidBookings } from "./services/bookings";
import { flushBackground } from "./services/notify";
import { expireUnpaidOrders } from "./services/orders";

async function main() {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info(`caketown API listening on http://localhost:${env.PORT}`));

  // Release stock and seats held by online payments that were never completed.
  const sweep = setInterval(async () => {
    try {
      const [orders, bookings] = await Promise.all([expireUnpaidOrders(), expireUnpaidBookings()]);
      if (orders || bookings) logger.info({ orders, bookings }, "Expired unpaid orders/bookings");
    } catch (err) {
      logger.error({ err }, "Expiry sweep failed");
    }
  }, 5 * 60_000);
  sweep.unref();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    clearInterval(sweep);
    server.close();
    await flushBackground();
    await Promise.allSettled([disconnectDb(), closeRedis()]);
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start");
  process.exit(1);
});
