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

export function speedFor(elapsedSeconds: number): number {
  return Math.min(MAX_SPEED, BASE_SPEED + elapsedSeconds * SPEED_RAMP);
}

/** Seconds between spawns; shrinks slightly as speed rises to keep density up. */
export function spawnIntervalFor(speed: number): number {
  return Math.max(0.55, 1.15 * (BASE_SPEED / speed));
}

export function clampLane(lane: number): number {
  return Math.max(0, Math.min(LANE_COUNT - 1, lane));
}

export type Rng = () => number;

export function pickSpawn(rng: Rng, lastLane: number): { kind: ItemKind; lane: number } {
  const r = rng();
  const kind: ItemKind = r < 0.55 ? "mailbox" : r < 0.8 ? "cone" : "puddle";
  // Bias away from spawning the same lane twice in a row so players must move.
  let lane = Math.floor(rng() * LANE_COUNT);
  if (lane === lastLane && rng() < 0.6) lane = (lane + 1 + Math.floor(rng() * (LANE_COUNT - 1))) % LANE_COUNT;
  return { kind, lane };
}
