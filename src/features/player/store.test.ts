import { describe, expect, it } from "vitest";
import { EMPTY_ROUNDS, EMPTY_STARS } from "./progress";
import { migratePlayerState } from "./store";

describe("persisted player migration", () => {
  it("adds zeroed frogger counters to a version 4 save without touching other progress", () => {
    const v4 = {
      nickname: "Greta",
      character: "girl",
      roundsPlayed: { kitchen: 3, delivery: 1, wordle: 2 },
      stars: { kitchen: 7, delivery: 2, wordle: 4 },
      history: [{ roundId: "r1", mode: "kitchen", score: 90, level: 2, playedAt: "2026-10-01T00:00:00Z" }],
    };
    const migrated = migratePlayerState(v4, 4);
    expect(migrated.roundsPlayed).toEqual({ kitchen: 3, delivery: 1, wordle: 2, frogger: 0 });
    expect(migrated.stars).toEqual({ kitchen: 7, delivery: 2, wordle: 4, frogger: 0 });
    expect(migrated.history).toHaveLength(1);
    expect(migrated.nickname).toBe("Greta");
  });

  it("brings a very old save all the way up", () => {
    const migrated = migratePlayerState({ nickname: "Max", character: "boy" }, 1);
    expect(migrated.roundsPlayed).toEqual(EMPTY_ROUNDS);
    expect(migrated.stars).toEqual(EMPTY_STARS);
    expect(migrated.hairColor).toBeDefined();
  });
});
