import { describe, expect, it } from "vitest";
import {
  BAKE_ZONES,
  ORDER_COUNT,
  POINTS_CORRECT,
  POINTS_OK_BAKE,
  POINTS_PERFECT_BAKE,
  POINTS_SPEEDY,
  POINTS_WRONG,
  generateOrders,
  isOrderComplete,
  kitchenDifficultyFor,
  kitchenStars,
  maxScore,
  missingToppings,
  scoreBake,
  scoreTopping,
  speedyBonus,
  type Order,
} from "./scoring";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("generateOrders", () => {
  it("creates ramping orders with distinct toppings", () => {
    const orders = generateOrders(kitchenDifficultyFor(1), seeded(7));
    expect(orders).toHaveLength(ORDER_COUNT);
    expect(orders.map((o) => o.toppings.length)).toEqual([2, 3, 4]);
    for (const o of orders) {
      expect(new Set(o.toppings).size).toBe(o.toppings.length);
    }
  });

  it("puts cheese first when it is part of the order", () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const o of generateOrders(kitchenDifficultyFor(1), seeded(seed))) {
        if (o.toppings.includes("cheese")) expect(o.toppings[0]).toBe("cheese");
      }
    }
  });

  it("is deterministic for the same seed (daily challenge)", () => {
    const a = generateOrders(kitchenDifficultyFor(3), seeded(42));
    const b = generateOrders(kitchenDifficultyFor(3), seeded(42));
    expect(a).toEqual(b);
  });
});

describe("kitchenDifficultyFor", () => {
  it("adds orders and toppings and speeds up the oven as level rises", () => {
    const l1 = kitchenDifficultyFor(1);
    const l5 = kitchenDifficultyFor(5);
    expect(l1.orderCount).toBe(3);
    expect(l5.orderCount).toBe(5);
    expect(l5.maxToppings).toBeGreaterThan(l1.maxToppings);
    expect(l5.bakeDurationMs).toBeLessThan(l1.bakeDurationMs);
    expect(l5.bakeDurationMs).toBeGreaterThanOrEqual(3000);
  });
  it("clamps out-of-range levels", () => {
    expect(kitchenDifficultyFor(0)).toEqual(kitchenDifficultyFor(1));
    expect(kitchenDifficultyFor(99)).toEqual(kitchenDifficultyFor(5));
  });
  it("never asks for more toppings than exist", () => {
    for (let level = 1; level <= 5; level++) {
      for (const o of generateOrders(kitchenDifficultyFor(level), seeded(level))) {
        expect(o.toppings.length).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe("patience, rush orders and speedy bonus", () => {
  it("has no timer at level 1 and a shrinking one from level 2", () => {
    expect(kitchenDifficultyFor(1).patienceMs).toBe(0);
    expect(kitchenDifficultyFor(2).patienceMs).toBeGreaterThan(kitchenDifficultyFor(5).patienceMs);
    expect(kitchenDifficultyFor(5).patienceMs).toBeGreaterThan(0);
    for (const o of generateOrders(kitchenDifficultyFor(1), seeded(3))) expect(o.patienceMs).toBe(0);
  });
  it("grants more patience for orders with more toppings", () => {
    const d = kitchenDifficultyFor(2);
    for (const o of generateOrders(d, seeded(7))) {
      expect(o.patienceMs).toBe(d.patienceMs + o.toppings.length * d.patiencePerToppingMs);
    }
  });
  it("adds exactly one rush order from level 3, never the first one", () => {
    for (let seed = 1; seed < 30; seed++) {
      const l2 = generateOrders(kitchenDifficultyFor(2), seeded(seed));
      expect(l2.filter((o) => o.rush)).toHaveLength(0);
      const l3 = generateOrders(kitchenDifficultyFor(3), seeded(seed));
      const rush = l3.filter((o) => o.rush);
      expect(rush).toHaveLength(1);
      expect(l3[0].rush).toBeFalsy();
      const d3 = kitchenDifficultyFor(3);
      const full = d3.patienceMs + rush[0].toppings.length * d3.patiencePerToppingMs;
      expect(rush[0].patienceMs).toBe(Math.round(full * 0.7));
    }
  });
  it("doubles topping and bake points on rush orders", () => {
    const rush: Order = { id: 2, toppings: ["cheese"], rush: true, patienceMs: 10000 };
    expect(scoreTopping(rush, [], "cheese").delta).toBe(POINTS_CORRECT * 2);
    expect(scoreTopping(rush, [], "olive").delta).toBe(POINTS_WRONG);
    const mid = (BAKE_ZONES.perfectStart + BAKE_ZONES.perfectEnd) / 2;
    expect(scoreBake(mid, rush).delta).toBe(POINTS_PERFECT_BAKE * 2);
  });
  it("pays the speedy bonus only with a timer and enough patience left", () => {
    const timed: Order = { id: 1, toppings: ["cheese"], patienceMs: 10000 };
    const untimed: Order = { id: 1, toppings: ["cheese"], patienceMs: 0 };
    expect(speedyBonus(timed, 0.9)).toBe(POINTS_SPEEDY);
    expect(speedyBonus(timed, 0.2)).toBe(0);
    expect(speedyBonus(untimed, 1)).toBe(0);
    expect(speedyBonus({ ...timed, rush: true }, 1)).toBe(POINTS_SPEEDY * 2);
  });
});

describe("kitchenStars", () => {
  const orders = generateOrders(kitchenDifficultyFor(2), seeded(5));
  it("grades against the best possible score", () => {
    const max = maxScore(orders);
    expect(kitchenStars(max, orders)).toBe(3);
    expect(kitchenStars(Math.ceil(max * 0.7), orders)).toBe(2);
    expect(kitchenStars(Math.ceil(max * 0.45), orders)).toBe(1);
    expect(kitchenStars(0, orders)).toBe(0);
  });
});

describe("scoreTopping", () => {
  const order: Order = { id: 1, toppings: ["cheese", "olive"], patienceMs: 0 };

  it("rewards a correct topping", () => {
    expect(scoreTopping(order, [], "cheese")).toEqual({ delta: POINTS_CORRECT, outcome: "correct" });
  });
  it("penalises a wrong topping", () => {
    expect(scoreTopping(order, [], "basil")).toEqual({ delta: POINTS_WRONG, outcome: "wrong" });
  });
  it("ignores duplicates", () => {
    expect(scoreTopping(order, ["cheese"], "cheese")).toEqual({ delta: 0, outcome: "duplicate" });
  });
  it("tracks completeness regardless of extra toppings", () => {
    expect(isOrderComplete(order, ["cheese"])).toBe(false);
    expect(missingToppings(order, ["cheese"])).toEqual(["olive"]);
    expect(isOrderComplete(order, ["olive", "basil", "cheese"])).toBe(true);
  });
});

describe("scoreBake", () => {
  it("is raw before the ok zone", () => {
    expect(scoreBake(0.1)).toEqual({ delta: 0, outcome: "raw" });
  });
  it("is ok on the edges", () => {
    expect(scoreBake(BAKE_ZONES.okStart)).toEqual({ delta: POINTS_OK_BAKE, outcome: "ok" });
    expect(scoreBake(BAKE_ZONES.okEnd)).toEqual({ delta: POINTS_OK_BAKE, outcome: "ok" });
  });
  it("is perfect in the middle", () => {
    const mid = (BAKE_ZONES.perfectStart + BAKE_ZONES.perfectEnd) / 2;
    expect(scoreBake(mid)).toEqual({ delta: POINTS_PERFECT_BAKE, outcome: "perfect" });
  });
  it("burns after the ok zone and at 1", () => {
    expect(scoreBake(0.95).outcome).toBe("burnt");
    expect(scoreBake(1).outcome).toBe("burnt");
  });
});

describe("maxScore", () => {
  it("sums toppings and perfect bakes", () => {
    const orders: Order[] = [
      { id: 1, toppings: ["cheese", "olive"], patienceMs: 0 },
      { id: 2, toppings: ["cheese", "olive", "basil"], patienceMs: 0 },
    ];
    expect(maxScore(orders)).toBe(5 * POINTS_CORRECT + 2 * POINTS_PERFECT_BAKE);
  });
  it("includes speedy bonuses and rush multipliers", () => {
    const orders: Order[] = [
      { id: 1, toppings: ["cheese"], patienceMs: 5000 },
      { id: 2, toppings: ["cheese"], patienceMs: 5000, rush: true },
    ];
    const one = POINTS_CORRECT + POINTS_PERFECT_BAKE + POINTS_SPEEDY;
    expect(maxScore(orders)).toBe(one + one * 2);
  });
});
