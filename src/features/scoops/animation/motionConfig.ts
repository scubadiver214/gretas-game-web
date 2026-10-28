/**
 * Tuning knobs for Shelby's Scoops motion.
 * Change these here. Components read them. They are not saved on a recipe.
 */

import type { Scatter } from "../types";

export const MOTION = {
  /** How long a new scoop falls and settles. */
  scoopDropSeconds: 0.5,
  scoopDropHeight: 76,
  /** Stretch while falling, then squash on landing. */
  scoopStretchX: 0.88,
  scoopStretchY: 1.14,
  scoopSquashX: 0.16,
  scoopSquashY: 0.2,
  /** Idle sway. Kept small so the stack does not look like gelatin. */
  idleSpeed: 1.15,
  idleDegrees: 1.05,
  settleEvery: 9,
  settleWindow: 0.7,
  settleSquash: 0.03,
  /** Scoops underneath react when a new one lands. */
  bounceSeconds: 0.34,
  bouncePx: 5,
  impactWobble: 4.5,
  /** Melt deformation. Capped so the dessert never disappears. */
  meltSag: 22,
  meltSquash: 0.2,
  meltSpread: 0.12,
  meltCap: 0.9,
  toppingDropSeconds: 0.42,
  toppingDropHeight: 84,
  /** Share of pieces that slide, fall, or bail when overloaded. Seed is 0–1. */
  slideChance: 0.55,
  fallChance: 0.62,
  overflowChance: 0.86,
  slideCycle: 3.6,
  fallCycle: 3.4,
  overflowCycle: 2.15,
  slideDistance: 30,
  slideDrop: 38,
  counterY: 446,
  dripMeltStart: 0.18,
  dripPeriod: 2.6,
  maxDrips: 8,
  puddleMeltStart: 0.3,
  /** Topping load. Higher melt lowers capacity, so the same toppings slide more. */
  capacityBase: 3.5,
  capacityPerScoop: 1.45,
  capacityRadiusBase: 0.9,
  capacityRadius: 0.2,
  capacityMelt: 0.4,
  capacityCup: 0.45,
  sauceWeight: 0.75,
  extraWeight: 0.28,
  bandStable: 0.4,
  bandStir: 0.7,
  bandSlide: 0.9,
  bandFall: 1,
  heavyWeight: 0.34,
  maxPieces: 64,
} as const;

export const PIECE_WEIGHT: Record<Scatter, number> = {
  dots: 0.1,
  chunks: 0.36,
  puffs: 0.34,
  slices: 0.32,
  stars: 0.3,
  worms: 0.5,
};

export interface FlavorMotion {
  /** Below 1 melts a little slower. Above 1 a little faster. Visual only. */
  meltRate: number;
  dripSpeed: number;
  dripWidth: number;
}

const DEFAULT_FLAVOR: FlavorMotion = { meltRate: 1, dripSpeed: 1, dripWidth: 1 };

/** Chocolate and fudge drip slower and thicker. Fruity flavors run glossier and a bit faster. */
export const FLAVOR_MOTION: Record<string, FlavorMotion> = {
  vanilla: { meltRate: 1, dripSpeed: 0.95, dripWidth: 1 },
  chocolate: { meltRate: 0.78, dripSpeed: 0.6, dripWidth: 1.35 },
  strawberry: { meltRate: 1.12, dripSpeed: 1.2, dripWidth: 0.9 },
  fudge: { meltRate: 0.68, dripSpeed: 0.52, dripWidth: 1.55 },
  "cookies-cream": { meltRate: 1, dripSpeed: 0.9, dripWidth: 1 },
  "rocky-road": { meltRate: 0.8, dripSpeed: 0.65, dripWidth: 1.2 },
  "cotton-candy": { meltRate: 1.05, dripSpeed: 1, dripWidth: 0.85 },
  "salted-caramel": { meltRate: 0.9, dripSpeed: 0.75, dripWidth: 1.15 },
  "mint-chip": { meltRate: 1.05, dripSpeed: 1, dripWidth: 0.95 },
  "cookie-dough": { meltRate: 0.95, dripSpeed: 0.85, dripWidth: 1.05 },
  "blue-moon": { meltRate: 1.08, dripSpeed: 1.05, dripWidth: 0.9 },
  superman: { meltRate: 1.05, dripSpeed: 1.1, dripWidth: 0.95 },
  "butter-pecan": { meltRate: 0.88, dripSpeed: 0.8, dripWidth: 1.1 },
  "birthday-cake": { meltRate: 1.06, dripSpeed: 1, dripWidth: 0.95 },
  "blueberry-cheesecake": { meltRate: 1.1, dripSpeed: 1.15, dripWidth: 0.95 },
};

export function flavorMotion(id: string): FlavorMotion {
  return FLAVOR_MOTION[id] ?? DEFAULT_FLAVOR;
}

export interface SauceMotion {
  speed: number;
  width: number;
}

const DEFAULT_SAUCE: SauceMotion = { speed: 0.85, width: 10 };

export const SAUCE_MOTION: Record<string, SauceMotion> = {
  "hot-fudge": { speed: 0.45, width: 14 },
  "chocolate-syrup": { speed: 0.5, width: 12 },
  caramel: { speed: 0.8, width: 11 },
  "strawberry-sauce": { speed: 1.35, width: 9 },
  marshmallow: { speed: 0.4, width: 13 },
  "peanut-butter": { speed: 0.55, width: 12 },
  "blue-raspberry": { speed: 1.2, width: 9 },
  "rainbow-sauce": { speed: 0.95, width: 10 },
};

export function sauceMotion(id: string): SauceMotion {
  return SAUCE_MOTION[id] ?? DEFAULT_SAUCE;
}

export const MOTION_NOTES = {
  sprinkles: "Whoa! That's a LOT of sprinkles!",
  melting: "Uh-oh! Your ice cream is melting!",
  overload: "Topping overload!",
  hurry: "Better hurry, Shelby!",
  messy: "That's one messy masterpiece!",
} as const;
