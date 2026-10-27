import { describe, expect, it } from "vitest";
import { API_MAX_SCORE, SCORE } from "../config";
import { LEVELS } from "../levels";
import { DIFFICULTIES, adaptiveBoost } from "./difficulty";
import { comboMultiplier, endBonuses, hitPoints, maxDucks, multiBonus, scoreCeiling, starsFor } from "./scoring";

describe("scoring", () => {
  it("builds the multiplier every two hits up to x2", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map(comboMultiplier)).toEqual([1, 1, 1.25, 1.25, 1.5, 1.5, 1.75, 1.75, 2, 2]);
  });

  it("pays more for long shots and streaks", () => {
    expect(hitPoints(20, 1)).toBe(SCORE.flying);
    expect(hitPoints(45, 1)).toBe(SCORE.long);
    expect(hitPoints(20, 2)).toBe(SCORE.flying + SCORE.streakBonus);
    expect(hitPoints(20, 3)).toBe(Math.round(SCORE.flying * 1.25) + SCORE.streakBonus);
  });

  it("rewards extra ducks in one shot", () => {
    expect(multiBonus(1)).toBe(0);
    expect(multiBonus(3)).toBe(2 * SCORE.extraDuck);
  });

  it("gives no end bonuses when the objective was missed", () => {
    expect(endBonuses({ objectiveMet: false, perfect: false, accuracy: 1, shellsLeft: 3, limitedAmmo: true })).toEqual([]);
    const b = endBonuses({ objectiveMet: true, perfect: true, accuracy: 0.5, shellsLeft: 2, limitedAmmo: true });
    expect(b.map((x) => x.label)).toEqual(["Level complete", "Accuracy", "Perfect round", "Shells saved"]);
  });

  it("awards stars from the objective and the two score thresholds", () => {
    expect(starsFor(5000, false, [100, 200])).toBe(0);
    expect(starsFor(50, true, [100, 200])).toBe(1);
    expect(starsFor(150, true, [100, 200])).toBe(2);
    expect(starsFor(200, true, [100, 200])).toBe(3);
  });
});

describe("level balance", () => {
  const maxReserveBonus = Math.max(...DIFFICULTIES.map((d) => d.reserveBonus));
  it.each(LEVELS.map((l) => [l.id, l] as const))("%s stays under the API score cap and its stars are reachable", (_id, level) => {
    const ceiling = scoreCeiling(level, maxReserveBonus);
    expect(ceiling).toBeLessThanOrEqual(API_MAX_SCORE);
    expect(level.starScores[0]).toBeLessThan(level.starScores[1]);
    expect(level.starScores[1]).toBeLessThan(ceiling);
    expect(level.objective.count).toBeLessThanOrEqual(maxDucks(level));
  });
});

describe("adaptive difficulty", () => {
  it("helps after repeated fails and adds spice after repeated 3-star runs", () => {
    expect(adaptiveBoost(undefined).note).toBeNull();
    expect(adaptiveBoost({ fails: 2, lastStars: 0, plays: 2 }).speedMul).toBeLessThan(1);
    expect(adaptiveBoost({ fails: 5, lastStars: 0, plays: 5 }).sizeMul).toBeGreaterThan(adaptiveBoost({ fails: 2, lastStars: 0, plays: 2 }).sizeMul);
    expect(adaptiveBoost({ fails: 0, lastStars: 3, plays: 3 }).jinkMul).toBeGreaterThan(1);
  });
});
