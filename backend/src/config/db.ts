import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

mongoose.set("strictQuery", true);

export async function connectDb(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  const conn = await mongoose.connect(uri, { autoIndex: true, serverSelectionTimeoutMS: 10_000 });
  logger.info({ db: conn.connection.name }, "MongoDB connected");
  await detectTransactionSupport();
  return conn;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Multi-document transactions need a replica set (MongoDB Atlas always is one).
 * A plain local `mongod` is not, so we detect it once and fall back to
 * sequential writes with compensation in that case.
 */
let transactionsSupported = false;

async function detectTransactionSupport() {
  try {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    transactionsSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch {
    transactionsSupported = false;
  }
  if (!transactionsSupported) {
    logger.warn("MongoDB is not a replica set: transactions disabled (fine for local dev; Atlas supports them).");
  }
}

export function supportsTransactions() {
  return transactionsSupported;
}

/**
 * Runs `fn` inside a transaction when the server supports it, otherwise runs it directly.
 * Callers should pass the session to every write (`{ session }`); it is `undefined` when
 * transactions are unavailable, which Mongoose treats as "no session".
 */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession | undefined) => Promise<T>): Promise<T> {
  if (!transactionsSupported) return fn(undefined);
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
