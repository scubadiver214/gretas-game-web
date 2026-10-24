import type { Rarity } from "./engine/types";

/** The game's name, shown on the hub card, menus and the neon sign on the arcade wall. */
export const GAME_TITLE = "Bea's Claw-some Adventure";

/**
 * Bea's Claw-some Adventure tuning. Cabinet geometry, claw timings, grab odds,
 * assist thresholds and points all live here so the engine, renderer, HUD
 * and tests read the same numbers. The API embeds the exported content
 * (prize ids, level goals, avatar rules) from content/claw-content.json.
 */

/** Interior of the glass cabinet, in world units. x runs left/right, z towards the player. */
export const CABINET = {
  width: 5,
  depth: 3.2,
  /** Rail height the claw head hangs from. */
  height: 4.3,
  /** How far the claw centre stays inside the glass. Zero so it can hover on the floor edge. */
  margin: 0,
  /** Depth of the toy band on simple (left/right) machines, centred on the rail. */
  planarBand: 1.7,
} as const;

/** Prize chute: a square hole in the front-left corner of the floor. */
export const CHUTE = {
  x: -CABINET.width / 2 + 0.68,
  z: CABINET.depth / 2 - 0.68,
  size: 1.15,
  /** How far below the floor the bin is. */
  depth: 1.0,
  /** Toys inside this radius of the chute centre are "over" it. */
  catchRadius: 0.5,
} as const;

export const CLAW = {
  /** Finger tips hang this far below the cable attachment (matches render/meshes/claw.ts). */
  fingerLength: 0.95,
  /** Horizontal reach of a fully open jaw (radius). */
  reach: 0.6,
  /** The head starts above the centre-back of the pile. */
  homeX: 0,
  homeZ: -0.3,
  descendSpeed: 2.8,
  liftSpeed: 2.3,
  /** Jaw closes over this many seconds once the fingers reach the pile. */
  gripSeconds: 0.5,
  /** Jaw opens this fast at the start of a descent and over the chute. */
  openSeconds: 0.3,
  /** Head speed while carrying a prize to the chute. */
  carrySpeed: 2.6,
  /** Pause with the empty claw back at the top after a miss. */
  returnSeconds: 0.7,
  /** The fingers sink this far into the top toy before the jaw closes. */
  sink: 0.12,
  /** Pendulum model for the swinging cable. */
  swing: { stiffness: 16, damping: 2.4, kick: 0.5, max: 0.45 },
  /** Toys never pile higher than this (keeps the claw above the pile). */
  maxPileTop: 2.1,
  /** Mystery machine: the claw sweeps left-right at this speed until GRAB. */
  sweepSpeed: 2.2,
} as const;

export const PHYSICS = {
  gravity: 14,
  /** Falling toys stop when within this of their rest height. */
  settleEpsilon: 0.01,
  /** Toys shoved by the fingers wobble with this amplitude. */
  bumpWobble: 0.35,
  wobbleDecay: 2.2,
} as const;

/** Fixed simulation step (seconds). */
export const STEP_SECONDS = 1 / 120;
/** Never simulate more than this many steps per animation frame (spiral-of-death guard). */
export const MAX_STEPS_PER_FRAME = 5;

/** Weights of the grip resolver (see engine/grab.ts). */
export const GRAB = {
  /** Alignment is raised to this power: a slightly off-centre claw is still fine, a far one is not. */
  alignPower: 1.65,
  /** Chance terms: gripStrength - weight * weightPenalty - gripDifficulty * gripPenalty + gripBias. */
  weightPenalty: 0.55,
  gripPenalty: 0.45,
  gripBias: 0.25,
  /** Each neighbouring toy pressed against the target costs this much. */
  crowdPenalty: 0.09,
  /** Toys wider than the jaw lose chance per unit of overflow. */
  oversizePenalty: 1.2,
  /** Floor and ceiling for the rolled chance when something is under the claw. */
  minChance: 0.03,
  maxChance: 0.98,
  /** Slip point lands between these fractions of the carry path. */
  slipWindow: [0.3, 0.85] as const,
} as const;

/** Gentle, child-friendly assistance after repeated misses. */
export const ASSIST = {
  /** Misses in a row before tolerance and grip get a bump. */
  bumpAfter: 2,
  /** Misses in a row before a toy is highlighted. */
  hintAfter: 3,
  /** Misses in a row before an easy toy is nudged to the top of the pile. */
  easyToyAfter: 4,
  toleranceBump: 0.12,
  gripBump: 0.12,
  maxBumps: 3,
} as const;

/** Points for delivering a prize of each rarity. */
export const POINTS: Record<Rarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  legendary: 150,
};

/**
 * Stars for a cleared level: 3 within goal + 1 grabs, 2 within goal + 3,
 * otherwise 1. Clearing always pays at least one star.
 */
export function levelStars(goal: number, grabs: number): number {
  if (grabs <= goal + 1) return 3;
  if (grabs <= goal + 3) return 2;
  return 1;
}

/** Celebration copy, picked by rarity. Never negative. */
export const CHEERS: Record<Rarity, string[]> = {
  common: ["You got it!", "Awesome grab!", "New toy!"],
  uncommon: ["Amazing!", "Great catch!", "So shiny!"],
  rare: ["WOW! A rare toy!", "Incredible grab!"],
  legendary: ["LEGENDARY!", "Unbelievable!"],
};

export const MISS_CHEERS = ["Great try!", "So close!", "Almost!", "Try again!"];
