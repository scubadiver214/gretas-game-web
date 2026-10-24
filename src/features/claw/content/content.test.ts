import { describe, expect, it } from "vitest";
import committed from "./claw-content.json";
import { buildClawContent } from "./export";
import { PRIZE_BY_ID } from "./prizes";
import { AVATAR_BY_ID } from "./avatars";

describe("exported claw content", () => {
  it("matches the TypeScript source of truth (run `pnpm claw:export-content` after changing content)", () => {
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildClawContent())));
  });

  it("is internally consistent", () => {
    const c = buildClawContent();
    expect(c.levels).toHaveLength(c.maxLevel);
    expect(c.minGrabCycleSeconds).toBeGreaterThan(0.5);
    for (const w of c.worlds) {
      expect(PRIZE_BY_ID[w.mysteryPrize]).toBeDefined();
      expect(AVATAR_BY_ID[w.avatar]).toBeDefined();
    }
    for (const a of c.avatars) {
      const rule = a.rule;
      if (rule.kind === "worldMystery") expect(c.worlds.some((w) => w.id === rule.world)).toBe(true);
      if (rule.kind === "levelCleared") expect(rule.level).toBeLessThanOrEqual(c.maxLevel);
    }
  });
});
