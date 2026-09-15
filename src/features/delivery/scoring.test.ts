import { describe, expect, it } from "vitest";
import {
  BASE_SPEED,
  COMBO_EVERY,
  LANE_COUNT,
  MAX_SPEED,
  POINTS_COMBO,
  POINTS_DELIVERY,
  applyDelivery,
  applyObstacle,
  clampLane,
  pickSpawn,
  spawnIntervalFor,
  speedFor,
} from "./scoring";

describe("applyDelivery", () => {
  it("adds points and grows the combo", () => {
    expect(applyDelivery({ score: 0, combo: 0 })).toEqual({ score: POINTS_DELIVERY, combo: 1, bonus: false });
  });
  it("awards a combo bonus every COMBO_EVERY deliveries", () => {
    let s = { score: 0, combo: 0 };
    for (let i = 1; i < COMBO_EVERY; i++) s = applyDelivery(s);
    const r = applyDelivery(s);
    expect(r.bonus).toBe(true);
    expect(r.score).toBe(COMBO_EVERY * POINTS_DELIVERY + POINTS_COMBO);
  });
});

describe("applyObstacle", () => {
  it("removes points, never below zero, and resets combo", () => {
    expect(applyObstacle({ score: 5, combo: 4 })).toEqual({ score: 0, combo: 0 });
    expect(applyObstacle({ score: 50, combo: 1 })).toEqual({ score: 40, combo: 0 });
  });
});

describe("speed + spawning", () => {
  it("ramps from base speed and caps", () => {
    expect(speedFor(0)).toBe(BASE_SPEED);
    expect(speedFor(10_000)).toBe(MAX_SPEED);
    expect(speedFor(20)).toBeGreaterThan(BASE_SPEED);
  });
  it("spawns faster at higher speed but not below the floor", () => {
    expect(spawnIntervalFor(MAX_SPEED)).toBeLessThan(spawnIntervalFor(BASE_SPEED));
    expect(spawnIntervalFor(1000)).toBeGreaterThanOrEqual(0.55);
  });
  it("only spawns valid lanes and kinds", () => {
    let seed = 3;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 200; i++) {
      const { kind, lane } = pickSpawn(rng, i % LANE_COUNT);
      expect(lane).toBeGreaterThanOrEqual(0);
      expect(lane).toBeLessThan(LANE_COUNT);
      expect(["mailbox", "cone", "puddle"]).toContain(kind);
    }
  });
});

describe("clampLane", () => {
  it("keeps the lane inside the road", () => {
    expect(clampLane(-1)).toBe(0);
    expect(clampLane(LANE_COUNT)).toBe(LANE_COUNT - 1);
    expect(clampLane(1)).toBe(1);
  });
});
