import { ASSIST } from "../config";
import type { DifficultyVars } from "./types";

/**
 * The difficulty curve for levels 1-50 and the adaptive assist. Everything is
 * interpolated between the keyframes below, so a change here moves the whole
 * curve smoothly rather than creating a spike.
 */

export const MAX_LEVEL = 50;

export interface Tier {
  id: "veryEasy" | "easy" | "medium" | "challenging" | "advanced" | "expert";
  label: string;
  from: number;
  to: number;
}

export const TIERS: readonly Tier[] = [
  { id: "veryEasy", label: "Very easy", from: 1, to: 5 },
  { id: "easy", label: "Easy", from: 6, to: 10 },
  { id: "medium", label: "Medium", from: 11, to: 20 },
  { id: "challenging", label: "Challenging", from: 21, to: 30 },
  { id: "advanced", label: "Advanced", from: 31, to: 40 },
  { id: "expert", label: "Expert", from: 41, to: 50 },
] as const;

export function tierFor(level: number): Tier {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  return TIERS.find((t) => l >= t.from && l <= t.to) ?? TIERS[TIERS.length - 1];
}

export interface CurvePoint extends DifficultyVars {
  level: number;
  toyCount: number;
}

/** Keyframes of the curve. Each value is interpolated linearly between neighbours. */
export const CURVE: readonly CurvePoint[] = [
  { level: 1, clawSpeed: 1.92, gripStrength: 1.26, alignTolerance: 0.35, slipChance: 0, crowding: 0.3, toyCount: 44 },
  { level: 5, clawSpeed: 2.08, gripStrength: 1.2, alignTolerance: 0.32, slipChance: 0, crowding: 0.36, toyCount: 48 },
  { level: 10, clawSpeed: 2.22, gripStrength: 1.15, alignTolerance: 0.3, slipChance: 0, crowding: 0.44, toyCount: 52 },
  { level: 20, clawSpeed: 2.42, gripStrength: 0.9, alignTolerance: 0.2, slipChance: 0.1, crowding: 0.56, toyCount: 60 },
  { level: 30, clawSpeed: 2.62, gripStrength: 0.8, alignTolerance: 0.15, slipChance: 0.18, crowding: 0.66, toyCount: 68 },
  { level: 40, clawSpeed: 2.82, gripStrength: 0.7, alignTolerance: 0.12, slipChance: 0.26, crowding: 0.76, toyCount: 72 },
  { level: 50, clawSpeed: 3.02, gripStrength: 0.58, alignTolerance: 0.1, slipChance: 0.36, crowding: 0.86, toyCount: 80 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Difficulty for a level, interpolated along the curve (clamped at both ends). */
export function difficultyFor(level: number): CurvePoint {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  let lo = CURVE[0];
  let hi = CURVE[CURVE.length - 1];
  for (let i = 0; i < CURVE.length - 1; i++) {
    if (l >= CURVE[i].level && l <= CURVE[i + 1].level) {
      lo = CURVE[i];
      hi = CURVE[i + 1];
      break;
    }
  }
  const t = hi.level === lo.level ? 0 : (l - lo.level) / (hi.level - lo.level);
  return {
    level: l,
    clawSpeed: lerp(lo.clawSpeed, hi.clawSpeed, t),
    gripStrength: lerp(lo.gripStrength, hi.gripStrength, t),
    alignTolerance: lerp(lo.alignTolerance, hi.alignTolerance, t),
    slipChance: lerp(lo.slipChance, hi.slipChance, t),
    crowding: lerp(lo.crowding, hi.crowding, t),
    toyCount: Math.round(lerp(lo.toyCount, hi.toyCount, t)),
  };
}

/** How many assist bumps a miss streak has earned (0 until `bumpAfter` misses in a row). */
export function assistBumps(missStreak: number): number {
  return Math.min(ASSIST.maxBumps, Math.max(0, missStreak - ASSIST.bumpAfter + 1));
}

/** The level's difficulty with the assist bumps applied. Never weaker than the base. */
export function withAssist(base: DifficultyVars, bumps: number): DifficultyVars {
  if (bumps <= 0) return base;
  return {
    ...base,
    alignTolerance: base.alignTolerance + bumps * ASSIST.toleranceBump,
    gripStrength: base.gripStrength + bumps * ASSIST.gripBump,
    slipChance: Math.max(0, base.slipChance - bumps * 0.04),
  };
}
