import type { SurfaceProps, VehicleParams, WeaponKind } from "./types";

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

/**
 * Computer drivers. Their base pace is the tier's `aiSpeedMultiplier`. They race close to
 * that pace the whole time: a short lead is defended, and they only ease off once they are
 * a long way up the road. Catch-up when they fall behind still cannot exceed the car.
 */
export const AI = {
  /** Gate half-width multiple for rivals: a computer car never misses a gate. */
  gateScale: 3,
  /** Furthest a rival's lane may sit from the centre line, as a fraction of the road half-width. */
  maxLane: 0.62,
  /** Pack-keeping reaches full strength at this gap to the player (metres along the race). */
  bandDistance: 140,
  /** A rival far behind may speed up to its tier pace plus this (as a fraction of its top speed). */
  catchUp: 0.12,
  /** ...and takes bends this much more skilfully (added to cornering skill, 0..1). */
  catchUpCornering: 0.2,
  /** A rival this far ahead of the player (metres) may start to ease off. A shorter lead is raced flat out. */
  holdLead: 110,
  /** Once past `holdLead`, a rival far ahead slows by up to this fraction. */
  easeOff: 0.05,
  /** Speed a clumsy driver gives up per radian of bend ahead. */
  cornerDropWide: 24,
  /** Speed a skilled driver gives up per radian of bend ahead. */
  cornerDropTight: 7,
  /** Corner braking never drops a rival below this fraction of its pace. */
  cornerFloor: 0.84,
  /** Boost meter units per second a rival charges (it collects no coins). */
  boostCharge: 0.09,
  /** A rival fires its boost from this much meter... */
  boostAt: 0.4,
  /** ...on a straight (heading change ahead below this, radians)... */
  boostMaxTurn: 0.18,
  /** ...to attack when the player is ahead by less than this (metres). */
  boostRange: 60,
  /** ...or to cover the player when they are closer than this behind (metres). */
  defendRange: 50,
  /** How far ahead (metres) a rival looks for cars to steer round. */
  trafficLook: 16,
  /** Crawling for this long, or driving the wrong way, puts a rival back at its last gate. */
  stuckSeconds: 2.5,
  /** Fraction of pace after crossing the finish line (a lap of honour, out of the way). */
  cruise: 0.55,
} as const;

/**
 * A major hit wrecks the car. It stops where it crashed (a few metres back, on the
 * road, so it is not left inside the thing it hit) and has to get going again.
 * A nudge is still just a nudge. Brushing the boundary wall is not a crash.
 */
export const CRASH = {
  /** Closing speed (units/s) into an animal or a roadside obstacle that wrecks the car. */
  obstacleImpact: 9,
  /** Closing speed between two cars that wrecks both. Side-by-side racing stays a bump. */
  carImpact: 12,
  /** How long the car sits still before it can drive, still at the crash. */
  recoverSeconds: 1.15,
  /** Rivals scramble back sooner, so punting one does not hand you the race. */
  rivalRecoverScale: 0.65,
  /** Helper and Super helper sit for less of `recoverSeconds`. */
  helperRecoverScale: 0.78,
  extraRecoverScale: 0.5,
  /** Helper and Super helper need a harder hit (times the impacts above) before they wreck. */
  helperImpactScale: 1.3,
  extraImpactScale: 1.75,
  /** After the car can drive again, the same hit cannot wreck it straight away. */
  graceSeconds: 0.85,
  /** Settle this far back along the road, still at the crash, clear of what was hit. */
  settleBack: 4,
} as const;

/** Bumping between cars: a soft, friendly shove, heavier cars pushing lighter ones further. */
export const TRAFFIC = {
  bounce: 0.3,
  /** Cars more than this apart in height (one mid-jump) pass each other. */
  maxHeightGap: 1.6,
} as const;

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

/**
 * Arcade weapons lying on the road. A blaster bolt, a pop mine and an oil puddle:
 * they spin a car out or make it slide. They are toys, collected by driving over the icon.
 */
export const WEAPONS = {
  kinds: ["gun", "mine", "oil"] as readonly WeaponKind[],
  /** Charges kept of each weapon. */
  maxAmmo: 5,
  /** Drive this close to a weapon icon to pick it up. */
  pickupRadius: 2.8,
  /** Metres between weapon icons along the road. */
  spacing: 150,
  /** Blaster bolt. */
  gunSpeed: 78,
  gunLife: 1.15,
  gunRadius: 1.55,
  /** Mine, dropped behind the car. It cannot go off until it is armed. */
  mineBehind: 4.4,
  mineArm: 0.45,
  mineRadius: 2.35,
  mineLife: 16,
  /** Oil puddle, dropped behind the car. */
  oilBehind: 5.2,
  oilRadius: 3.5,
  oilLife: 9,
  /** Grip while you are on a slick, as a fraction of normal grip. */
  oilGrip: 0.22,
  /** How long the slide lasts after you leave the puddle. */
  oilSeconds: 1.5,
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
