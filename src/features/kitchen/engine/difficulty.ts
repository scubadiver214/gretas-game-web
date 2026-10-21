import type { KitchenDifficulty } from "./types";

/**
 * One row per level (1 Rookie .. 5 Legend). Higher levels run longer shifts
 * with a bigger menu, more tickets at once, quicker customers, rush orders
 * and crust swaps.
 *
 * Patience is how long a customer waits. A four-ingredient pizza is about
 * patienceBase + 4 * patiencePerItem seconds — enough to walk it through
 * the stations, but not so much that tickets sit untouched.
 */
const TABLE: Omit<KitchenDifficulty, "level">[] = [
  { shiftSeconds: 150, menuSize: 2, maxTickets: 3, orderInterval: 18, rushDepth: 0.34, patienceBase: 76, patiencePerItem: 8.5, rushOrderChance: 0, crustSwapChance: 0, bakeSeconds: 8 },
  { shiftSeconds: 165, menuSize: 3, maxTickets: 3, orderInterval: 16, rushDepth: 0.4, patienceBase: 68, patiencePerItem: 7.5, rushOrderChance: 0.1, crustSwapChance: 0, bakeSeconds: 7.5 },
  { shiftSeconds: 180, menuSize: 3, maxTickets: 4, orderInterval: 14.5, rushDepth: 0.45, patienceBase: 60, patiencePerItem: 6.5, rushOrderChance: 0.15, crustSwapChance: 0.25, bakeSeconds: 7 },
  { shiftSeconds: 180, menuSize: 4, maxTickets: 4, orderInterval: 13, rushDepth: 0.5, patienceBase: 54, patiencePerItem: 6, rushOrderChance: 0.2, crustSwapChance: 0.3, bakeSeconds: 6.5 },
  { shiftSeconds: 195, menuSize: 5, maxTickets: 5, orderInterval: 12, rushDepth: 0.55, patienceBase: 48, patiencePerItem: 5, rushOrderChance: 0.25, crustSwapChance: 0.35, bakeSeconds: 6 },
];

export function kitchenDifficultyFor(level: number): KitchenDifficulty {
  const l = Math.max(1, Math.min(TABLE.length, Math.floor(level) || 1));
  return { level: l, ...TABLE[l - 1] };
}

/**
 * Lunch-rush intensity over the shift, 0..1: quiet at opening, peaking a
 * little after the middle (about 12:40 on the shift clock), easing off at the end.
 */
export function rushCurve(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  const peak = 0.55;
  const width = 0.24;
  return Math.exp(-((p - peak) ** 2) / (2 * width * width));
}

/** Seconds until the next ticket at this point of the shift. */
export function orderIntervalAt(d: KitchenDifficulty, time: number): number {
  return d.orderInterval * (1 - d.rushDepth * rushCurve(time / d.shiftSeconds));
}

/** The rush counts as "on" (HUD banner, music cue) above this intensity. */
export const RUSH_ON = 0.6;
