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
export const SPEED_RAMP = 0.11; // per second elapsed

export type ItemKind = "mailbox" | "cone" | "puddle";

/** Knobs that scale with the player's level. */
export interface DeliveryDifficulty {
  level: number;
  baseSpeed: number;
  maxSpeed: number;
  /** Seconds between spawns at base speed. */
  spawnBase: number;
  /** Share of spawns that are mailboxes (the rest are obstacles). */
  mailboxShare: number;
}

export function deliveryDifficultyFor(level: number): DeliveryDifficulty {
  const l = Math.max(1, Math.min(5, Math.floor(level)));
  return {
    level: l,
    baseSpeed: BASE_SPEED + (l - 1) * 1.1,
    maxSpeed: MAX_SPEED + (l - 1) * 1.6,
    spawnBase: Math.max(0.7, 1.15 - (l - 1) * 0.09),
    mailboxShare: Math.max(0.4, 0.55 - (l - 1) * 0.035),
  };
}

const LEVEL_1 = deliveryDifficultyFor(1);

export interface ScoreState {
  score: number;
  combo: number;
}

export function applyDelivery(s: ScoreState): ScoreState & { bonus: boolean } {
  const combo = s.combo + 1;
  const bonus = combo % COMBO_EVERY === 0;
  return { score: s.score + POINTS_DELIVERY + (bonus ? POINTS_COMBO : 0), combo, bonus };
}

export function applyObstacle(s: ScoreState): ScoreState {
  return { score: Math.max(0, s.score + POINTS_OBSTACLE), combo: 0 };
}

export function speedFor(elapsedSeconds: number, d: DeliveryDifficulty = LEVEL_1): number {
  return Math.min(d.maxSpeed, d.baseSpeed + elapsedSeconds * SPEED_RAMP);
}

/** Seconds between spawns; shrinks slightly as speed rises to keep density up. */
export function spawnIntervalFor(speed: number, d: DeliveryDifficulty = LEVEL_1): number {
  return Math.max(0.55, d.spawnBase * (d.baseSpeed / speed));
}

export function clampLane(lane: number): number {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane));
}

export type Rng = () => number;

export function pickSpawn(rng: Rng, lastLane: number, d: DeliveryDifficulty = LEVEL_1): { kind: ItemKind; lane: number } {
  const r = rng();
  const obstacleShare = 1 - d.mailboxShare;
  const kind: ItemKind = r < d.mailboxShare ? "mailbox" : r < d.mailboxShare + obstacleShare * 0.55 ? "cone" : "puddle";
  // Bias away from spawning the same lane twice in a row so players must move.
  let lane = Math.floor(rng() * LANE_COUNT);
  if (lane === lastLane && rng() < 0.6) lane = (lane + 1 + Math.floor(rng() * (LANE_COUNT - 1))) % LANE_COUNT;
  return { kind, lane };
}
