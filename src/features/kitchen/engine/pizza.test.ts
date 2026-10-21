import { describe, expect, it } from "vitest";
import { BAKE } from "../config";
import {
  addRejection,
  bakeQuality,
  bestOrderFor,
  diff,
  isCompatible,
  isWanted,
  matchesExactly,
  newPizza,
  wrongComponents,
  type PizzaParts,
} from "./pizza";

const margherita: PizzaParts = { dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["basil"] };
const pepperoni: PizzaParts = { dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["pepperoni"] };
const marinara: PizzaParts = { dough: "classic", sauce: "tomato", cheese: null, toppings: ["basil", "olive"] };

describe("bakeQuality", () => {
  it("goes raw -> perfect -> good -> burnt", () => {
    expect(bakeQuality(0.5)).toBe("raw");
    expect(bakeQuality(BAKE.cooked)).toBe("perfect");
    expect(bakeQuality(BAKE.perfectEnd)).toBe("good");
    expect(bakeQuality(BAKE.burnt)).toBe("burnt");
  });
});

describe("matching", () => {
  it("is compatible while everything on the pizza is wanted", () => {
    expect(isCompatible({ dough: "classic", sauce: "tomato", cheese: null, toppings: [] }, margherita)).toBe(true);
    expect(isCompatible({ dough: "classic", sauce: "tomato", cheese: null, toppings: ["olive"] }, margherita)).toBe(false);
    expect(isCompatible({ dough: "thin", sauce: null, cheese: null, toppings: [] }, margherita)).toBe(false);
  });

  it("needs every part for an exact match, in any topping order", () => {
    expect(matchesExactly(margherita, margherita)).toBe(true);
    expect(matchesExactly({ ...margherita, toppings: [] }, margherita)).toBe(false);
    const veggie: PizzaParts = { dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["mushroom", "olive"] };
    expect(matchesExactly({ ...veggie, toppings: ["olive", "mushroom"] }, veggie)).toBe(true);
  });

  it("treats 'no cheese' as part of the order", () => {
    expect(matchesExactly({ ...marinara, cheese: "mozzarella" }, marinara)).toBe(false);
    expect(diff({ ...marinara, cheese: "mozzarella" }, marinara)).toEqual({ missing: [], extra: ["mozzarella"] });
  });

  it("serves an exact match first, otherwise the closest ticket", () => {
    const orders = [
      { ...pepperoni, patience: 30 },
      { ...margherita, patience: 20 },
    ];
    expect(bestOrderFor(margherita, orders)).toBe(orders[1]);
    expect(bestOrderFor({ ...margherita, toppings: ["basil", "olive"] }, orders)).toBe(orders[1]);
  });
});

describe("topping feedback", () => {
  const orders = [margherita, pepperoni];

  it("marks only what no ticket wants", () => {
    expect(wrongComponents({ dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: [] }, orders)).toEqual([]);
    expect(wrongComponents({ ...margherita, toppings: ["basil", "mushroom"] }, orders)).toEqual(["mushroom"]);
  });

  it("judges each addition on its own after a mistake", () => {
    const oops: PizzaParts = { dough: "classic", sauce: "tomato", cheese: null, toppings: ["mushroom"] };
    expect(isWanted(oops, "mozzarella", orders)).toBe(true);
    expect(isWanted(oops, "olive", orders)).toBe(false);
  });

  it("knows which sauce is wanted", () => {
    const base: PizzaParts = { dough: "classic", sauce: null, cheese: null, toppings: [] };
    expect(isWanted(base, "tomato", orders)).toBe(true);
    expect(isWanted(base, "pesto", orders)).toBe(false);
  });
});

describe("addRejection", () => {
  it("wants prep first, one sauce, one cheese and no repeats", () => {
    const p = newPizza(1, "classic");
    expect(addRejection(p, "mushroom", false)).toBe("needsPrep");
    expect(addRejection(p, "basil", true)).toBeNull();
    p.sauce = "tomato";
    p.cheese = "mozzarella";
    p.toppings.push("basil");
    expect(addRejection(p, "pesto", true)).toBe("hasSauce");
    expect(addRejection(p, "cheddar", true)).toBe("hasCheese");
    expect(addRejection(p, "basil", true)).toBe("duplicate");
  });

  it("locks the pizza once it has been in the oven", () => {
    const p = newPizza(1, "classic");
    p.bake = 0.2;
    expect(addRejection(p, "basil", true)).toBe("baked");
  });
});
