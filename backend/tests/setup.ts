import crypto from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, inject } from "vitest";
import { connectDb } from "../src/config/db";

// Each test file gets its own database on the shared in-memory replica set.
beforeAll(async () => {
  const base = inject("mongoUri");
  const url = new URL(base);
  url.pathname = `/ct_${crypto.randomBytes(4).toString("hex")}`;
  await connectDb(url.toString());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
});
