import { SCORING, STAR_SHARES } from "../config";
import { INGREDIENT_BY_ID } from "../content/ingredients";
import { RECIPE_BY_ID, type RecipeId } from "../content/recipes";
import { components, type PizzaParts } from "./pizza";
import type { BakeQuality, KitchenDifficulty } from "./types";

/** Points a correct pizza is worth before bake bonus, tip and combo. */
export function orderValue(parts: PizzaParts): number {
  return SCORING.orderBase + components(parts).reduce((sum, id) => sum + INGREDIENT_BY_ID[id].value, 0);
}

/** x1 for the first pizza in a streak, +0.25 per pizza after, capped at x3. */
export function comboMultiplier(combo: number): number {
  return 1 + SCORING.comboStep * Math.min(Math.max(0, combo), SCORING.comboCap);
}

export interface ServeScoreInput {
  value: number;
  rush: boolean;
  correct: boolean;
  bake: BakeQuality;
  /** Patience left, 0..1. */
  patience: number;
  /** Streak before this pizza. */
  combo: number;
  tipMultiplier: number;
}

export interface ServeScore {
  points: number;
  tip: number;
  comboMultiplier: number;
}

/**
 * A correct pizza pays its value (x1.5 for rush orders), +15 for a perfect
 * bake and a tip that shrinks as the customer waits, all multiplied by the
 * combo. The wrong pizza still earns a quarter of the value, no tip, no combo.
 */
export function scoreServe(input: ServeScoreInput): ServeScore {
  if (!input.correct) {
    return { points: Math.round(input.value * SCORING.wrongPizzaShare), tip: 0, comboMultiplier: 1 };
  }
  const base = input.value * (input.rush ? SCORING.rushMultiplier : 1);
  const bakeBonus = input.bake === "perfect" ? SCORING.perfectBake : 0;
  const tip = Math.round(SCORING.maxTip * Math.max(0, Math.min(1, input.patience)) * input.tipMultiplier);
  const mult = comboMultiplier(input.combo);
  return { points: Math.round((base + bakeBonus + tip) * mult), tip, comboMultiplier: mult };
}

/** Seconds a steady two-chef kitchen needs per pizza; sets the par score. */
const PAR_SECONDS_PER_PIZZA = 26;
/** Typical combo multiplier across a decent shift. */
const PAR_COMBO = 1.5;

/**
 * Score targets for 1-3 stars, from what a solid shift on today's menu
 * should earn. Rounded to tens so they read nicely on the HUD.
 */
export function starTargets(d: KitchenDifficulty, menu: readonly RecipeId[]): [number, number, number] {
  const values = menu.map((id) => orderValue(RECIPE_BY_ID[id]));
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : orderValue(RECIPE_BY_ID.margherita);
  const pizzas = Math.min(d.shiftSeconds / PAR_SECONDS_PER_PIZZA, (d.shiftSeconds / d.orderInterval) * 1.25 + d.maxTickets);
  const perPizza = (avg + SCORING.perfectBake + SCORING.maxTip * 0.5) * PAR_COMBO;
  const par = pizzas * perPizza;
  const round10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);
  return [round10(par * STAR_SHARES[0]), round10(par * STAR_SHARES[1]), round10(par * STAR_SHARES[2])];
}

export function starsFor(score: number, targets: readonly number[]): number {
  return targets.filter((t) => score >= t).length;
}

/** Coins for the shop: a tenth of the score plus a bonus per star. */
export function coinsFor(score: number, stars: number): number {
  return Math.max(0, Math.floor(score * SCORING.coinsPerPoint)) + stars * SCORING.coinsPerStar;
}
