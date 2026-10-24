import path from "node:path";
import { defineConfig } from "vitest/config";

/** Runs scripts/export-claw-content.ts as a one-off vitest "test" (see that file). */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "../src") },
  },
  test: {
    include: ["scripts/export-claw-content.ts"],
    environment: "node",
  },
});
