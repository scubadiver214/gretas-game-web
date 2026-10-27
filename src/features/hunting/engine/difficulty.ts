import type { DifficultyId } from "../types";

export interface DifficultyPreset {
  id: DifficultyId;
  label: string;
  ages: string;
  emoji: string;
  blurb: string;
  /** Visual duck size. */
  sizeMul: number;
  /** Hit sphere size on top of the visual size. */
  hitMul: number;
  speedMul: number;
  /** How twisty flight paths get. */
  jinkMul: number;
  /** 0..1 aim magnetism and sticky reticle. */
  assist: number;
  /** Multiplier on the shotgun's pellet cone. 1 = normal; lower means the crosshair has to be on the duck. */
  spreadMul: number;
  timeMul: number;
  /** Extra shells on limited-ammo levels. */
  reserveBonus: number;
  /** Points lost for shooting protected wildlife. */
  protectedPenalty: number;
}

export const DIFFICULTIES: readonly DifficultyPreset[] = [
  {
    id: "junior",
    label: "Junior Explorer",
    ages: "Ages 5–7",
    emoji: "🐣",
    blurb: "Bigger ducks and a little aim help. You still have to track them.",
    sizeMul: 1.12,
    hitMul: 1.2,
    speedMul: 0.88,
    jinkMul: 0.65,
    assist: 0.45,
    spreadMul: 1,
    timeMul: 1.5,
    reserveBonus: 8,
    protectedPenalty: 0,
  },
  {
    id: "adventure",
    label: "Adventure Hunter",
    ages: "Ages 8–10",
    emoji: "🦆",
    blurb: "Quicker ducks, a smaller hit area, and only a touch of aim help.",
    sizeMul: 1.02,
    hitMul: 1.05,
    speedMul: 1.05,
    jinkMul: 1,
    assist: 0.2,
    spreadMul: 1,
    timeMul: 1.2,
    reserveBonus: 3,
    protectedPenalty: 25,
  },
  {
    id: "expert",
    label: "Expert Ranger",
    ages: "Ages 11–14",
    emoji: "🎯",
    blurb: "Fast, twisty ducks. No aim help, and the crosshair has to be on the bird.",
    sizeMul: 1,
    hitMul: 0.5,
    speedMul: 1.7,
    jinkMul: 1.85,
    assist: 0,
    spreadMul: 0.4,
    timeMul: 1,
    reserveBonus: 0,
    protectedPenalty: 50,
  },
];

export function difficultyById(id: DifficultyId): DifficultyPreset {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
}

export interface AdaptiveBoost {
  speedMul: number;
  sizeMul: number;
  timeMul: number;
  jinkMul: number;
  assistAdd: number;
  /** Friendly line for the level intro, or null when nothing changed. */
  note: string | null;
}

export const NO_BOOST: AdaptiveBoost = { speedMul: 1, sizeMul: 1, timeMul: 1, jinkMul: 1, assistAdd: 0, note: null };

/**
 * Quiet help for a level the player keeps failing, and a little extra spice for one
 * they keep three-starring. Never punishing: help kicks in after two misses and
 * grows after four; the challenge bump is small.
 */
export function adaptiveBoost(record: { fails: number; lastStars: number; plays: number } | undefined): AdaptiveBoost {
  if (!record) return NO_BOOST;
  if (record.fails >= 4) {
    return { speedMul: 0.8, sizeMul: 1.25, timeMul: 1.35, jinkMul: 0.6, assistAdd: 0.3, note: "Extra help is on: the ducks are slower and bigger this time." };
  }
  if (record.fails >= 2) {
    return { speedMul: 0.9, sizeMul: 1.12, timeMul: 1.2, jinkMul: 0.8, assistAdd: 0.15, note: "A little help: the ducks fly a bit slower this time." };
  }
  if (record.lastStars >= 3 && record.plays >= 2) {
    return { speedMul: 1.06, sizeMul: 1, timeMul: 1, jinkMul: 1.3, assistAdd: 0, note: "You're a pro! The ducks fly a little trickier now." };
  }
  return NO_BOOST;
}
