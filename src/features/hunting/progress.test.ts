import { describe, expect, it } from "vitest";
import { isLevelUnlocked, LEVELS, levelById, nextLevel } from "./levels";
import { DEFAULT_PROGRESS, applyPhoto, applyRound, starsByLevel, withBadges } from "./progress";
import type { HuntSummary, PhotoResult } from "./types";

const summary = (o: Partial<HuntSummary> = {}): HuntSummary => ({
  levelId: "lakeside-1",
  levelNumber: 1,
  activity: "ducks",
  success: true,
  score: 1000,
  stars: 2,
  hits: 4,
  shots: 5,
  hitShots: 4,
  accuracy: 0.8,
  bestStreak: 3,
  doubles: 0,
  multiShots: 0,
  ducks: 5,
  escaped: 1,
  timeSeconds: 60,
  photos: 0,
  protectedHits: 0,
  bonuses: [],
  outOfAmmo: false,
  ...o,
});

const photo = (o: Partial<PhotoResult> = {}): PhotoResult => ({ species: "heron", stars: 2, centered: 0.8, fill: 0.08, action: false, tip: "", ...o });

describe("levels", () => {
  it("has five lakeside levels with unique ids in order", () => {
    expect(LEVELS.map((l) => l.number)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    expect(levelById("lakeside-3")?.name).toBe("Double Trouble");
    expect(nextLevel("lakeside-5")).toBeUndefined();
  });

  it("unlocks each level once the previous one has a star", () => {
    expect(isLevelUnlocked("lakeside-1", {})).toBe(true);
    expect(isLevelUnlocked("lakeside-2", {})).toBe(false);
    expect(isLevelUnlocked("lakeside-2", { "lakeside-1": 1 })).toBe(true);
  });
});

describe("progress", () => {
  it("keeps the best stars and score and counts fails until a pass", () => {
    let p = applyRound(DEFAULT_PROGRESS, summary({ success: false, stars: 0, score: 300 }));
    p = applyRound(p, summary({ success: false, stars: 0, score: 200 }));
    expect(p.levels["lakeside-1"].fails).toBe(2);
    p = applyRound(p, summary({ stars: 3, score: 1500 }));
    p = applyRound(p, summary({ stars: 1, score: 900 }));
    expect(p.levels["lakeside-1"]).toMatchObject({ stars: 3, bestScore: 1500, plays: 4, fails: 0, lastStars: 1 });
    expect(starsByLevel(p)["lakeside-1"]).toBe(3);
  });

  it("adds journal entries and keeps the best photo", () => {
    const a = applyPhoto(DEFAULT_PROGRESS, photo({ stars: 1 }), "thumb-1", "t1");
    expect(a.isNew).toBe(true);
    const b = applyPhoto(a.data, photo({ stars: 3 }), "thumb-3", "t2");
    expect(b.isNew).toBe(false);
    expect(b.data.journal.heron).toMatchObject({ photos: 2, bestStars: 3, thumb: "thumb-3", firstAt: "t1" });
    const c = applyPhoto(b.data, photo({ stars: 2 }), "thumb-2", "t3");
    expect(c.data.journal.heron?.thumb).toBe("thumb-3");
    const none = applyPhoto(c.data, photo({ species: null, stars: 0 }), null, "t4");
    expect(none.data.totals.photos).toBe(4);
  });

  it("awards badges once", () => {
    const withPhoto = applyPhoto(DEFAULT_PROGRESS, photo({ stars: 3 }), null, "t").data;
    const first = withBadges(withPhoto, null, "now");
    expect(first.earned).toEqual(expect.arrayContaining(["first-snapshot", "picture-perfect"]));
    expect(withBadges(first.data, null, "later").earned).toEqual([]);
    const round = withBadges(applyRound(first.data, summary({ multiShots: 1, bestStreak: 5 })), summary({ multiShots: 1, bestStreak: 5 }), "now");
    expect(round.earned).toEqual(expect.arrayContaining(["first-flight", "two-for-one", "hot-streak", "sharp-shooter"]));
  });
});
