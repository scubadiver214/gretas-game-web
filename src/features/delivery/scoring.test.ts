import { describe, expect, it } from "vitest";
import {
  BASE_SPEED,
  CLEAR_HEIGHT,
  COMBO_EVERY,
  JUMP_HEIGHT,
  JUMP_SECONDS,
  LANE_COUNT,
  MAX_SPEED,
  POINTS_COMBO,
  POINTS_DELIVERY,
  TURBO_POINTS_MULTIPLIER,
  TURBO_SPEED_MULTIPLIER,
  applyDelivery,
  applyObstacle,
  clampLane,
  deliveryDifficultyFor,
  deliveryPar,
  deliveryStars,
  jumpHeight,
  pickSpawn,
  spawnIntervalFor,
  speedFor,
} from "./scoring";

describe("applyDelivery", () => {
  it("adds points and grows the combo", () => {
    expect(applyDelivery({ score: 0, combo: 0 })).toEqual({ score: POINTS_DELIVERY, combo: 1, bonus: false, gained: POINTS_DELIVERY });
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
      expect(["mailbox", "cone", "puddle", "barrier", "star"]).toContain(kind);
    }
  });
  it("never spawns barriers at level 1 but does from level 2", () => {
    const rng = lcg(5);
    const kinds1 = new Set(Array.from({ length: 600 }, () => pickSpawn(rng, 0, deliveryDifficultyFor(1)).kind));
    expect(kinds1.has("barrier")).toBe(false);
    const kinds3 = new Set(Array.from({ length: 600 }, () => pickSpawn(rng, 0, deliveryDifficultyFor(3)).kind));
    expect(kinds3.has("barrier")).toBe(true);
  });
  it("attaches a power-up kind to every star", () => {
    const rng = lcg(9);
    let stars = 0;
    for (let i = 0; i < 1000; i++) {
      const s = pickSpawn(rng, 1, deliveryDifficultyFor(2));
      if (s.kind === "star") {
        stars++;
        expect(["magnet", "shield", "turbo"]).toContain(s.powerUp);
      } else {
        expect(s.powerUp).toBeUndefined();
      }
    }
    expect(stars).toBeGreaterThan(20);
  });
});

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

describe("turbo, jumping and stars", () => {
  it("doubles delivery points under turbo", () => {
    expect(applyDelivery({ score: 0, combo: 0 }, TURBO_POINTS_MULTIPLIER).gained).toBe(POINTS_DELIVERY * 2);
  });
  it("speeds up under turbo", () => {
    expect(speedFor(0, deliveryDifficultyFor(1), true)).toBeCloseTo(BASE_SPEED * TURBO_SPEED_MULTIPLIER);
  });
  it("follows a parabolic jump arc that clears obstacles mid-air", () => {
    expect(jumpHeight(-1)).toBe(0);
    expect(jumpHeight(0)).toBe(0);
    expect(jumpHeight(JUMP_SECONDS)).toBe(0);
    expect(jumpHeight(JUMP_SECONDS / 2)).toBeCloseTo(JUMP_HEIGHT);
    expect(jumpHeight(JUMP_SECONDS / 2)).toBeGreaterThan(CLEAR_HEIGHT);
  });
  it("grades rounds against a per-level par", () => {
    expect(deliveryPar(5)).toBeGreaterThan(deliveryPar(1));
    expect(deliveryStars(deliveryPar(1) * 1.5, 1)).toBe(3);
    expect(deliveryStars(deliveryPar(1), 1)).toBe(2);
    expect(deliveryStars(deliveryPar(1) * 0.6, 1)).toBe(1);
    expect(deliveryStars(0, 1)).toBe(0);
  });
});

describe("deliveryDifficultyFor", () => {
  it("gets faster, denser and more obstacle-heavy with level", () => {
    const l1 = deliveryDifficultyFor(1);
    const l5 = deliveryDifficultyFor(5);
    expect(l1.baseSpeed).toBe(BASE_SPEED);
    expect(l5.baseSpeed).toBeGreaterThan(l1.baseSpeed);
    expect(l5.maxSpeed).toBeGreaterThan(l1.maxSpeed);
    expect(l5.spawnBase).toBeLessThan(l1.spawnBase);
    expect(l5.mailboxShare).toBeLessThan(l1.mailboxShare);
    expect(speedFor(0, l5)).toBe(l5.baseSpeed);
    expect(speedFor(10_000, l5)).toBe(l5.maxSpeed);
  });
  it("clamps levels and keeps mailboxes the most common item", () => {
    expect(deliveryDifficultyFor(-3)).toEqual(deliveryDifficultyFor(1));
    expect(deliveryDifficultyFor(50)).toEqual(deliveryDifficultyFor(5));
    let seed = 11;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    let mailboxes = 0;
    for (let i = 0; i < 1000; i++) if (pickSpawn(rng, 1, deliveryDifficultyFor(5)).kind === "mailbox") mailboxes++;
    expect(mailboxes).toBeGreaterThan(300);
    expect(mailboxes).toBeLessThan(500);
  });
});

describe("clampLane", () => {
  it("keeps the lane inside the road", () => {
    expect(clampLane(-1)).toBe(0);
    expect(clampLane(LANE_COUNT)).toBe(LANE_COUNT - 1);
    expect(clampLane(1)).toBe(1);
  });
});
