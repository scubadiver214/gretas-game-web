import type { Vec3 } from "./types";

export const GAME_TITLE = "Elijah's Quack Attack";

const deg = (d: number) => (d * Math.PI) / 180;

/** Fixed simulation step (seconds). */
export const STEP = 1 / 120;
export const COUNTDOWN_SECONDS = 2.4;

/** The player stands on a raised grassy bank on the south shore, looking north (-Z). */
export const EYE: Vec3 = { x: 0, y: 3.2, z: 0 };

/** Lake basin: a wobbly ellipse. Shared by terrain, water shader and wildlife. */
export const LAKE = { cx: 0, cz: -95, rx: 125, rz: 92 } as const;

export const AIM = {
  yawLimit: deg(75),
  pitchMin: deg(-24),
  pitchMax: deg(55),
  /** Menu / starting pitch. */
  restPitch: deg(3),
  /** Radians per pixel at sensitivity 1. */
  mouse: 0.0021,
  touch: 0.0052,
  /** Radians per second for keys / stick at full tilt. */
  stick: 1.5,
  /** Magnetism and sticky aim only work while the player has moved recently. */
  assistWindow: 0.35,
  assistCone: deg(8),
} as const;

export const FOV = { base: 62, ads: 47 } as const;
export const CAMERA_ZOOMS = [1, 2, 4] as const;

export const SHOTGUN = {
  magazine: 5,
  pumpTime: 0.42,
  /** A click this close to the end of the pump is kept and fired. */
  fireBuffer: 0.14,
  reloadStart: 0.18,
  reloadPerShell: 0.36,
  pellets: 9,
  spread: deg(3.2),
  adsSpread: deg(1.6),
  range: 72,
  swapTime: 0.4,
  photoCooldown: 0.55,
} as const;

export const SCORE = {
  flying: 150,
  long: 200,
  longDistance: 40,
  streakBonus: 50,
  extraDuck: 200,
  completion: 250,
  perfect: 500,
  accuracyMax: 300,
  shellLeft: 25,
  maxMultiplier: 2,
} as const;

export const FLIGHT = {
  baseHitRadius: 0.55,
  /** Waypoints stay inside this cone in front of the player. */
  yawSpread: deg(52),
  turnRate: 1.9,
  takeoffTime: 1.15,
  arriveDistance: 3.5,
  exitDistance: 150,
  minAltitude: 2.5,
  startleDistance: 5,
  startleTime: 1.3,
  /** Passing flocks in the menu and in Explorer mode. */
  ambientInterval: [10, 16] as const,
} as const;

/** Reed beds in the shallows. Ducks burst out of these. */
export const REED_BEDS: readonly Vec3[] = [
  { x: -24, y: 0, z: -26 },
  { x: -9, y: 0, z: -34 },
  { x: 12, y: 0, z: -31 },
  { x: 27, y: 0, z: -24 },
  { x: -38, y: 0, z: -41 },
  { x: 41, y: 0, z: -42 },
];

/** Lily pads off the left bank (the frog hops between them). */
export const LILY_PADS: readonly Vec3[] = [
  { x: -5.6, y: 0.02, z: -7.6 },
  { x: -4.1, y: 0.02, z: -9.3 },
  { x: -6.9, y: 0.02, z: -10.1 },
  { x: -3.2, y: 0.02, z: -11.6 },
  { x: -7.6, y: 0.02, z: -12.9 },
  { x: -4.9, y: 0.02, z: -13.8 },
  { x: -2.4, y: 0.02, z: -8.4 },
  { x: -8.8, y: 0.02, z: -9.4 },
];

/** Half-sunk log the painted turtle basks on. */
export const TURTLE_LOG = { x: 7.5, z: -10.8, yaw: 0.55, length: 3.4 } as const;
/** Dead branch sticking out of the water: the kingfisher's perch. */
export const KINGFISHER_PERCH: Vec3 = { x: 11.2, y: 2.05, z: -8.6 };
/** Shallows the heron wades in. */
export const HERON_SPOTS: readonly Vec3[] = [
  { x: 15.5, y: 0, z: -14.5 },
  { x: -17, y: 0, z: -17.5 },
];
export const SWAN_HOME: Vec3 = { x: 20, y: 0, z: -52 };
export const LOON_HOME: Vec3 = { x: -26, y: 0, z: -62 };
export const MALLARD_SWIM_HOME: Vec3 = { x: 5, y: 0, z: -21 };
export const WOOD_DUCK_HOME: Vec3 = { x: -17, y: 0, z: -22 };

/** Sun direction (towards the sun), behind the player's left shoulder. */
export const SUN_DIR: Vec3 = { x: -0.45, y: 0.72, z: 0.52 };

/** Highest score the API will accept for a hunting round. Keep in step with gretas-game-api ScoreRules. */
export const API_MAX_SCORE = 30000;
