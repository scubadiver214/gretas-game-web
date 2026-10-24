import { describe, expect, it } from "vitest";
import { ASSIST } from "../config";
import { MAX_LEVEL, assistBumps, difficultyFor, tierFor, withAssist } from "./difficulty";

describe("difficulty curve", () => {
  it("gets steadily harder from level 1 to 50 with no spikes", () => {
    let prev = difficultyFor(1);
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const d = difficultyFor(level);
      expect(d.gripStrength).toBeLessThanOrEqual(prev.gripStrength);
      expect(d.alignTolerance).toBeLessThanOrEqual(prev.alignTolerance);
      expect(d.slipChance).toBeGreaterThanOrEqual(prev.slipChance);
      expect(d.crowding).toBeGreaterThanOrEqual(prev.crowding);
      expect(d.toyCount).toBeGreaterThanOrEqual(prev.toyCount);
      // One level never changes grip or tolerance by more than a sliver.
      expect(prev.gripStrength - d.gripStrength).toBeLessThan(0.05);
      expect(prev.alignTolerance - d.alignTolerance).toBeLessThan(0.03);
      prev = d;
    }
  });

  it("has no slip or tight tolerance in the beginner tiers", () => {
    for (let level = 1; level <= 10; level++) {
      const d = difficultyFor(level);
      expect(d.slipChance).toBe(0);
      expect(d.alignTolerance).toBeGreaterThanOrEqual(0.3);
      expect(d.gripStrength).toBeGreaterThanOrEqual(1.15);
    }
  });

  it("clamps outside the curve", () => {
    expect(difficultyFor(0)).toEqual(difficultyFor(1));
    expect(difficultyFor(99)).toEqual(difficultyFor(50));
  });

  it("maps levels to the documented tiers", () => {
    expect(tierFor(1).id).toBe("veryEasy");
    expect(tierFor(5).id).toBe("veryEasy");
    expect(tierFor(6).id).toBe("easy");
    expect(tierFor(11).id).toBe("medium");
    expect(tierFor(21).id).toBe("challenging");
    expect(tierFor(31).id).toBe("advanced");
    expect(tierFor(50).id).toBe("expert");
  });
});

describe("adaptive assist", () => {
  it("kicks in after the configured misses and caps out", () => {
    expect(assistBumps(0)).toBe(0);
    expect(assistBumps(ASSIST.bumpAfter - 1)).toBe(0);
    expect(assistBumps(ASSIST.bumpAfter)).toBe(1);
    expect(assistBumps(ASSIST.bumpAfter + 1)).toBe(2);
    expect(assistBumps(100)).toBe(ASSIST.maxBumps);
  });

  it("only ever makes the machine kinder", () => {
    const base = difficultyFor(40);
    const helped = withAssist(base, 2);
    expect(helped.alignTolerance).toBeGreaterThan(base.alignTolerance);
    expect(helped.gripStrength).toBeGreaterThan(base.gripStrength);
    expect(helped.slipChance).toBeLessThanOrEqual(base.slipChance);
    expect(helped.clawSpeed).toBe(base.clawSpeed);
    expect(withAssist(base, 0)).toBe(base);
  });
});
