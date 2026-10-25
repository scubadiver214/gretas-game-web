import type { RaceSummary } from "./types";

/** How a finished race turns into a leaderboard score (higher is better). */
export const RACE_SCORE = {
  finishBonus: 5000,
  coin: 10,
  gem: 100,
  /** Seconds under this add time-bonus points. */
  timeParSeconds: 300,
  timePointPerSecond: 10,
  maxDurationSeconds: 600,
} as const;

/** Arcade score for a finished race. DNF is 0. */
export function raceScore(summary: Pick<RaceSummary, "finished" | "coins" | "gems" | "timeSeconds">): number {
  if (!summary.finished) return 0;
  const time = Math.max(0, Math.round(summary.timeSeconds));
  const timeBonus = Math.max(0, RACE_SCORE.timeParSeconds - time) * RACE_SCORE.timePointPerSecond;
  return RACE_SCORE.finishBonus + summary.coins * RACE_SCORE.coin + summary.gems * RACE_SCORE.gem + timeBonus;
}

/** 0-3 stars for the results screen and local progress. */
export function raceStars(summary: Pick<RaceSummary, "finished" | "place" | "racers" | "coins">): number {
  if (!summary.finished) return 0;
  let stars = 1;
  if (summary.racers <= 1 || summary.place === 1) stars++;
  if (summary.coins >= 20) stars++;
  return Math.min(3, stars);
}

export function raceDurationSeconds(timeSeconds: number): number {
  return Math.min(RACE_SCORE.maxDurationSeconds, Math.max(1, Math.round(timeSeconds)));
}
