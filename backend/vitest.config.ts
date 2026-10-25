import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: "test",
      // Real URI comes from the in-memory replica set (see globalSetup); this only satisfies env validation.
      MONGODB_URI: "mongodb://placeholder/test",
      JWT_ACCESS_SECRET: "test-secret-test-secret-test-secret-123",
      RAZORPAY_KEY_ID: "rzp_test_dummy",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAY_WEBHOOK_SECRET: "whsec_test",
      SHOP_EMAIL: "shop@caketown.test",
      CORS_ORIGINS: "http://localhost:3000",
    },
  },
});
