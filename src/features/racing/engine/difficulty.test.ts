import { describe, expect, it } from "vitest";
import { ASSIST_LEVELS, DIFFICULTY_TIERS, MAX_TIER, difficultyFor, playerTuning, type DifficultyConfig } from "./difficulty";

describe("difficulty tiers", () => {
  it("defines the five named tiers in order", () => {
    expect(DIFFICULTY_TIERS.map((t) => t.tier)).toEqual([1, 2, 3, 4, 5]);
    expect(DIFFICULTY_TIERS.map((t) => t.name)).toEqual(["Rookie Racers", "Speedy Starters", "Turbo Racers", "Super Speedsters", "Fitz Champions"]);
    expect(MAX_TIER).toBe(5);
  });

  it("gives every tier its own settings for every tunable", () => {
    const keys: (keyof DifficultyConfig)[] = ["aiSpeedMultiplier", "aiCorneringSkill", "aiMistakeFrequency", "steeringAssist", "collisionPenalty", "obstacleDensity", "rewardMultiplier", "gateScale"];
    for (const key of keys) {
      const values = DIFFICULTY_TIERS.map((t) => t[key]);
      expect(new Set(values).size, `${key} must differ on every tier`).toBe(5);
    }
  });

  it("gets harder with each tier", () => {
    for (let i = 1; i < DIFFICULTY_TIERS.length; i++) {
      const easy = DIFFICULTY_TIERS[i - 1];
      const hard = DIFFICULTY_TIERS[i];
      expect(hard.aiSpeedMultiplier).toBeGreaterThan(easy.aiSpeedMultiplier);
      expect(hard.aiCorneringSkill).toBeGreaterThan(easy.aiCorneringSkill);
      expect(hard.aiMistakeFrequency).toBeLessThan(easy.aiMistakeFrequency);
      expect(hard.steeringAssist).toBeLessThan(easy.steeringAssist);
      expect(hard.collisionPenalty).toBeGreaterThan(easy.collisionPenalty);
      expect(hard.obstacleDensity).toBeGreaterThan(easy.obstacleDensity);
      expect(hard.gateScale).toBeLessThan(easy.gateScale);
      // Harder races pay more.
      expect(hard.rewardMultiplier).toBeGreaterThan(easy.rewardMultiplier);
    }
  });

  it("keeps ratios in range, and never lets the AI out-drive the vehicle (no rubber-banding cheats)", () => {
    for (const t of DIFFICULTY_TIERS) {
      expect(t.aiSpeedMultiplier).toBeGreaterThan(0);
      expect(t.aiSpeedMultiplier).toBeLessThanOrEqual(1);
      expect(t.aiCorneringSkill).toBeGreaterThanOrEqual(0);
      expect(t.aiCorneringSkill).toBeLessThanOrEqual(1);
      expect(t.steeringAssist).toBeGreaterThanOrEqual(0);
      expect(t.steeringAssist).toBeLessThanOrEqual(1);
      expect(t.collisionPenalty).toBeGreaterThan(0);
      expect(t.collisionPenalty).toBeLessThanOrEqual(1);
    }
  });

  it("clamps out-of-range tiers", () => {
    expect(difficultyFor(0).tier).toBe(1);
    expect(difficultyFor(-3).tier).toBe(1);
    expect(difficultyFor(99).tier).toBe(5);
    expect(difficultyFor(2.4).tier).toBe(2);
    expect(difficultyFor(3)).toBe(DIFFICULTY_TIERS[2]);
  });
});

describe("player assist", () => {
  it("is fully off for pro players, whatever the tier", () => {
    for (const t of [1, 3, 5]) {
      const a = playerTuning(t, "off");
      expect(a.steeringAssist).toBe(0);
      expect(a.autoAccelerate).toBe(false);
      expect(a.autoRecover).toBe(false);
      expect(a.accelScale).toBe(1);
      expect(a.collisionPenalty).toBe(difficultyFor(t).collisionPenalty);
    }
  });

  it("helps more at each step, for little ones", () => {
    const off = playerTuning(1, "off");
    const helper = playerTuning(1, "helper");
    const extra = playerTuning(1, "extra");
    expect(helper.steeringAssist).toBeGreaterThan(off.steeringAssist);
    expect(extra.steeringAssist).toBeGreaterThan(helper.steeringAssist);
    expect(helper.collisionPenalty).toBeLessThan(off.collisionPenalty);
    expect(extra.collisionPenalty).toBeLessThan(helper.collisionPenalty);
    expect(helper.autoRecover).toBe(true);
    expect(helper.autoAccelerate).toBe(false);
    expect(extra.autoAccelerate).toBe(true);
    expect(extra.accelScale).toBeLessThan(1);
    expect(extra.gateScale).toBeGreaterThan(helper.gateScale);
    expect(helper.gateScale).toBeGreaterThan(off.gateScale);
  });

  it("keeps steering help within 0..1 at every combination", () => {
    for (let t = 1; t <= MAX_TIER; t++) {
      for (const level of ASSIST_LEVELS) {
        const a = playerTuning(t, level);
        expect(a.steeringAssist).toBeGreaterThanOrEqual(0);
        expect(a.steeringAssist).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives harder tiers less help even with assist on", () => {
    expect(playerTuning(5, "helper").steeringAssist).toBeLessThan(playerTuning(1, "helper").steeringAssist);
  });
});
