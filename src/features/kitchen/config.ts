/** Every tunable number for the Lunch Rush kitchen lives here. */

/** Fixed simulation step. Lockstep-friendly for future online play. */
export const STEP_SECONDS = 1 / 60;
export const MAX_STEPS_PER_FRAME = 8;

export const CHEF = {
  /** Collision radius in tiles. */
  radius: 0.3,
  /** Top walking speed in tiles per second. */
  speed: 4.4,
  /** How quickly velocity reaches the stick direction (per second). */
  accel: 18,
  dashSpeed: 11,
  dashSeconds: 0.16,
  dashCooldown: 0.55,
  /** How far in front of the chef the "what am I facing" probe reaches. */
  reach: 0.72,
} as const;

/** Seconds of work at a station (before the Sharp knife upgrade). */
export const WORK_SECONDS = {
  roll: 2.0,
  chop: 1.5,
  grate: 1.2,
  slice: 1.1,
} as const;

/**
 * Oven progress, in "bakes": 1 = cooked. Take it out between `cooked` and
 * `perfectEnd` for a perfect crust; after `burnt` it can't be served.
 */
export const BAKE = {
  cooked: 1,
  perfectEnd: 1.3,
  warning: 1.45,
  burnt: 1.7,
  /** The oven stops adding once a pizza is charcoal. */
  max: 2.2,
} as const;

export const SCORING = {
  /** Every order is worth this plus its ingredients' values. */
  orderBase: 20,
  perfectBake: 15,
  /** Full tip when served the instant it was ordered, scaled by patience left. */
  maxTip: 20,
  /** Rush orders pay this much more (before the combo). */
  rushMultiplier: 1.5,
  /** Combo multiplier grows by this per pizza in the streak... */
  comboStep: 0.25,
  /** ...up to this many pizzas (x3 at 8). */
  comboCap: 8,
  /** Share of an order's value a customer still pays for the wrong pizza. */
  wrongPizzaShare: 0.25,
  /** Points lost when a customer gives up and walks out. */
  walkoutPenalty: 15,
  /** A serve counts as "speedy" with at least this much patience left. */
  speedyPatience: 0.5,
  /** Coins earned per point at the end of the shift, plus a bonus per star. */
  coinsPerPoint: 0.1,
  coinsPerStar: 15,
} as const;

/** Share of the shift's par score needed for 1, 2 and 3 stars. */
export const STAR_SHARES = [0.25, 0.55, 0.85] as const;

/** In-game clock shown on the HUD: the shift runs from 11:30 to 13:30. */
export const SHIFT_CLOCK = { openMinutes: 11 * 60 + 30, closeMinutes: 13 * 60 + 30 } as const;

/** Seconds left when the "last orders" warning fires. */
export const LAST_CALL_SECONDS = 30;

export const MAX_TOPPINGS = 5;
