/**
 * Pure rules for the Bike Delivery lane-runner.
 */

export const ROUND_SECONDS = 60;
export const LANE_X: readonly number[] = [-2.2, 0, 2.2];
export const LANE_COUNT = LANE_X.length;

export const POINTS_DELIVERY = 20;
export const POINTS_OBSTACLE = -10;
export const COMBO_EVERY = 3;
export const POINTS_COMBO = 15;

export const BASE_SPEED = 9; // world units per second
export const MAX_SPEED = 16;
/** Per second elapsed. Reaches top speed about 25s into a 60s ride. */
export const SPEED_RAMP = 0.28;
/** Extra speed of an oncoming car, on top of the bike's own pace. */
export const CAR_SPEED = 8;

/** Bike hop: total airtime and peak height (world units). */
export const JUMP_SECONDS = 0.7;
export const JUMP_HEIGHT = 1.15;
/** Above this height the bike clears ground obstacles (and misses mailboxes). */
export const CLEAR_HEIGHT = 0.35;

export type ItemKind = "mailbox" | "cone" | "puddle" | "barrier" | "star" | "car";
export type PowerUpKind = "magnet" | "shield" | "turbo";

export const POWER_UP_SECONDS: Record<PowerUpKind, number> = { magnet: 9, shield: 0, turbo: 6 };
export const TURBO_SPEED_MULTIPLIER = 1.35;
export const TURBO_POINTS_MULTIPLIER = 2;

export const POWER_UP_LABELS: Record<PowerUpKind, string> = {
  magnet: "Magnet! Pizzas fly to you",
  shield: "Shield! One free bump",
  turbo: "Turbo! Double points",
};

/** Knobs that scale with the player's level. */
export interface DeliveryDifficulty {
  level: number;
  baseSpeed: number;
  maxSpeed: number;
  /** Seconds between spawns at base speed. */
  spawnBase: number;
  /** Share of spawns that are mailboxes (the rest are obstacles / power-ups). */
  mailboxShare: number;
  /** Share of spawns that are power-up stars. */
  starShare: number;
  /** Share of *obstacles* that are barriers (must be jumped). 0 at level 1. */
  barrierShare: number;
}

export function deliveryDifficultyFor(level: number): DeliveryDifficulty {
  const l = Math.max(1, Math.min(5, Math.floor(level)));
  return {
    level: l,
    baseSpeed: BASE_SPEED + (l - 1) * 1.1,
    maxSpeed: MAX_SPEED + (l - 1) * 1.6,
    spawnBase: Math.max(0.7, 1.15 - (l - 1) * 0.09),
    mailboxShare: Math.max(0.4, 0.55 - (l - 1) * 0.035),
    starShare: 0.05,
    barrierShare: l === 1 ? 0 : Math.min(0.4, 0.18 + (l - 2) * 0.07),
  };
}

const LEVEL_1 = deliveryDifficultyFor(1);

export interface ScoreState {
  score: number;
  combo: number;
}

export function applyDelivery(s: ScoreState, multiplier = 1): ScoreState & { bonus: boolean; gained: number } {
  const combo = s.combo + 1;
  const bonus = combo % COMBO_EVERY === 0;
  const gained = (POINTS_DELIVERY + (bonus ? POINTS_COMBO : 0)) * multiplier;
  return { score: s.score + gained, combo, bonus, gained };
}

export function applyObstacle(s: ScoreState): ScoreState {
  return { score: Math.max(0, s.score + POINTS_OBSTACLE), combo: 0 };
}

export function speedFor(elapsedSeconds: number, d: DeliveryDifficulty = LEVEL_1, turbo = false): number {
  const base = Math.min(d.maxSpeed, d.baseSpeed + elapsedSeconds * SPEED_RAMP);
  return turbo ? base * TURBO_SPEED_MULTIPLIER : base;
}

/** Seconds between spawns; shrinks slightly as speed rises to keep density up. */
export function spawnIntervalFor(speed: number, d: DeliveryDifficulty = LEVEL_1): number {
  return Math.max(0.55, d.spawnBase * (d.baseSpeed / speed));
}

/**
 * Random wait before the next oncoming car. Higher levels leave a shorter gap,
 * and each call rolls somewhere between the short and long end of that gap.
 */
export function carIntervalFor(rng: Rng, d: DeliveryDifficulty = LEVEL_1): number {
  const min = Math.max(1.5, 2.6 - (d.level - 1) * 0.22);
  const span = Math.max(1.2, 2.6 - (d.level - 1) * 0.2);
  return min + rng() * span;
}

/** Lane for the next oncoming car. */
export function pickCarLane(rng: Rng): number {
  return Math.floor(rng() * LANE_COUNT);
}

export function clampLane(lane: number): number {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane));
}

/** Height of the bike `t` seconds into a jump (0 when not jumping). */
export function jumpHeight(t: number): number {
  if (t < 0 || t >= JUMP_SECONDS) return 0;
  const u = t / JUMP_SECONDS;
  return 4 * JUMP_HEIGHT * u * (1 - u);
}

export type Rng = () => number;

export interface Spawn {
  kind: ItemKind;
  lane: number;
  /** Set when kind === "star". */
  powerUp?: PowerUpKind;
}

const POWER_UPS: readonly PowerUpKind[] = ["magnet", "shield", "turbo"];

export function pickSpawn(rng: Rng, lastLane: number, d: DeliveryDifficulty = LEVEL_1): Spawn {
  const r = rng();
  let kind: ItemKind;
  let powerUp: PowerUpKind | undefined;
  if (r < d.mailboxShare) {
    kind = "mailbox";
  } else if (r < d.mailboxShare + d.starShare) {
    kind = "star";
    powerUp = POWER_UPS[Math.floor(rng() * POWER_UPS.length)];
  } else {
    const o = rng();
    kind = o < d.barrierShare ? "barrier" : o < d.barrierShare + (1 - d.barrierShare) * 0.55 ? "cone" : "puddle";
  }
  // Bias away from spawning the same lane twice in a row so players must move.
  let lane = Math.floor(rng() * LANE_COUNT);
  if (lane === lastLane && rng() < 0.6) lane = (lane + 1 + Math.floor(rng() * (LANE_COUNT - 1))) % LANE_COUNT;
  return powerUp ? { kind, lane, powerUp } : { kind, lane };
}

/** Target score for a "solid" round at a level; stars are measured against it. */
export function deliveryPar(level: number): number {
  const l = Math.max(1, Math.min(5, Math.floor(level)));
  return 220 + (l - 1) * 90;
}

/** 0-3 stars for a delivery round. */
export function deliveryStars(score: number, level: number): number {
  const par = deliveryPar(level);
  if (score >= par * 1.4) return 3;
  if (score >= par) return 2;
  if (score >= par * 0.55) return 1;
  return 0;
}
