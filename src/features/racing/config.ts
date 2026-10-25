import type { SurfaceProps, VehicleParams } from "./types";

/**
 * The Fitz and Furious tuning. Every number the driving feel, the camera and
 * the race flow depend on lives here so the engine, renderer, HUD and tests
 * read the same values. World units are metres; speeds are units per second.
 */

/** The game's name, shown on the hub card, the menu and the results card. */
export const GAME_TITLE = "The Fitz and Furious";

/** Fixed simulation step. Rendering interpolates between steps, so any display rate looks smooth. */
export const STEP_SECONDS = 1 / 60;
/** Never simulate more than this many steps per animation frame (spiral-of-death guard). */
export const MAX_STEPS_PER_FRAME = 6;

/** HUD speed is world units per second times this, shown as MPH (a 38 u/s buggy tops out near 90). */
export const MPH_PER_UNIT = 2.4;

export const GRAVITY = 26;

/** Race flow. */
export const RACE = {
  /** Countdown length: 3, 2, 1, then GO. */
  countdownSeconds: 3,
  /** The player sees "GO!" for this long after the lights go out. */
  goBannerSeconds: 0.9,
  /** After the player crosses the line the results card waits this long so the finish is felt. */
  resultsDelaySeconds: 2.4,
  /** Full-throttle but crawling for this long counts as stuck. */
  stuckSeconds: 3,
  /** Stuck below this speed (units per second). */
  stuckSpeed: 1.4,
  /** Flicker after a respawn so the player can tell they are safe. */
  respawnGraceSeconds: 1.4,
  /** Wrong-way banner after driving against the track for this long. */
  wrongWaySeconds: 1.2,
  /** A projection jump bigger than this in one step is a teleport (respawn), not a checkpoint crossing. */
  maxCrossingStep: 20,
} as const;

/** Road surfaces. Tracks pick one for the road and one for the shoulder (see TrackDefinition.surfaces). */
export const SURFACES = {
  dirt: { id: "dirt", speedMult: 1, gripMult: 1, accelMult: 1, dragMult: 1, bumpiness: 0.5 },
  sand: { id: "sand", speedMult: 0.55, gripMult: 0.72, accelMult: 0.75, dragMult: 1.7, bumpiness: 1 },
  /** Packed snow: a little slidey, which is the fun of it. */
  snow: { id: "snow", speedMult: 0.98, gripMult: 0.8, accelMult: 0.94, dragMult: 1.05, bumpiness: 0.25 },
  deepSnow: { id: "deepSnow", speedMult: 0.52, gripMult: 0.62, accelMult: 0.72, dragMult: 1.85, bumpiness: 0.9 },
  /** Mountain road: grippy and fast. */
  tarmac: { id: "tarmac", speedMult: 1, gripMult: 1.06, accelMult: 1.03, dragMult: 0.96, bumpiness: 0.12 },
  grass: { id: "grass", speedMult: 0.6, gripMult: 0.8, accelMult: 0.78, dragMult: 1.6, bumpiness: 0.8 },
  /** Hard, damp beach sand: fast, with a touch less grip than dirt. */
  packedSand: { id: "packedSand", speedMult: 0.99, gripMult: 0.93, accelMult: 0.98, dragMult: 1.05, bumpiness: 0.3 },
  /** Jungle earth: a little loose and a little muddy. */
  jungleDirt: { id: "jungleDirt", speedMult: 1, gripMult: 1, accelMult: 1, dragMult: 1.02, bumpiness: 0.5 },
} as const satisfies Record<string, SurfaceProps>;

/**
 * The starter buggy. Arcade handling: tight grip, speed-sensitive steering that
 * never fully locks, and a handbrake that trades grip for rotation. Future
 * vehicles are other VehicleParams objects.
 */
export const BUGGY: VehicleParams = {
  radius: 1.5,
  maxSpeed: 38,
  reverseSpeed: 12,
  accel: 23,
  reverseAccel: 14,
  brakeDecel: 46,
  coastDecel: 4,
  drag: 0.05,
  overspeedDrag: 2.6,
  grip: 9,
  driftGrip: 1.5,
  gripRecover: 5,
  slipCapStart: 0.5,
  slipCapEnd: 1.05,
  slideLoss: 0.4,
  gripDrop: 14,
  yawRate: 2.05,
  yawFullSpeed: 7,
  yawHighSpeedLoss: 0.42,
  yawDriftBoost: 1.35,
  steerRise: 5.2,
  steerReturn: 8,
  driftMinSpeed: 12,
  turnDrag: 0.1,
  boostSpeedMult: 1.36,
  boostAccelMult: 2.1,
  boostDrain: 0.5,
  boostMinToStart: 0.12,
  driftCharge: 0.26,
  coinCharge: 0.035,
  airSteer: 0.25,
  wheelRadius: 0.54,
};

/** Chase camera. */
export const CAMERA = {
  distance: 10.5,
  height: 4.7,
  lookAhead: 11,
  lookHeight: 1.4,
  /** How fast the camera swings around behind the car (1/s). Lower is floatier. */
  headingLambda: 3.6,
  heightLambda: 5.5,
  /** The camera backs off a little at speed. */
  speedPull: 3,
  minDistance: 3.5,
  baseFov: 62,
  maxFov: 80,
  boostFov: 7,
  fovLambda: 4,
  tilt: 0.03,
  tiltMax: 0.085,
  tiltLambda: 5,
  shakeDecay: 6,
} as const;

/** The player's camera-distance setting scales CAMERA.distance and height. */
export const CAMERA_DISTANCE_SCALE = { close: 0.78, normal: 1, far: 1.28 } as const;
export type CameraDistance = keyof typeof CAMERA_DISTANCE_SCALE;

/** The big striped arches over the start line and the checkpoints. */
export const ARCH = {
  /** Height of the apex above the road. Cars (about 3 m tall) pass well beneath. */
  height: 9.5,
  /** The legs stand this far outside the road edge, on the shoulder; they are solid. */
  legOffset: 1.5,
} as const;

/** Pickups. */
export const PICKUP = {
  coinRadius: 2.7,
  gemRadius: 3.1,
  coinValue: 1,
  gemValue: 1,
} as const;

/**
 * Intermittent storms on Frosty Flurry Run (snow) and Breezy Beach Blast (rain).
 * Clear gaps, then a burst that cuts visibility and makes the road a little slippier.
 */
export const WEATHER = {
  /** Seconds of fair weather between storms. */
  gapMin: 9,
  gapMax: 16,
  /** How long a storm lasts, including the fade in and out. */
  stormMin: 18,
  stormMax: 28,
  fade: 2.8,
  /** Peak tyre grip as a fraction of dry grip. */
  gripAtPeak: 0.7,
  /** Peak steering bite. Lower means the car turns a little less tightly. */
  yawAtPeak: 0.86,
  /** Schedule this many seconds of weather (covers any race). */
  horizon: 480,
} as const;
