import { LIVES, SCORING } from "../config";

/** Points for reaching a home bay with `timeLeft` seconds on the frog's timer. */
export function homePoints(timeLeft: number): number {
  return SCORING.home + Math.max(0, Math.floor(timeLeft)) * SCORING.timeBonusPerSecond;
}

/** How many extra lives are earned going from `before` to `after` points. */
export function extraLivesBetween(before: number, after: number): number {
  return Math.floor(after / LIVES.extraEvery) - Math.floor(before / LIVES.extraEvery);
}
