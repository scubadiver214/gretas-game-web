import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { buildClawContent } from "@/features/claw/content/export";

/**
 * Writes claw-content.json for the web app and, when the API repo is checked
 * out as a sibling, for the API too. Runs through vitest so it can import
 * the TypeScript content with the `@/` alias without another toolchain:
 *
 *   pnpm claw:export-content
 */
const WEB_OUT = path.resolve(__dirname, "../src/features/claw/content/claw-content.json");
const API_OUT = path.resolve(__dirname, "../../gretas-game-api/src/GretasGame.Api/Claw/claw-content.json");

it("exports claw content", () => {
  const json = `${JSON.stringify(buildClawContent(), null, 2)}\n`;
  writeFileSync(WEB_OUT, json);
  console.log(`wrote ${WEB_OUT}`);
  if (existsSync(path.dirname(path.dirname(API_OUT)))) {
    mkdirSync(path.dirname(API_OUT), { recursive: true });
    writeFileSync(API_OUT, json);
    console.log(`wrote ${API_OUT}`);
  } else {
    console.log("API repo not found next to this one; skipped the API copy");
  }
});
