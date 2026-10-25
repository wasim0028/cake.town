import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // The shared package ships TypeScript source, so bundle it into the server build.
  noExternal: ["@caketown/shared"],
});
