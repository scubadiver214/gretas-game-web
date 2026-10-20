export type Dir = "up" | "down" | "left" | "right";

export type VehicleKind = "car" | "racer" | "bulldozer" | "truck";
export type LaneKind = "road" | "log" | "turtle";

/** One thing moving along a lane. Its position is derived from the lane clock, never integrated. */
export interface LaneEntity {
  /** Distance along the lane track at t = 0 (tiles). */
  offset: number;
  /** Length in tiles. */
  length: number;
  /** Turtle groups only: whether this group dives. */
  dives?: boolean;
  /** Turtle groups only: dive cycle phase offset (0..1). */
  divePhase?: number;
  /** Stable index for colour picking in the renderer. */
  variant: number;
}

export interface Lane {
  row: number;
  kind: LaneKind;
  vehicle?: VehicleKind;
  /** +1 moves right, -1 moves left. */
  dir: 1 | -1;
  /** Tiles per second (already scaled by the level). */
  speed: number;
  /** Track start (left edge of the loop, off-screen to the left). */
  trackStart: number;
  /** Track loop length (tiles). */
  trackLength: number;
  entities: LaneEntity[];
  /** Turtle lanes: seconds for a full surface/dive cycle. */
  diveCycle?: number;
}

export type DeathCause = "vehicle" | "water" | "offscreen" | "timeout" | "hedge" | "occupied";

export type EnginePhase = "ready" | "playing" | "dying" | "levelClear" | "paused" | "gameOver";

export interface Hop {
  fromX: number;
  fromRow: number;
  toX: number;
  toRow: number;
  /** 0..1 progress. */
  t: number;
  dir: Dir;
}

export interface FrogState {
  x: number;
  row: number;
  hop: Hop | null;
  facing: Dir;
  /** One buffered move for quick double taps. */
  queued: Dir | null;
  /** Lowest row index reached on this trip (forward points are paid once per row). */
  bestRow: number;
}

export type FroggerEvent =
  | { type: "reset" }
  | { type: "levelBuilt"; level: number }
  | { type: "hop"; dir: Dir }
  | { type: "land"; row: number }
  | { type: "forward"; points: number }
  | { type: "home"; bay: number; points: number }
  | { type: "death"; cause: DeathCause; x: number; row: number }
  | { type: "respawn" }
  | { type: "extraLife" }
  | { type: "levelClear"; level: number; points: number }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "gameOver" };

/** What React needs to draw the HUD. Pushed only when something changes. */
export interface HudSnapshot {
  phase: EnginePhase;
  score: number;
  lives: number;
  level: number;
  levelsCompleted: number;
  /** Whole seconds left on the frog's timer. */
  timeLeft: number;
  timerSeconds: number;
  homes: boolean[];
}

/** Final numbers for a finished game. */
export interface GameSummary {
  score: number;
  highestLevel: number;
  levelsCompleted: number;
  livesLost: number;
  homesFilled: number;
  /** Active play time, excluding pauses. */
  durationSeconds: number;
  /** Levels cleared without losing a life. */
  perfectLevels: number;
}
