/**
 * Pure game rules for the Pizza Kitchen. No React, no three.js, so this file
 * is trivially unit-testable.
 */

export type ToppingId = "cheese" | "pepperoni" | "mushroom" | "olive" | "pepper" | "basil";

export interface ToppingInfo {
  id: ToppingId;
  label: string;
  emoji: string;
  color: string;
}

export const TOPPINGS: readonly ToppingInfo[] = [
  { id: "cheese", label: "Cheese", emoji: "🧀", color: "#FFD86B" },
  { id: "pepperoni", label: "Pepperoni", emoji: "🍕", color: "#C0392B" },
  { id: "mushroom", label: "Mushroom", emoji: "🍄", color: "#D7B899" },
  { id: "olive", label: "Olives", emoji: "🫒", color: "#2F3A2F" },
  { id: "pepper", label: "Peppers", emoji: "🫑", color: "#3FA34D" },
  { id: "basil", label: "Basil", emoji: "🌿", color: "#1E7F4F" },
] as const;

export const TOPPING_BY_ID: Record<ToppingId, ToppingInfo> = Object.fromEntries(
  TOPPINGS.map((t) => [t.id, t]),
) as Record<ToppingId, ToppingInfo>;

export interface Order {
  id: number;
  toppings: ToppingId[];
  /** Rush orders pay double but the customer is twice as impatient. */
  rush?: boolean;
  /** How long the customer waits for the toppings (0 = no timer). */
  patienceMs: number;
}

export const ORDER_COUNT = 3;
export const POINTS_CORRECT = 10;
export const POINTS_WRONG = -5;
export const POINTS_DUPLICATE = 0;
export const POINTS_PERFECT_BAKE = 25;
export const POINTS_OK_BAKE = 10;
/** Bonus for finishing the toppings with at least half the patience left. */
export const POINTS_SPEEDY = 5;
export const SPEEDY_THRESHOLD = 0.5;
export const RUSH_MULTIPLIER = 2;
export const BAKE_DURATION_MS = 4200;

/** Knobs that scale with the player's level. */
export interface KitchenDifficulty {
  level: number;
  orderCount: number;
  /** Toppings on the first order; each following order adds one (capped). */
  minToppings: number;
  maxToppings: number;
  /** Faster bake meter at higher levels = smaller perfect window in real time. */
  bakeDurationMs: number;
  /** Base customer patience for the topping step; 0 disables the timer (level 1). */
  patienceMs: number;
  /** Extra patience granted per topping on the order, so big orders stay fair. */
  patiencePerToppingMs: number;
  /** Number of rush orders in the round. */
  rushOrders: number;
}

export function kitchenDifficultyFor(level: number): KitchenDifficulty {
  const l = Math.max(1, Math.min(5, Math.floor(level)));
  return {
    level: l,
    orderCount: Math.min(5, ORDER_COUNT + Math.max(0, l - 1)),
    minToppings: l >= 4 ? 3 : 2,
    maxToppings: Math.min(TOPPINGS.length, 3 + l),
    bakeDurationMs: Math.max(3000, BAKE_DURATION_MS - (l - 1) * 300),
    patienceMs: l === 1 ? 0 : 12000 - (l - 2) * 1500,
    patiencePerToppingMs: l === 1 ? 0 : 2000,
    rushOrders: l >= 3 ? 1 : 0,
  };
}

/** Bake meter zones as fractions of BAKE_DURATION_MS. */
export const BAKE_ZONES = {
  okStart: 0.46,
  perfectStart: 0.62,
  perfectEnd: 0.8,
  okEnd: 0.9,
} as const;

export type Rng = () => number;

function pickDistinct<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/**
 * Orders ramp up within a round (level 1: 2, 3, 4 toppings; higher levels add
 * orders and toppings). Cheese is always first when present.
 */
export function generateOrders(difficulty: KitchenDifficulty = kitchenDifficultyFor(1), rng: Rng = Math.random): Order[] {
  const orders: Order[] = Array.from({ length: difficulty.orderCount }, (_, i) => {
    const size = Math.min(difficulty.minToppings + i, difficulty.maxToppings, TOPPINGS.length);
    const picked = pickDistinct(
      TOPPINGS.map((t) => t.id),
      size,
      rng,
    );
    picked.sort((a, b) => (a === "cheese" ? -1 : b === "cheese" ? 1 : 0));
    const patienceMs =
      difficulty.patienceMs > 0 ? difficulty.patienceMs + picked.length * difficulty.patiencePerToppingMs : 0;
    return { id: i + 1, toppings: picked, patienceMs };
  });
  // Rush orders never land on the very first order so players can warm up.
  const candidates = orders.slice(1);
  for (let r = 0; r < difficulty.rushOrders && candidates.length; r++) {
    const pick = candidates.splice(Math.floor(rng() * candidates.length), 1)[0];
    pick.rush = true;
    pick.patienceMs = Math.round(pick.patienceMs * 0.7);
  }
  return orders;
}

/** Points multiplier for an order (rush orders pay double). */
export function orderMultiplier(order: Order): number {
  return order.rush ? RUSH_MULTIPLIER : 1;
}

export type ToppingOutcome = "correct" | "wrong" | "duplicate";

export function scoreTopping(
  order: Order,
  placed: readonly ToppingId[],
  topping: ToppingId,
): { delta: number; outcome: ToppingOutcome } {
  if (placed.includes(topping)) return { delta: POINTS_DUPLICATE, outcome: "duplicate" };
  if (order.toppings.includes(topping)) return { delta: POINTS_CORRECT * orderMultiplier(order), outcome: "correct" };
  return { delta: POINTS_WRONG, outcome: "wrong" };
}

/**
 * Bonus for finishing the toppings quickly. `remaining` is the fraction of the
 * customer's patience left (0..1); orders without a timer never get it.
 */
export function speedyBonus(order: Order, remaining: number): number {
  if (order.patienceMs <= 0) return 0;
  return remaining >= SPEEDY_THRESHOLD ? POINTS_SPEEDY * orderMultiplier(order) : 0;
}

export function isOrderComplete(order: Order, placed: readonly ToppingId[]): boolean {
  return order.toppings.every((t) => placed.includes(t));
}

export function missingToppings(order: Order, placed: readonly ToppingId[]): ToppingId[] {
  return order.toppings.filter((t) => !placed.includes(t));
}

export type BakeOutcome = "raw" | "ok" | "perfect" | "burnt";

export function scoreBake(progress: number, order?: Order): { delta: number; outcome: BakeOutcome } {
  const mult = order ? orderMultiplier(order) : 1;
  if (progress >= 1) return { delta: 0, outcome: "burnt" };
  if (progress >= BAKE_ZONES.perfectStart && progress <= BAKE_ZONES.perfectEnd) {
    return { delta: POINTS_PERFECT_BAKE * mult, outcome: "perfect" };
  }
  if (progress >= BAKE_ZONES.okStart && progress <= BAKE_ZONES.okEnd) {
    return { delta: POINTS_OK_BAKE * mult, outcome: "ok" };
  }
  if (progress < BAKE_ZONES.okStart) return { delta: 0, outcome: "raw" };
  return { delta: 0, outcome: "burnt" };
}

/** Best possible score for a set of orders (used for the results screen and star rating). */
export function maxScore(orders: readonly Order[]): number {
  return orders.reduce((sum, o) => {
    const speedy = o.patienceMs > 0 ? POINTS_SPEEDY : 0;
    return sum + (o.toppings.length * POINTS_CORRECT + POINTS_PERFECT_BAKE + speedy) * orderMultiplier(o);
  }, 0);
}

/** 0-3 stars for a kitchen round, from the share of the best possible score. */
export function kitchenStars(score: number, orders: readonly Order[]): number {
  const max = maxScore(orders);
  if (max <= 0) return 0;
  const ratio = score / max;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.45) return 1;
  return 0;
}
