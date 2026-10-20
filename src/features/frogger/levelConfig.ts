import type { LaneKind, VehicleKind } from "./types";

/** Level-independent shape of one lane; levels scale it. */
export interface LaneBlueprint {
  row: number;
  kind: LaneKind;
  vehicle?: VehicleKind;
  dir: 1 | -1;
  /** Base speed in tiles per second at level 1. */
  speed: number;
  /** Entities per loop at level 1. */
  count: number;
  /** Entity length in tiles (turtle groups: turtles per group). */
  length: number;
  /** Road lanes that gain a vehicle when the level adds traffic. */
  getsExtraTraffic?: "level2" | "level3";
}

/** Bottom (road) to top (river), classic Frogger lane order. */
export const LANE_BLUEPRINTS: readonly LaneBlueprint[] = [
  { row: 11, kind: "road", vehicle: "car", dir: -1, speed: 1.2, count: 3, length: 1, getsExtraTraffic: "level2" },
  { row: 10, kind: "road", vehicle: "bulldozer", dir: 1, speed: 0.9, count: 3, length: 1, getsExtraTraffic: "level2" },
  { row: 9, kind: "road", vehicle: "car", dir: -1, speed: 1.5, count: 3, length: 1, getsExtraTraffic: "level2" },
  { row: 8, kind: "road", vehicle: "racer", dir: 1, speed: 2.6, count: 1, length: 1, getsExtraTraffic: "level3" },
  { row: 7, kind: "road", vehicle: "truck", dir: -1, speed: 1.1, count: 2, length: 2, getsExtraTraffic: "level3" },
  { row: 5, kind: "turtle", dir: -1, speed: 1.2, count: 4, length: 3 },
  { row: 4, kind: "log", dir: 1, speed: 1.0, count: 3, length: 4 },
  { row: 3, kind: "log", dir: 1, speed: 1.9, count: 2, length: 6 },
  { row: 2, kind: "turtle", dir: -1, speed: 1.4, count: 4, length: 2 },
  { row: 1, kind: "log", dir: 1, speed: 1.3, count: 3, length: 5 },
];

export interface LevelDef {
  level: number;
  speedMul: number;
  /** Seconds each frog gets to reach home. */
  timerSeconds: number;
  /** Added to every log length (negative shortens), never below MIN_LOG_LENGTH. */
  logLengthDelta: number;
  /** Extra vehicles per road lane that qualifies. */
  extraTraffic: { level2: number; level3: number };
  /** How many turtle groups dive, spread across the turtle lanes. */
  divingGroups: number;
  /** Seconds per full turtle surface/dive cycle. */
  diveCycle: number;
}

export const MIN_LOG_LENGTH = 2;
export const MAX_SPEED_MUL = 2.0;
export const MIN_TIMER_SECONDS = 30;
export const MIN_DIVE_CYCLE = 4.5;

/** Level 1 is gentle; 2 and 3 are hand-tuned; 4+ scale with caps so the game stays playable. */
export function levelDef(level: number): LevelDef {
  const n = Math.max(1, Math.floor(level));
  if (n === 1) {
    return { level: 1, speedMul: 1, timerSeconds: 60, logLengthDelta: 0, extraTraffic: { level2: 0, level3: 0 }, divingGroups: 1, diveCycle: 9 };
  }
  if (n === 2) {
    return { level: 2, speedMul: 1.2, timerSeconds: 55, logLengthDelta: 0, extraTraffic: { level2: 1, level3: 0 }, divingGroups: 2, diveCycle: 7 };
  }
  if (n === 3) {
    return { level: 3, speedMul: 1.4, timerSeconds: 50, logLengthDelta: -1, extraTraffic: { level2: 1, level3: 1 }, divingGroups: 3, diveCycle: 6 };
  }
  const k = n - 3;
  return {
    level: n,
    speedMul: Math.min(MAX_SPEED_MUL, 1.4 + 0.12 * k),
    timerSeconds: Math.max(MIN_TIMER_SECONDS, 50 - 3 * k),
    logLengthDelta: -1 - Math.floor(k / 2),
    extraTraffic: { level2: 1, level3: 1 },
    divingGroups: Math.min(6, 3 + Math.floor((k + 1) / 2)),
    diveCycle: Math.max(MIN_DIVE_CYCLE, 6 - 0.3 * k),
  };
}
