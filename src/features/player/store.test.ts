import { describe, expect, it } from "vitest";
import { EMPTY_ROUNDS, EMPTY_STARS } from "./progress";
import { migratePlayerState, usePlayerStore } from "./store";
import { DEFAULT_COLOR, DEFAULT_HAIR_COLOR, DEFAULT_SKIN_COLOR } from "./types";

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
    expect(migrated.roundsPlayed).toEqual({ kitchen: 3, delivery: 1, wordle: 2, frogger: 0, claw: 0, racing: 0 });
    expect(migrated.stars).toEqual({ kitchen: 7, delivery: 2, wordle: 4, frogger: 0, claw: 0, racing: 0 });
    expect(migrated.history).toHaveLength(1);
    expect(migrated.nickname).toBe("Greta");
  });

  it("adds zeroed claw counters to a version 7 save without touching other progress", () => {
    const v7 = {
      nickname: "Greta",
      character: "girl",
      roundsPlayed: { kitchen: 3, delivery: 1, wordle: 2, frogger: 4 },
      stars: { kitchen: 7, delivery: 2, wordle: 4, frogger: 6 },
      achievements: { "first-round": "2026-10-01T00:00:00Z" },
    };
    const migrated = migratePlayerState(v7, 7);
    expect(migrated.roundsPlayed).toEqual({ kitchen: 3, delivery: 1, wordle: 2, frogger: 4, claw: 0, racing: 0 });
    expect(migrated.stars).toEqual({ kitchen: 7, delivery: 2, wordle: 4, frogger: 6, claw: 0, racing: 0 });
    expect(migrated.achievements).toEqual(v7.achievements);
  });

  it("adds zeroed racing counters to a version 8 save without touching other progress", () => {
    const v8 = {
      nickname: "Greta",
      character: "girl",
      roundsPlayed: { kitchen: 3, delivery: 1, wordle: 2, frogger: 4, claw: 2 },
      stars: { kitchen: 7, delivery: 2, wordle: 4, frogger: 6, claw: 5 },
    };
    const migrated = migratePlayerState(v8, 8);
    expect(migrated.roundsPlayed).toEqual({ kitchen: 3, delivery: 1, wordle: 2, frogger: 4, claw: 2, racing: 0 });
    expect(migrated.stars).toEqual({ kitchen: 7, delivery: 2, wordle: 4, frogger: 6, claw: 5, racing: 0 });
  });

  it("brings a very old save all the way up", () => {
    const migrated = migratePlayerState({ nickname: "Max", character: "boy" }, 1);
    expect(migrated.roundsPlayed).toEqual(EMPTY_ROUNDS);
    expect(migrated.stars).toEqual(EMPTY_STARS);
    expect(migrated.hairColor).toBeDefined();
    expect(migrated.skinColor).toBeDefined();
  });

  it("gives an existing save that character's skin tone", () => {
    const migrated = migratePlayerState({ nickname: "Greta", character: "girl" }, 5);
    expect(migrated.skinColor).toBe(DEFAULT_SKIN_COLOR.girl);
  });

  it("moves old default colours to the new look and keeps custom picks", () => {
    const onDefaults = migratePlayerState({ character: "boy", color: "#3B82F6", hairColor: "#5A3A1B", skinColor: "#5D4D44" }, 6);
    expect(onDefaults).toMatchObject({ color: DEFAULT_COLOR.boy, hairColor: DEFAULT_HAIR_COLOR.boy, skinColor: DEFAULT_SKIN_COLOR.boy });
    const custom = migratePlayerState({ character: "girl", color: "#F2542D", hairColor: "#C0392B", skinColor: "#3C2415" }, 6);
    expect(custom).toMatchObject({ color: "#F2542D", hairColor: "#C0392B", skinColor: "#3C2415" });
  });
});

describe("player store hydration", () => {
  it("marks the store ready after persist rehydration even when storage is empty", () => {
    expect(usePlayerStore.getState().hydrated).toBe(true);
  });
});
