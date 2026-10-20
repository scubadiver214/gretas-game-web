/**
 * Frogger Adventure tuning. Board geometry, timings, scoring and lives all
 * live here so the engine, renderer, HUD and tests read the same numbers.
 * The API mirrors the scoring/lives/timer limits in Games/FroggerRules.cs;
 * keep both in sync when changing them.
 */

/** Playable board width in tiles. Column c is centred at x = c + 0.5. */
export const COLS = 15;
/** Rows from the home hedge (0) down to the start strip (12). */
export const ROWS = 13;

export const HOME_ROW = 0;
export const RIVER_ROWS = [1, 2, 3, 4, 5] as const;
export const MEDIAN_ROW = 6;
export const ROAD_ROWS = [7, 8, 9, 10, 11] as const;
export const START_ROW = 12;
export const START_X = Math.floor(COLS / 2) + 0.5;

/** Columns of the five lily-pad bays in the home hedge. */
export const HOME_BAYS = [1, 4, 7, 10, 13] as const;
/** How far (tiles) the frog centre may be from a bay centre and still land in it. */
export const BAY_TOLERANCE = 0.6;

export const HOP_SECONDS = 0.14;
/** Frog hitbox (tiles) used against vehicles. */
export const FROG_HIT_WIDTH = 0.7;
export const FROG_HIT_DEPTH = 0.6;
/** Vehicles fill this much of their lane's depth. */
export const VEHICLE_DEPTH = 0.8;
/** Platforms count as "under" the frog this far past their ends. */
export const PLATFORM_GRACE = 0.12;
/** Vehicle hitboxes are trimmed by this much at each end (rounded bumpers). */
export const VEHICLE_TRIM = 0.06;

/** Fixed simulation step (seconds). */
export const STEP_SECONDS = 1 / 120;
/** Never simulate more than this many steps per animation frame (spiral-of-death guard). */
export const MAX_STEPS_PER_FRAME = 5;

export const DEATH_SECONDS = 1.2;
export const LEVEL_CLEAR_SECONDS = 2.5;

export const SCORING = {
  /** Each hop onto a new highest row during the current trip. */
  forwardStep: 10,
  home: 50,
  /** Per whole second left on the frog's timer when it gets home. */
  timeBonusPerSecond: 10,
  levelComplete: 1000,
} as const;

export const LIVES = {
  start: 3,
  /** One extra life each time the score passes a multiple of this. */
  extraEvery: 10_000,
  max: 5,
} as const;

/** Stars for the shared progress/trophy system: levels cleared needed for 1, 2, 3 stars. */
export function froggerStars(levelsCompleted: number, homesFilled: number): number {
  if (levelsCompleted >= 3) return 3;
  if (levelsCompleted >= 1) return 2;
  return homesFilled >= 1 ? 1 : 0;
}
