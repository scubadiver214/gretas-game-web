import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { SCORING } from "../config";
import { ALL_INGREDIENTS, STARTER_INGREDIENTS } from "../content/ingredients";
import { RECIPE_BY_ID, recipeIngredients } from "../content/recipes";
import { BASE_MODS, modsFor } from "../content/shop";
import { kitchenDifficultyFor, orderIntervalAt, rushCurve } from "./difficulty";
import { availableRecipes, buildMenu, makeOrder } from "./orders";
import { coinsFor, comboMultiplier, orderValue, scoreServe, starTargets, starsFor } from "./scoring";

describe("difficulty", () => {
  it("gets busier with every level", () => {
    for (let l = 2; l <= 5; l++) {
      const a = kitchenDifficultyFor(l - 1);
      const b = kitchenDifficultyFor(l);
      expect(b.orderInterval).toBeLessThan(a.orderInterval);
      expect(b.patienceBase).toBeLessThan(a.patienceBase);
      expect(b.menuSize).toBeGreaterThanOrEqual(a.menuSize);
      expect(b.shiftSeconds).toBeLessThanOrEqual(600);
    }
  });

  it("clamps out-of-range levels", () => {
    expect(kitchenDifficultyFor(0)).toEqual(kitchenDifficultyFor(1));
    expect(kitchenDifficultyFor(42)).toEqual(kitchenDifficultyFor(5));
  });

  it("peaks the lunch rush mid-shift", () => {
    expect(rushCurve(0)).toBeLessThan(0.15);
    expect(rushCurve(0.55)).toBeCloseTo(1);
    expect(rushCurve(1)).toBeLessThan(0.3);
    const d = kitchenDifficultyFor(3);
    expect(orderIntervalAt(d, d.shiftSeconds * 0.55)).toBeLessThan(orderIntervalAt(d, 0));
  });
});

describe("menu", () => {
  it("only uses recipes the player can make", () => {
    const pool = availableRecipes(5, STARTER_INGREDIENTS);
    expect(pool.map((r) => r.id).sort()).toEqual(["double", "funghi", "margherita", "pepperoni"]);
    for (const r of pool) expect(recipeIngredients(r).every((i) => STARTER_INGREDIENTS.includes(i))).toBe(true);
  });

  it("respects recipe levels", () => {
    expect(availableRecipes(1, ALL_INGREDIENTS).every((r) => r.minLevel === 1)).toBe(true);
    expect(availableRecipes(5, ALL_INGREDIENTS).some((r) => r.id === "tropical")).toBe(true);
  });

  it("stocks every ingredient the menu needs and fits the pantry", () => {
    for (let seed = 1; seed < 40; seed++) {
      const d = kitchenDifficultyFor(1 + (seed % 5));
      const { menu, pantry } = buildMenu(d, ALL_INGREDIENTS, 12, mulberry32(seed));
      expect(menu.length).toBeGreaterThan(0);
      expect(menu.length).toBeLessThanOrEqual(d.menuSize);
      expect(pantry.length).toBeLessThanOrEqual(12);
      for (const id of menu) for (const i of recipeIngredients(RECIPE_BY_ID[id])) expect(pantry).toContain(i);
    }
  });

  it("is deterministic for a seed", () => {
    const d = kitchenDifficultyFor(4);
    expect(buildMenu(d, ALL_INGREDIENTS, 12, mulberry32(9))).toEqual(buildMenu(d, ALL_INGREDIENTS, 12, mulberry32(9)));
  });
});

describe("orders", () => {
  const d = kitchenDifficultyFor(5);
  const ctx = { id: 1, time: 0, difficulty: d, menu: ["margherita", "pepperoni"] as const, pantry: ["classic", "thin", "tomato", "mozzarella", "basil", "pepperoni"] as const, mods: BASE_MODS };

  it("gives bigger orders more patience and rush orders less", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const o = makeOrder({ ...ctx, menu: [...ctx.menu], pantry: [...ctx.pantry] }, rng);
      const parts = recipeIngredients(o).length;
      const full = d.patienceBase + d.patiencePerItem * parts;
      expect(o.maxPatience).toBeCloseTo(o.rush ? full * 0.65 : full);
      expect(o.value).toBe(orderValue(o));
    }
  });

  it("swaps crusts only to doughs on the shelf", () => {
    const rng = mulberry32(11);
    const doughs = new Set<string>();
    for (let i = 0; i < 80; i++) doughs.add(makeOrder({ ...ctx, menu: [...ctx.menu], pantry: [...ctx.pantry] }, rng).dough);
    expect([...doughs].sort()).toEqual(["classic", "thin"]);
  });

  it("comfy chairs make customers wait longer", () => {
    const a = makeOrder({ ...ctx, menu: ["margherita"], pantry: ["classic"], difficulty: kitchenDifficultyFor(1) }, mulberry32(1));
    const b = makeOrder(
      { ...ctx, menu: ["margherita"], pantry: ["classic"], difficulty: kitchenDifficultyFor(1), mods: modsFor(["comfy-chairs"]) },
      mulberry32(1),
    );
    expect(b.maxPatience).toBeCloseTo(a.maxPatience * 1.2);
  });
});

describe("scoring", () => {
  const base = { value: 50, rush: false, correct: true, bake: "perfect" as const, patience: 1, combo: 0, tipMultiplier: 1 };

  it("pays value + perfect bake + tip", () => {
    expect(scoreServe(base)).toEqual({ points: 50 + SCORING.perfectBake + SCORING.maxTip, tip: SCORING.maxTip, comboMultiplier: 1 });
  });

  it("shrinks the tip as the customer waits", () => {
    expect(scoreServe({ ...base, patience: 0.5 }).tip).toBe(SCORING.maxTip / 2);
    expect(scoreServe({ ...base, patience: 0 }).tip).toBe(0);
  });

  it("multiplies by the combo, capped at x3", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(2);
    expect(comboMultiplier(99)).toBe(3);
    expect(scoreServe({ ...base, combo: 4 }).points).toBe((50 + SCORING.perfectBake + SCORING.maxTip) * 2);
  });

  it("pays rush orders more", () => {
    expect(scoreServe({ ...base, rush: true, bake: "good", patience: 0 }).points).toBe(75);
  });

  it("gives a quarter for the wrong pizza and no tip or combo", () => {
    expect(scoreServe({ ...base, correct: false, combo: 6 })).toEqual({ points: Math.round(50 * SCORING.wrongPizzaShare), tip: 0, comboMultiplier: 1 });
  });

  it("sets rising star targets and pays coins for them", () => {
    const t = starTargets(kitchenDifficultyFor(1), ["margherita", "pepperoni"]);
    expect(t[0]).toBeLessThan(t[1]);
    expect(t[1]).toBeLessThan(t[2]);
    expect(starsFor(t[1], t)).toBe(2);
    expect(starsFor(0, t)).toBe(0);
    expect(coinsFor(500, 2)).toBe(50 + 2 * SCORING.coinsPerStar);
  });

  it("keeps a great level-5 shift under the API's score cap", () => {
    const d = kitchenDifficultyFor(5);
    const best = Math.max(...availableRecipes(5, ALL_INGREDIENTS).map((r) => orderValue(r)));
    const perPizza = (best * SCORING.rushMultiplier + SCORING.perfectBake + SCORING.maxTip * 1.3) * comboMultiplier(99);
    const pizzas = d.shiftSeconds / 6;
    expect(perPizza * pizzas).toBeLessThan(20000);
  });
});
