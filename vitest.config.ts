import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/** Same contract as the Next.js `asset/source` rule: `import x from "./file.txt"` is the file text. */
function rawTextFiles(): Plugin {
  return {
    name: "raw-text-files",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (!file.endsWith(".txt")) return null;
      return `export default ${JSON.stringify(readFileSync(file, "utf8"))};`;
    },
  };
}

export default defineConfig({
  plugins: [rawTextFiles()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
