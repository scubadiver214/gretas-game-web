import type { GameMode } from "./types";

export const MAX_LEVEL = 5;
/** Stars you need to collect in a mode before the next level unlocks. */
export const STARS_PER_LEVEL = 4;
/** Daily challenges are always played at this level so everyone gets the same run. */
export const DAILY_LEVEL = 3;

/** Level 1..MAX_LEVEL from the stars earned in a mode. Levels are skill-gated: a
 *  round pays 0-3 stars depending on how close to par you scored. */
export function levelForStars(stars: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, stars) / STARS_PER_LEVEL));
}

/** Stars still needed before the next level, or null at max level. */
export function starsToNextLevel(stars: number): number | null {
  const level = levelForStars(stars);
  if (level >= MAX_LEVEL) return null;
  return level * STARS_PER_LEVEL - stars;
}

export const LEVEL_NAMES: Record<number, string> = {
  1: "Rookie",
  2: "Helper",
  3: "Chef",
  4: "Pro",
  5: "Legend",
};

export type RoundsPlayed = Record<GameMode, number>;
export type StarsEarned = Record<GameMode, number>;

export const EMPTY_ROUNDS: RoundsPlayed = { kitchen: 0, delivery: 0, wordle: 0, frogger: 0 };
export const EMPTY_STARS: StarsEarned = { kitchen: 0, delivery: 0, wordle: 0, frogger: 0 };

/**
 * Daily-challenge streak: consecutive UTC days (ending today or yesterday)
 * on which at least one daily challenge was finished.
 */
export function dailyStreak(challengeDates: Iterable<string | undefined>, today: string): number {
  const days = new Set<string>();
  for (const d of challengeDates) if (d) days.add(d);
  if (days.size === 0) return 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  const key = () => cursor.toISOString().slice(0, 10);
  // A streak can still be alive if today's challenge hasn't been played yet.
  if (!days.has(key())) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(key())) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
