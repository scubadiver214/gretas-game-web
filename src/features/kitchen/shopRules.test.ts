import { describe, expect, it } from "vitest";
import { STARTER_INGREDIENTS } from "./content/ingredients";
import { modsFor, unlockBlurb } from "./content/shop";
import { EMPTY_PROGRESS, creditShift, purchase, sanitizeProgress, unlockedIngredients } from "./shopRules";

describe("shop", () => {
  it("buys with enough coins and charges the catalog price", () => {
    const rich = { ...EMPTY_PROGRESS, coins: 500 };
    const r = purchase(rich, { kind: "ingredient", id: "pineapple" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.progress.coins).toBe(500 - 140);
      expect(unlockedIngredients(r.progress)).toContain("pineapple");
    }
  });

  it("refuses when broke or already owned", () => {
    expect(purchase(EMPTY_PROGRESS, { kind: "upgrade", id: "sneakers" })).toEqual({ ok: false, reason: "coins" });
    expect(purchase({ ...EMPTY_PROGRESS, coins: 999 }, { kind: "ingredient", id: "tomato" })).toEqual({ ok: false, reason: "owned" });
    const once = purchase({ ...EMPTY_PROGRESS, coins: 999 }, { kind: "upgrade", id: "tip-jar" });
    expect(once.ok && purchase(once.progress, { kind: "upgrade", id: "tip-jar" })).toEqual({ ok: false, reason: "owned" });
  });

  it("credits a shift", () => {
    const p = creditShift(EMPTY_PROGRESS, 42.7, 300);
    expect(p).toMatchObject({ coins: 42, shifts: 1, bestScore: 300 });
    expect(creditShift(p, 10, 100).bestScore).toBe(300);
  });

  it("always includes the starter pantry", () => {
    expect(unlockedIngredients(EMPTY_PROGRESS)).toEqual(expect.arrayContaining([...STARTER_INGREDIENTS]));
  });

  it("cleans up junk from old saves", () => {
    expect(sanitizeProgress({ coins: -5, ingredients: ["ham", "kale", "ham"], upgrades: ["sneakers", "jetpack"], shifts: "x" })).toEqual({
      coins: 0,
      ingredients: ["ham"],
      upgrades: ["sneakers"],
      shifts: 0,
      bestScore: 0,
    });
    expect(sanitizeProgress(null)).toEqual(EMPTY_PROGRESS);
  });

  it("explains what an ingredient unlocks", () => {
    expect(unlockBlurb("olive", STARTER_INGREDIENTS)).toMatch(/Marinara/);
    expect(unlockBlurb("pineapple", STARTER_INGREDIENTS)).toMatch(/Hawaiian also needs/);
  });

  it("turns upgrades into multipliers", () => {
    expect(modsFor([]).moveSpeed).toBe(1);
    expect(modsFor(["sneakers", "extra-oven"])).toMatchObject({ moveSpeed: 1.15, extraOven: true });
  });
});
