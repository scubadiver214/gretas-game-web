import type { MixStyle } from "./types";

export const GAME_TITLE = "Shelby's Scoops!";

export const MIX_MAX: Record<MixStyle, number> = {
  single: 1,
  double: 2,
  triple: 3,
  swirl: 2,
  layered: 3,
  half: 2,
  crazy: 4,
};

/** Adding one more scoop walks up this list. Swirl, layers, and half stay put. */
export const SCOOP_LADDER: readonly MixStyle[] = ["single", "double", "triple", "crazy"];

export const MAX_TOPPINGS = 6;
export const MAX_SAUCES = 3;
export const MAX_EXTRAS = 4;
export const NAME_MIN = 2;
export const NAME_MAX = 28;
export const DESCRIPTION_MAX = 80;

/** Index 0 is level 1. Level 10 (blueberry cheesecake) sits at 820 XP. */
export const LEVEL_XP: readonly number[] = [0, 40, 90, 150, 220, 300, 400, 520, 660, 820, 1000, 1200];

export const SCOOP_RANKS: readonly string[] = [
  "Tiny Scoop",
  "Sprinkle Helper",
  "Cone Keeper",
  "Flavor Finder",
  "Swirl Maker",
  "Shop Star",
  "Party Scooper",
  "Recipe Inventor",
  "Master Mixer",
  "Scoops Legend",
  "Moon Scooper",
  "Shelby's Partner",
];

export const MIX_LABELS: Record<MixStyle, string> = {
  single: "1 Scoop",
  double: "2 Scoops",
  triple: "3 Scoops",
  swirl: "Swirl",
  layered: "Layers",
  half: "Half & Half",
  crazy: "Crazy Mix",
};

export const DROPPED_SCOOP = "🍦 Oops! Shelby dropped that scoop. Let's try again!";

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1;
  }
  return level;
}

export function rankForLevel(level: number): string {
  return SCOOP_RANKS[Math.min(SCOOP_RANKS.length, Math.max(1, level)) - 1] ?? SCOOP_RANKS[0];
}

/** Progress inside the current level. `nextAt` is null at the top. */
export function levelProgress(xp: number): { level: number; into: number; span: number; nextAt: number | null } {
  const level = levelForXp(xp);
  if (level >= LEVEL_XP.length) {
    return { level, into: 1, span: 1, nextAt: null };
  }
  const start = LEVEL_XP[level - 1] ?? 0;
  const nextAt = LEVEL_XP[level] ?? start;
  return { level, into: Math.max(0, xp - start), span: Math.max(1, nextAt - start), nextAt };
}
