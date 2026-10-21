import { BAKE, MAX_TOPPINGS } from "../config";
import { INGREDIENT_BY_ID, type IngredientId } from "../content/ingredients";
import type { BakeQuality, PizzaItem, RejectReason } from "./types";

/** The parts of a pizza (or an order) that have to match. */
export interface PizzaParts {
  dough: IngredientId;
  sauce: IngredientId | null;
  cheese: IngredientId | null;
  toppings: readonly IngredientId[];
}

export function bakeQuality(bake: number): BakeQuality {
  if (bake < BAKE.cooked) return "raw";
  if (bake < BAKE.perfectEnd) return "perfect";
  if (bake < BAKE.burnt) return "good";
  return "burnt";
}

export function components(p: PizzaParts): IngredientId[] {
  return [p.dough, ...(p.sauce ? [p.sauce] : []), ...(p.cheese ? [p.cheese] : []), ...p.toppings];
}

/** True if the pizza could still become this order by adding things (nothing wrong on it yet). */
export function isCompatible(pizza: PizzaParts, order: PizzaParts): boolean {
  if (pizza.dough !== order.dough) return false;
  if (pizza.sauce && pizza.sauce !== order.sauce) return false;
  if (pizza.cheese && pizza.cheese !== order.cheese) return false;
  return pizza.toppings.every((t) => order.toppings.includes(t));
}

export function matchesExactly(pizza: PizzaParts, order: PizzaParts): boolean {
  return (
    pizza.dough === order.dough &&
    pizza.sauce === order.sauce &&
    pizza.cheese === order.cheese &&
    pizza.toppings.length === order.toppings.length &&
    pizza.toppings.every((t) => order.toppings.includes(t))
  );
}

/** Differences between a pizza and an order. */
export function diff(pizza: PizzaParts, order: PizzaParts): { missing: IngredientId[]; extra: IngredientId[] } {
  const have = components(pizza);
  const want = components(order);
  return {
    missing: want.filter((i) => !have.includes(i)),
    extra: have.filter((i) => !want.includes(i)),
  };
}

function closeness(pizza: PizzaParts, order: PizzaParts): number {
  const { missing, extra } = diff(pizza, order);
  const matched = components(order).length - missing.length;
  return matched * 2 - extra.length * 3 - missing.length;
}

/**
 * The order a pizza is closest to: an exact match if there is one (oldest
 * first, like a real ticket rail), otherwise the most similar ticket, with
 * ties going to the customer closest to walking out.
 */
export function bestOrderFor<O extends PizzaParts & { patience?: number }>(pizza: PizzaParts, orders: readonly O[]): O | null {
  if (orders.length === 0) return null;
  const exact = orders.find((o) => matchesExactly(pizza, o));
  if (exact) return exact;
  let best: O | null = null;
  let bestScore = -Infinity;
  for (const o of orders) {
    const s = closeness(pizza, o);
    if (s > bestScore || (s === bestScore && best && (o.patience ?? 0) < (best.patience ?? 0))) {
      best = o;
      bestScore = s;
    }
  }
  return best;
}

/**
 * Components on the pizza that no ticket wants, judged against the closest
 * ticket. Empty when the pizza is still on track for at least one order (or
 * when there are no orders to judge against).
 */
export function wrongComponents(pizza: PizzaParts, orders: readonly PizzaParts[]): IngredientId[] {
  if (orders.length === 0 || orders.some((o) => isCompatible(pizza, o))) return [];
  const best = bestOrderFor(pizza, orders);
  return best ? diff(pizza, best).extra : [];
}

function withIngredient(p: PizzaParts, id: IngredientId): PizzaParts {
  const cat = INGREDIENT_BY_ID[id].category;
  if (cat === "sauce") return { ...p, sauce: id };
  if (cat === "cheese") return { ...p, cheese: id };
  if (cat === "dough") return { ...p, dough: id };
  return { ...p, toppings: [...p.toppings, id] };
}

function withoutIngredients(p: PizzaParts, ids: readonly IngredientId[]): PizzaParts {
  return {
    dough: p.dough,
    sauce: p.sauce && ids.includes(p.sauce) ? null : p.sauce,
    cheese: p.cheese && ids.includes(p.cheese) ? null : p.cheese,
    toppings: p.toppings.filter((t) => !ids.includes(t)),
  };
}

/**
 * Would adding this ingredient keep the pizza on track for some order?
 * Mistakes already on the pizza are ignored so each addition is judged on
 * its own (one wrong topping doesn't turn every later one red).
 */
export function isWanted(pizza: PizzaParts, id: IngredientId, orders: readonly PizzaParts[]): boolean {
  if (orders.length === 0) return true;
  const clean = withoutIngredients(pizza, wrongComponents(pizza, orders).filter((w) => w !== pizza.dough));
  const next = withIngredient(clean, id);
  return orders.some((o) => isCompatible(next, o));
}

/** True if some ticket uses this crust. */
export function isDoughWanted(dough: IngredientId, orders: readonly PizzaParts[]): boolean {
  return orders.length === 0 || orders.some((o) => o.dough === dough);
}

/** True if some ticket uses this ingredient at all. */
export function isIngredientWanted(id: IngredientId, orders: readonly PizzaParts[]): boolean {
  return orders.length === 0 || orders.some((o) => components(o).includes(id));
}

/** Why an ingredient can't go on this pizza right now, or null if it can. */
export function addRejection(pizza: PizzaItem, id: IngredientId, prepped: boolean): RejectReason | null {
  const def = INGREDIENT_BY_ID[id];
  if (!prepped && def.prep !== "none") return "needsPrep";
  if (pizza.sliced || pizza.bake > 0) return "baked";
  if (def.category === "dough") return "cantPlace";
  if (def.category === "sauce" && pizza.sauce) return pizza.sauce === id ? "duplicate" : "hasSauce";
  if (def.category === "cheese" && pizza.cheese) return pizza.cheese === id ? "duplicate" : "hasCheese";
  if (def.category === "topping") {
    if (pizza.toppings.includes(id)) return "duplicate";
    if (pizza.toppings.length >= MAX_TOPPINGS) return "tooMany";
  }
  return null;
}

export function addIngredient(pizza: PizzaItem, id: IngredientId): void {
  const cat = INGREDIENT_BY_ID[id].category;
  if (cat === "sauce") pizza.sauce = id;
  else if (cat === "cheese") pizza.cheese = id;
  else if (cat === "topping") pizza.toppings.push(id);
}

export function newPizza(uid: number, dough: IngredientId): PizzaItem {
  return { uid, kind: "pizza", dough, sauce: null, cheese: null, toppings: [], bake: 0, sliced: false, work: 0 };
}
