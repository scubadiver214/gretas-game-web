import { describe, expect, it } from "vitest";
import {
  BAKE_ZONES,
  ORDER_COUNT,
  POINTS_CORRECT,
  POINTS_OK_BAKE,
  POINTS_PERFECT_BAKE,
  POINTS_WRONG,
  generateOrders,
  isOrderComplete,
  maxScore,
  missingToppings,
  scoreBake,
  scoreTopping,
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
    const orders = generateOrders(ORDER_COUNT, seeded(7));
    expect(orders).toHaveLength(3);
    expect(orders.map((o) => o.toppings.length)).toEqual([2, 3, 4]);
    for (const o of orders) {
      expect(new Set(o.toppings).size).toBe(o.toppings.length);
    }
  });

  it("puts cheese first when it is part of the order", () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const o of generateOrders(3, seeded(seed))) {
        if (o.toppings.includes("cheese")) expect(o.toppings[0]).toBe("cheese");
      }
    }
  });
});

describe("scoreTopping", () => {
  const order: Order = { id: 1, toppings: ["cheese", "olive"] };

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
      { id: 1, toppings: ["cheese", "olive"] },
      { id: 2, toppings: ["cheese", "olive", "basil"] },
    ];
    expect(maxScore(orders)).toBe(5 * POINTS_CORRECT + 2 * POINTS_PERFECT_BAKE);
  });
});
