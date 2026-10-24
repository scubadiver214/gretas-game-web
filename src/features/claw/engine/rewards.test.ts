import { describe, expect, it } from "vitest";
import { POINTS } from "../config";
import { AVATARS } from "../content/avatars";
import { evaluateMilestones, levelStars, nextAvatar, pointsFor, type MilestoneContext } from "./rewards";

const none: MilestoneContext = { successfulGrabs: 0, prizesCollected: 0, uniquePrizes: 0, highestLevelCleared: 0, mysteryWorldsWon: [] };

describe("points and stars", () => {
  it("pays more for rarer prizes", () => {
    expect(pointsFor("common")).toBe(POINTS.common);
    expect(pointsFor("uncommon")).toBeGreaterThan(pointsFor("common"));
    expect(pointsFor("rare")).toBeGreaterThan(pointsFor("uncommon"));
    expect(pointsFor("legendary")).toBeGreaterThan(pointsFor("rare"));
  });

  it("gives three stars for a clean clear, one for a long one, never zero", () => {
    expect(levelStars(2, 2)).toBe(3);
    expect(levelStars(2, 3)).toBe(3);
    expect(levelStars(2, 4)).toBe(2);
    expect(levelStars(2, 5)).toBe(2);
    expect(levelStars(2, 6)).toBe(1);
    expect(levelStars(2, 40)).toBe(1);
  });
});

describe("avatar milestones", () => {
  it("unlocks nothing for a brand-new player", () => {
    expect(evaluateMilestones(none, [])).toEqual([]);
  });

  it("gives Baby Bear on the first grab and Slime Buddy at five toys", () => {
    expect(evaluateMilestones({ ...none, successfulGrabs: 1, prizesCollected: 1, uniquePrizes: 1 }, [])).toEqual(["baby-bear"]);
    expect(evaluateMilestones({ ...none, successfulGrabs: 5, prizesCollected: 5, uniquePrizes: 2 }, ["baby-bear"])).toEqual(["slime-buddy"]);
  });

  it("counts duplicates towards toys collected but not towards unique prizes", () => {
    const ctx = { ...none, successfulGrabs: 30, prizesCollected: 30, uniquePrizes: 3 };
    const ids = evaluateMilestones(ctx, []);
    expect(ids).toContain("slime-buddy");
    expect(ids).not.toContain("dino-champion");
    expect(evaluateMilestones({ ...ctx, uniquePrizes: 25 }, [])).toContain("dino-champion");
  });

  it("never re-awards an unlocked avatar", () => {
    const ctx = { ...none, successfulGrabs: 9, prizesCollected: 9, uniquePrizes: 9, highestLevelCleared: 10 };
    const all = evaluateMilestones(ctx, []);
    expect(all).toEqual(["baby-bear", "slime-buddy", "rainbow-unicorn", "robot-explorer"]);
    expect(evaluateMilestones(ctx, all)).toEqual([]);
  });

  it("unlocks level avatars exactly at their level and world avatars for mystery wins", () => {
    expect(evaluateMilestones({ ...none, highestLevelCleared: 4 }, [])).not.toContain("rainbow-unicorn");
    expect(evaluateMilestones({ ...none, highestLevelCleared: 5 }, [])).toContain("rainbow-unicorn");
    expect(evaluateMilestones({ ...none, highestLevelCleared: 50 }, [])).toContain("claw-champion");
    expect(evaluateMilestones({ ...none, mysteryWorldsWon: ["toybox"] }, [])).toEqual(["race-driver"]);
  });

  it("previews the avatar the player is closest to", () => {
    const next = nextAvatar({ ...none, successfulGrabs: 4, prizesCollected: 4, uniquePrizes: 3 }, ["baby-bear"]);
    expect(next?.avatar.id).toBe("slime-buddy");
    expect(next).toMatchObject({ current: 4, target: 5 });
    const done = nextAvatar(none, AVATARS.map((a) => a.id));
    expect(done).toBeNull();
  });
});
