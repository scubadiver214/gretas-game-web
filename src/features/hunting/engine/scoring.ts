import { SCORE, SHOTGUN } from "../config";
import type { LevelDef } from "../levels";
import type { Bonus } from "../types";

/** x1 for the first two hits in a row, then +0.25 every two hits, up to x2. */
export function comboMultiplier(streak: number): number {
  if (streak < 1) return 1;
  return Math.min(SCORE.maxMultiplier, 1 + 0.25 * Math.floor((streak - 1) / 2));
}

/** Points for one duck. `streak` counts this shot. */
export function hitPoints(distance: number, streak: number): number {
  const base = distance >= SCORE.longDistance ? SCORE.long : SCORE.flying;
  return Math.round(base * comboMultiplier(streak)) + (streak >= 2 ? SCORE.streakBonus : 0);
}

/** Bonus for knocking several ducks out of the sky with one shell. */
export const multiBonus = (count: number): number => Math.max(0, count - 1) * SCORE.extraDuck;

export function endBonuses(o: { objectiveMet: boolean; perfect: boolean; accuracy: number; shellsLeft: number; limitedAmmo: boolean }): Bonus[] {
  if (!o.objectiveMet) return [];
  const out: Bonus[] = [{ label: "Level complete", points: SCORE.completion }];
  const acc = Math.round(Math.max(0, Math.min(1, o.accuracy)) * SCORE.accuracyMax);
  if (acc > 0) out.push({ label: "Accuracy", points: acc });
  if (o.perfect) out.push({ label: "Perfect round", points: SCORE.perfect });
  if (o.limitedAmmo && o.shellsLeft > 0) out.push({ label: "Shells saved", points: o.shellsLeft * SCORE.shellLeft });
  return out;
}

export function starsFor(score: number, objectiveMet: boolean, thresholds: readonly [number, number]): number {
  if (!objectiveMet) return 0;
  if (score >= thresholds[1]) return 3;
  if (score >= thresholds[0]) return 2;
  return 1;
}

/** Most ducks a level can ever put in the air. */
export function maxDucks(level: LevelDef): number {
  const plan = level.flights;
  return plan.kind === "waves" ? plan.waves.reduce((n, w) => n + w.size, 0) : plan.maxDucks;
}

/** A score no honest run of `level` can beat (used to keep levels under the API cap). */
export function scoreCeiling(level: LevelDef, reserveBonus = 0): number {
  const perDuck = SCORE.long * SCORE.maxMultiplier + SCORE.streakBonus + SCORE.extraDuck;
  const shells = level.reserve === null ? 0 : SHOTGUN.magazine + level.reserve + reserveBonus;
  return maxDucks(level) * perDuck + SCORE.completion + SCORE.perfect + SCORE.accuracyMax + shells * SCORE.shellLeft;
}
