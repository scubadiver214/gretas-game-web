import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements";
import { MAX_LEVEL, STARS_PER_LEVEL, dailyStreak, levelForStars, starsToNextLevel } from "./progress";
import type { GameResult, RoundRecord } from "./types";

describe("levelForStars", () => {
  it("unlocks a level every STARS_PER_LEVEL stars and caps", () => {
    expect(levelForStars(0)).toBe(1);
    expect(levelForStars(STARS_PER_LEVEL - 1)).toBe(1);
    expect(levelForStars(STARS_PER_LEVEL)).toBe(2);
    expect(levelForStars(1000)).toBe(MAX_LEVEL);
    expect(levelForStars(-5)).toBe(1);
  });
  it("reports stars to the next level", () => {
    expect(starsToNextLevel(0)).toBe(STARS_PER_LEVEL);
    expect(starsToNextLevel(STARS_PER_LEVEL - 1)).toBe(1);
    expect(starsToNextLevel(STARS_PER_LEVEL * (MAX_LEVEL - 1))).toBeNull();
  });
});

describe("dailyStreak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(dailyStreak([], "2026-09-15")).toBe(0);
    expect(dailyStreak(["2026-09-15"], "2026-09-15")).toBe(1);
    expect(dailyStreak(["2026-09-13", "2026-09-14", "2026-09-15"], "2026-09-15")).toBe(3);
    // Today not yet played: streak still alive from yesterday.
    expect(dailyStreak(["2026-09-13", "2026-09-14"], "2026-09-15")).toBe(2);
    // A gap breaks it.
    expect(dailyStreak(["2026-09-12", "2026-09-14", "2026-09-15"], "2026-09-15")).toBe(2);
    expect(dailyStreak(["2026-09-10"], "2026-09-15")).toBe(0);
    // Undefined entries (normal rounds) and duplicates are ignored.
    expect(dailyStreak([undefined, "2026-09-15", "2026-09-15", undefined], "2026-09-15")).toBe(1);
  });
});

function result(partial: Partial<GameResult>): GameResult {
  return {
    mode: "kitchen",
    score: 100,
    durationSeconds: 60,
    highlights: [],
    roundId: "r1",
    level: 1,
    stars: 1,
    metrics: {},
    ...partial,
  };
}

const record = (mode: RoundRecord["mode"], challengeDate?: string): RoundRecord => ({
  roundId: Math.random().toString(36),
  mode,
  score: 10,
  level: 1,
  playedAt: "2026-09-15T00:00:00Z",
  challengeDate,
});

describe("evaluateAchievements", () => {
  it("has unique ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it("unlocks the first-round trophy and skips already unlocked ones", () => {
    const ctx = { result: result({}), history: [record("kitchen")], levelAfter: 1, streak: 0 };
    expect(evaluateAchievements(ctx, {})).toContain("first-round");
    expect(evaluateAchievements(ctx, { "first-round": "x" })).not.toContain("first-round");
  });
  it("uses round metrics for mode-specific trophies", () => {
    const kitchen = {
      result: result({ mode: "kitchen", metrics: { orders: 3, perfectBakes: 3, wrong: 0 } }),
      history: [record("kitchen")],
      levelAfter: 1,
      streak: 0,
    };
    const got = evaluateAchievements(kitchen, {});
    expect(got).toEqual(expect.arrayContaining(["first-perfect", "all-perfect", "no-wrong"]));
    expect(got).not.toContain("delivery-10");

    const delivery = {
      result: result({ mode: "delivery", metrics: { deliveries: 12, bestCombo: 6, hits: 0 } }),
      history: [record("delivery"), record("kitchen")],
      levelAfter: 1,
      streak: 0,
    };
    const got2 = evaluateAchievements(delivery, {});
    expect(got2).toEqual(expect.arrayContaining(["delivery-10", "combo-6", "clean-ride", "both-modes"]));
    expect(got2).not.toContain("delivery-20");
  });
  it("awards streak and legend trophies", () => {
    const ctx = {
      result: result({ mode: "delivery", challengeDate: "2026-09-15" }),
      history: [record("delivery", "2026-09-15")],
      levelAfter: MAX_LEVEL,
      streak: 7,
    };
    const got = evaluateAchievements(ctx, {});
    expect(got).toEqual(expect.arrayContaining(["daily-1", "streak-3", "streak-7", "delivery-legend"]));
    expect(got).not.toContain("kitchen-legend");
  });
});
