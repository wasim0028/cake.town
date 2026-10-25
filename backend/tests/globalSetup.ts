import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

/**
 * Starts a single-node MongoDB replica set in memory so tests exercise real transactions.
 * The mongod binary is downloaded automatically on first run; set MONGOMS_SYSTEM_BINARY to
 * use one that is already installed.
 */
let replSet: MongoMemoryReplSet;

export async function setup(project: TestProject) {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  project.provide("mongoUri", replSet.getUri());
}

export async function teardown() {
  await replSet?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
