import { beforeEach, describe, expect, it } from "vitest";
import { emptyProfile } from "./api";
import { useClawMirror } from "./mirror";
import { collectionStats, milestoneContext, worldProgress } from "./profileStats";

const nick = "Greta";

beforeEach(() => {
  useClawMirror.setState({ nickname: "", profile: null });
});

describe("claw mirror", () => {
  it("records a won prize, its points and any avatars from the grab response", () => {
    const m = useClawMirror.getState();
    m.applyGrab(nick, 1, { succeeded: true, prizeId: "teddy-brown", count: 1, points: 10, totalPoints: 10, newAvatars: ["baby-bear"] });
    let p = useClawMirror.getState().profile!;
    expect(p.prizes).toHaveLength(1);
    expect(p.prizes[0]).toMatchObject({ prizeId: "teddy-brown", count: 1, favorite: false });
    expect(p.points).toBe(10);
    expect(p.successfulGrabs).toBe(1);
    expect(p.totalGrabs).toBe(1);
    expect(p.avatars.map((a) => a.avatarId)).toEqual(["baby-bear"]);
    expect(p.selectedAvatar).toBe("baby-bear");

    // A duplicate bumps the count instead of adding a row; a miss only counts the grab.
    m.applyGrab(nick, 1, { succeeded: true, prizeId: "teddy-brown", count: 2, points: 10, totalPoints: 20, newAvatars: [] });
    m.applyGrab(nick, 1, { succeeded: false, prizeId: null, count: 0, points: 0, totalPoints: 20, newAvatars: [] });
    p = useClawMirror.getState().profile!;
    expect(p.prizes).toHaveLength(1);
    expect(p.prizes[0].count).toBe(2);
    expect(p.totalGrabs).toBe(3);
    expect(p.successfulGrabs).toBe(2);
    expect(p.points).toBe(20);
  });

  it("tracks cleared levels, keeps the best stars and follows the server's current level", () => {
    const m = useClawMirror.getState();
    m.applyComplete(nick, 1, 2, { stars: 2, cleared: true, currentLevel: 2, newAvatars: [], mysteryUnlocked: null });
    m.applyComplete(nick, 1, 1, { stars: 3, cleared: true, currentLevel: 2, newAvatars: [], mysteryUnlocked: null });
    m.applyComplete(nick, 2, 9, { stars: 0, cleared: false, currentLevel: 2, newAvatars: [], mysteryUnlocked: null });
    const p = useClawMirror.getState().profile!;
    expect(p.currentLevel).toBe(2);
    expect(p.levels).toEqual([expect.objectContaining({ level: 1, stars: 3, bestGrabs: 1, clears: 2 })]);
  });

  it("starts over for a different nickname and prefers a full server profile", () => {
    const m = useClawMirror.getState();
    m.applyGrab("Max", 1, { succeeded: true, prizeId: "duck-yellow", count: 1, points: 10, totalPoints: 10, newAvatars: [] });
    m.applyAvatar(nick, "baby-bear");
    const p = useClawMirror.getState().profile!;
    expect(useClawMirror.getState().nickname).toBe(nick);
    expect(p.prizes).toEqual([]);
    expect(p.selectedAvatar).toBe("baby-bear");
    const server = { ...emptyProfile(nick), currentLevel: 7, points: 99 };
    m.applyProfile(nick, server);
    expect(useClawMirror.getState().profile).toEqual(server);
  });
});

describe("profile stats", () => {
  it("derives milestone context, collection stats and world progress from a profile", () => {
    const p = {
      ...emptyProfile(nick),
      currentLevel: 12,
      successfulGrabs: 7,
      prizes: [
        { prizeId: "teddy-brown", count: 3, favorite: true, firstCollectedAt: "", lastCollectedAt: "" },
        { prizeId: "duck-yellow", count: 1, favorite: false, firstCollectedAt: "", lastCollectedAt: "" },
      ],
      levels: Array.from({ length: 11 }, (_, i) => ({ level: i + 1, stars: 3, bestGrabs: 1, clears: 1, lastClearedAt: "" })),
      mysteryWorldsWon: ["toybox" as const],
    };
    expect(milestoneContext(p)).toEqual({ successfulGrabs: 7, prizesCollected: 4, uniquePrizes: 2, highestLevelCleared: 11, mysteryWorldsWon: ["toybox"] });
    expect(collectionStats(p)).toMatchObject({ unique: 2, total: 4, favorites: 1 });
    const worlds = worldProgress(p);
    expect(worlds[0]).toMatchObject({ unlocked: true, cleared: 10, stars: 30, mysteryOpen: true, mysteryWon: true, playLevel: 10 });
    expect(worlds[1]).toMatchObject({ unlocked: true, cleared: 1, mysteryOpen: false, mysteryWon: false, playLevel: 12 });
    expect(worlds[2]).toMatchObject({ unlocked: false, cleared: 0, playLevel: 21 });
  });
});
