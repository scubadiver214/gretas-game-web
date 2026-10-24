/*
 * Everything the claw engine keeps is plain JSON (no classes, no functions),
 * so a snapshot can be logged, replayed in a test or sent over the wire.
 */

export type Rarity = "common" | "uncommon" | "rare" | "legendary";
export const RARITIES: readonly Rarity[] = ["common", "uncommon", "rare", "legendary"] as const;

/** Claw movement across the cabinet. Forward/back only exist on depth-control levels. */
export type MoveDir = "left" | "right" | "forward" | "back";

export type EnginePhase =
  | "ready"
  | "positioning"
  | "descending"
  | "gripping"
  | "lifting"
  | "carrying"
  | "slipping"
  | "releasing"
  | "delivered"
  | "returning"
  | "levelClear"
  | "paused";

export type ToyStatus = "resting" | "falling" | "held" | "dropping" | "delivered";

export interface ToyState {
  uid: number;
  prizeId: string;
  rarity: Rarity;
  /** Centre of the toy's bounding sphere. */
  x: number;
  y: number;
  z: number;
  radius: number;
  /** 0..1, heavier toys are harder to lift and more likely to slip. */
  weight: number;
  /** 0..1, slippery or awkward shapes. */
  gripDifficulty: number;
  rotY: number;
  status: ToyStatus;
  /** Vertical velocity while falling or dropping into the chute. */
  vy: number;
  /** Wobble amplitude (decays) and phase; the renderer turns it into a rock. */
  wobble: number;
  wobbleT: number;
  /** Stable per-toy number for colour/pose variation in the renderer. */
  variant: number;
  /** Highlighted as the assist hint. */
  hinted: boolean;
}

export interface ClawState {
  /** Head position on the rails. */
  x: number;
  z: number;
  /** Cable extension in world units (0 = head at the rail). */
  drop: number;
  /** 0 closed .. 1 fully open. */
  jaw: number;
  /** Pendulum swing (radians) and angular velocity, in x and z. */
  swingX: number;
  swingZ: number;
  swingVX: number;
  swingVZ: number;
  /** Where the last descent stopped. */
  stopDrop: number;
  heldToy: number | null;
  /** Fraction of the carry path at which the toy slips, or null for a safe carry. */
  slipAt: number | null;
  carryFrom: { x: number; z: number } | null;
}

/** Everything the difficulty curve and adaptive assist can tune. */
export interface DifficultyVars {
  /** World units per second while positioning. */
  clawSpeed: number;
  /** 0.5 (weak) .. 1.4 (strong); compared with toy weight and grip difficulty. */
  gripStrength: number;
  /** Extra horizontal slack (world units) added to each toy's radius when checking alignment. */
  alignTolerance: number;
  /** Chance that a caught toy slips during the carry (scaled by its weight). */
  slipChance: number;
  /** 0..1, how tightly the pile is packed. */
  crowding: number;
}

/** Everything the engine needs to build one machine. Levels produce this from content. */
export interface LevelSetup {
  level: number;
  /** Prizes that must be delivered to clear the level. */
  goal: number;
  toyCount: number;
  /** Prize ids to draw toys from (with replacement). */
  pool: string[];
  difficulty: DifficultyVars;
  depthControl: boolean;
  /** Seed for the toy layout and grab rolls; random when omitted. */
  seed?: string;
  /** Mystery machine: a single prize on a pedestal and an auto-sweeping claw. */
  mystery?: boolean;
}

/** Catalog fields the engine needs from a prize (the full definition lives in content/prizes.ts). */
export interface ToyTemplate {
  id: string;
  rarity: Rarity;
  size: number;
  weight: number;
  gripDifficulty: number;
}

export interface GrabOutcome {
  caught: boolean;
  toy: number | null;
  /** The probability that was rolled against (1 when nothing was under the claw). */
  chance: number;
  reason: "caught" | "nothing" | "roll";
}

export type HintDir = "left" | "right" | "forward" | "back" | "here";

export type ClawEvent =
  | { type: "reset" }
  | { type: "levelBuilt"; level: number }
  | { type: "started" }
  | { type: "moveStart" }
  | { type: "moveStop" }
  | { type: "grabStart" }
  | { type: "descendStop" }
  | { type: "jawClose" }
  | { type: "grabResolved"; caught: boolean; toy: number | null; prizeId: string | null; chance: number }
  | { type: "lifted"; caught: boolean }
  | { type: "slip"; toy: number; prizeId: string }
  | { type: "released" }
  | { type: "prizeDelivered"; toy: number; prizeId: string; rarity: Rarity; points: number; successes: number; goal: number }
  | { type: "miss"; streak: number }
  | { type: "assist"; bumps: number }
  | { type: "hint"; toy: number | null }
  | { type: "toyBumped"; toy: number }
  | { type: "levelClear"; level: number; stars: number; grabs: number; points: number }
  | { type: "paused" }
  | { type: "resumed" };

/** What React needs to draw the HUD. Pushed only when something changes. */
export interface HudSnapshot {
  phase: EnginePhase;
  level: number;
  goal: number;
  successes: number;
  grabs: number;
  misses: number;
  points: number;
  /** Direction from the claw to the hinted toy while assist is active. */
  hint: HintDir | null;
  depthControl: boolean;
  /** True while the claw can be moved. */
  canMove: boolean;
  /** True while GRAB does something. */
  canGrab: boolean;
}

/** Final numbers for a finished level. */
export interface LevelSummary {
  level: number;
  goal: number;
  successes: number;
  grabs: number;
  misses: number;
  points: number;
  stars: number;
  /** Active play time, excluding pauses and menus. */
  durationSeconds: number;
  /** Prize ids delivered, in order. */
  prizes: string[];
}
