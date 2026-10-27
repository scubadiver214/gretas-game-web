export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Tool = "shotgun" | "camera";
export type DifficultyId = "junior" | "adventure" | "expert";
/** Ducks the player can shoot while they are in the air. */
export type GameDuckId = "mallard" | "woodDuck" | "pintail" | "teal" | "canvasback" | "shoveler";
export type SpeciesId = GameDuckId | "swan" | "heron" | "turtle" | "frog" | "kingfisher" | "loon";
/** How a flock is arranged behind its leader. */
export type FormationId = "v" | "echelon" | "line" | "string" | "diamond" | "stack" | "chevron";
/** What the flock does after it is in the air. */
export type FlightPattern = "patrol" | "low" | "high" | "hook" | "peel" | "cross";
export type Rarity = "common" | "uncommon" | "rare";

/** ready = menu backdrop, countdown before ducks, playing, paused, done = results. */
export type Phase = "ready" | "countdown" | "playing" | "paused" | "done";
export type WeaponState = "ready" | "pumping" | "reloading" | "swapping";
export type Activity = "ducks" | "explore";

export type DuckPhase = "takeoff" | "fly" | "startled" | "exit" | "hit" | "gone";

/** A flying duck. Targets in a hunt; scenery in the menu and in Explorer mode. */
export interface Duck {
  id: number;
  flight: number;
  species: GameDuckId;
  hen: boolean;
  /** How this flock is flying. Followers copy the leader until they peel away. */
  pattern: FlightPattern;
  target: boolean;
  pos: Vec3;
  vel: Vec3;
  phase: DuckPhase;
  phaseT: number;
  age: number;
  speed: number;
  /** Current speed (eases toward the phase's target speed). */
  cur: number;
  /** Visual scale. */
  size: number;
  /** Forgiving hit sphere radius. */
  radius: number;
  waypoint: Vec3;
  waypointsLeft: number;
  /** Wing-beat phase in radians. */
  flap: number;
  flapRate: number;
  /** 0 = flapping, 1 = wings held in a glide. */
  glide: number;
  /** Roll in radians, from turning. */
  bank: number;
  seed: number;
  leader: number | null;
  /** Formation slot offset in the leader's frame (x right, z back). */
  slot: Vec3;
  /** Seconds of flight before this duck leaves the formation. 0 = stay with the leader. */
  peelAt: number;
  /** Waypoint altitude band for this flight. */
  alt: readonly [number, number];
  quackIn: number;
}

export type AnimalAction = "swim" | "dabble" | "dive" | "stand" | "stalk" | "strike" | "fly" | "bask" | "hide" | "sit" | "hop" | "away" | "perch" | "hover";

/** Ambient wildlife: never a target, always a photo subject. */
export interface Animal {
  id: number;
  species: SpeciesId;
  pos: Vec3;
  heading: number;
  action: AnimalAction;
  actionT: number;
  /** How long the current action lasts. */
  actionLen: number;
  visible: boolean;
  /** Photo / protected-check radius around `center`. */
  radius: number;
  /** Height of the body centre above `pos`. */
  centerY: number;
  home: Vec3;
  range: number;
  goal: Vec3;
  from: Vec3;
  seed: number;
  flap: number;
  speed: number;
  /** 0 = drake / adult, 1 = hen. */
  variant: number;
  /** Step inside a multi-part routine (the kingfisher's visit). */
  stage: number;
}

export interface PhotoResult {
  species: SpeciesId | null;
  stars: 0 | 1 | 2 | 3;
  /** 1 = dead centre, 0 = at the frame edge. */
  centered: number;
  /** Subject height as a fraction of the frame height. */
  fill: number;
  action: boolean;
  tip: string;
}

export interface HudSnapshot {
  phase: Phase;
  countdown: number;
  activity: Activity;
  levelNumber: number;
  levelName: string;
  score: number;
  starScores: readonly [number, number];
  hits: number;
  goal: number;
  goalKind: "hits" | "doubles" | "none";
  progress: number;
  objectiveMet: boolean;
  timeLeft: number | null;
  tool: Tool;
  mag: number;
  magSize: number;
  reserve: number | null;
  weapon: WeaponState;
  reloadProgress: number;
  streak: number;
  multiplier: number;
  zoom: number;
  ads: boolean;
  photos: number;
  onTarget: boolean;
  /** What the camera is pointed at right now (camera tool only). */
  framing: { species: SpeciesId; stars: number } | null;
}

export interface Bonus {
  label: string;
  points: number;
}

export interface HuntSummary {
  levelId: string;
  levelNumber: number;
  activity: Activity;
  success: boolean;
  score: number;
  stars: number;
  hits: number;
  shots: number;
  hitShots: number;
  accuracy: number;
  bestStreak: number;
  doubles: number;
  /** Shots that knocked out two or more ducks at once. */
  multiShots: number;
  ducks: number;
  escaped: number;
  timeSeconds: number;
  photos: number;
  protectedHits: number;
  bonuses: Bonus[];
  outOfAmmo: boolean;
}

export type HuntEvent =
  | { type: "countdown"; n: number }
  | { type: "go" }
  | { type: "shot"; tool: Tool }
  | { type: "ads"; on: boolean }
  | { type: "pump" }
  | { type: "eject" }
  | { type: "shellIn" }
  | { type: "reloadStart" }
  | { type: "reloadDone" }
  | { type: "dryFire" }
  | { type: "hit"; duckId: number; species: GameDuckId; pos: Vec3; points: number; streak: number; multiplier: number; long: boolean }
  | { type: "multi"; count: number; points: number; pos: Vec3 }
  | { type: "miss" }
  | { type: "takeoff"; pos: Vec3 }
  | { type: "quack"; pos: Vec3 }
  | { type: "escaped"; duckId: number }
  | { type: "protected"; species: SpeciesId; pos: Vec3; penalty: number }
  | { type: "objective" }
  | { type: "photo"; result: PhotoResult }
  | { type: "zoom"; zoom: number }
  | { type: "swap"; tool: Tool }
  | { type: "timeWarning" }
  | { type: "outOfAmmo" }
  | { type: "splash"; pos: Vec3; big: boolean }
  | { type: "done"; success: boolean };
