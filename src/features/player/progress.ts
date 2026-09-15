import type { GameMode } from "./types";

export const MAX_LEVEL = 5;
/** Rounds of a mode you need to finish before the next level unlocks. */
export const ROUNDS_PER_LEVEL = 2;
/** Daily challenges are always played at this level so everyone gets the same run. */
export const DAILY_LEVEL = 3;

/** Level 1..MAX_LEVEL from the number of finished rounds in a mode. */
export function levelForRounds(roundsPlayed: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, roundsPlayed) / ROUNDS_PER_LEVEL));
}

/** Rounds still needed before the next level, or null at max level. */
export function roundsToNextLevel(roundsPlayed: number): number | null {
  const level = levelForRounds(roundsPlayed);
  if (level >= MAX_LEVEL) return null;
  return level * ROUNDS_PER_LEVEL - roundsPlayed;
}

export const LEVEL_NAMES: Record<number, string> = {
  1: "Rookie",
  2: "Helper",
  3: "Chef",
  4: "Pro",
  5: "Legend",
};

export type RoundsPlayed = Record<GameMode, number>;

export const EMPTY_ROUNDS: RoundsPlayed = { kitchen: 0, delivery: 0 };
