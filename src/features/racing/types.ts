/** Shared racing types. Pure data: no React, no three.js. */

/** What a driver (player or AI) asks the vehicle to do this step. */
export interface Controls {
  /** 0..1 */
  throttle: number;
  /** 0..1; brakes while rolling forward, reverses once stopped. */
  brake: number;
  /** -1 (left) .. 1 (right) */
  steer: number;
  handbrake: boolean;
  boost: boolean;
}

export function neutralControls(): Controls {
  return { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
}

/** How the ground under a wheel behaves. */
export interface SurfaceProps {
  id: string;
  /** Multiplies the vehicle's top speed. */
  speedMult: number;
  /** Multiplies lateral grip (lower = slidier). */
  gripMult: number;
  accelMult: number;
  /** Multiplies passive drag. */
  dragMult: number;
  /** 0..1, how much the suspension jiggles (visual only). */
  bumpiness: number;
}

/** Handling numbers for one vehicle. See config.ts BUGGY for what each does. */
export interface VehicleParams {
  /** Collision circle radius. */
  radius: number;
  maxSpeed: number;
  reverseSpeed: number;
  accel: number;
  reverseAccel: number;
  brakeDecel: number;
  coastDecel: number;
  drag: number;
  /** Extra drag (1/s) applied above the surface's speed limit, so sand slows you smoothly. */
  overspeedDrag: number;
  /** Lateral velocity damping (1/s) at full grip. */
  grip: number;
  /** Lateral damping while the handbrake is held. */
  driftGrip: number;
  /** How fast grip returns after a drift (1/s). */
  gripRecover: number;
  /** Slip angles (radians) between which grip returns to full, capping how sideways a drift can get. */
  slipCapStart: number;
  slipCapEnd: number;
  /** 0..1: the share of sideways energy lost (not turned into forward speed) when the tyres grip. */
  slideLoss: number;
  /** How fast grip drops when the handbrake is pulled (1/s). */
  gripDrop: number;
  /** Maximum yaw rate (rad/s) at the best speed. */
  yawRate: number;
  /** Speed at which steering reaches full authority (no pivoting on the spot below it). */
  yawFullSpeed: number;
  /** Fraction of yaw rate lost at top speed. */
  yawHighSpeedLoss: number;
  yawDriftBoost: number;
  /** Steering input ramp rates (1/s) for keyboard-style digital input. */
  steerRise: number;
  steerReturn: number;
  driftMinSpeed: number;
  /** Fraction of speed lost per second at full steering lock. */
  turnDrag: number;
  boostSpeedMult: number;
  boostAccelMult: number;
  /** Boost meter units per second while boosting (1 = a full bar). */
  boostDrain: number;
  boostMinToStart: number;
  /** Boost meter units per second gained while drifting. */
  driftCharge: number;
  /** Boost meter units per coin. */
  coinCharge: number;
  /** Fraction of steering authority while airborne. */
  airSteer: number;
  /** Visual only. */
  wheelRadius: number;
}

export type RacePhase = "ready" | "countdown" | "racing" | "finished" | "paused";

/** A toy weapon picked up off the road. */
export type WeaponKind = "gun" | "mine" | "oil";

/** Keyboard (and touch) weapon commands. `fire` uses the selected weapon. */
export type WeaponAction = "prev" | "next" | WeaponKind | "fire";

export type RaceEvent =
  | { type: "reset" }
  | { type: "countdownStart" }
  | { type: "countdown"; n: number }
  | { type: "go" }
  | { type: "coin"; id: number; racer: number; total: number }
  | { type: "gem"; id: number; racer: number; total: number }
  | { type: "checkpoint"; racer: number; index: number }
  | { type: "lap"; racer: number; lap: number; lapTime: number; best: boolean }
  | { type: "finish"; racer: number; place: number; time: number }
  | { type: "wall"; racer: number; impact: number }
  | { type: "bump"; racer: number; impact: number }
  | { type: "takeoff"; racer: number }
  | { type: "land"; racer: number; impact: number }
  | { type: "boostStart"; racer: number }
  | { type: "boostEnd"; racer: number }
  | { type: "driftStart"; racer: number }
  | { type: "driftEnd"; racer: number; charge: number }
  | { type: "respawn"; racer: number; auto: boolean }
  | { type: "crash"; racer: number }
  | { type: "weaponPickup"; id: number; kind: WeaponKind; ammo: number; racer: number }
  | { type: "weaponFire"; kind: WeaponKind; ammo: number; racer: number }
  | { type: "weaponEmpty"; kind: WeaponKind }
  | { type: "weaponHit"; shooter: number; target: number; kind: "gun" | "mine" | "oil" }
  | { type: "oil"; racer: number }
  | { type: "weaponsReset" }
  | { type: "coinsReset" }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "weather"; kind: "snow" | "rain"; heavy: boolean };

/** The HUD values React cares about; pushed only when one of them changes. */
export interface HudSnapshot {
  phase: RacePhase;
  /** Countdown digit while counting (3, 2, 1), 0 for the GO banner, null otherwise. */
  countdown: number | null;
  lap: number;
  laps: number;
  rank: number;
  racers: number;
  coins: number;
  gems: number;
  /** Boost meter, 0..1 in 2% steps. */
  boost: number;
  boosting: boolean;
  wrongWay: boolean;
  stuck: boolean;
  /** The player is sitting out a wreck and cannot drive yet. */
  crashed: boolean;
  /** Weapon currently selected. */
  weapon: WeaponKind;
  /** Gun bursts still in your pocket. Each one is ten seconds of fire. */
  gun: number;
  /** Seconds left on the gun that is firing now. 0 when it is quiet. */
  gunSeconds: number;
  mine: number;
  oil: number;
  /** Set once the player has crossed the line. */
  finishedPlace: number | null;
  /** The finish has had its moment: show the results card. */
  resultsReady: boolean;
}

/** One finished (or in-progress) race, for the results card and later the API. */
export interface RaceSummary {
  trackId: string;
  tier: number;
  laps: number;
  place: number;
  racers: number;
  timeSeconds: number;
  lapTimes: number[];
  bestLap: number | null;
  coins: number;
  gems: number;
  finished: boolean;
  /** Every car from first to last; a time trial has just the player. */
  standings: Standing[];
}

export interface Standing {
  racer: number;
  /** The rival's name; empty for the player. */
  name: string;
  /** Crossed the line (with `time`), or still racing. */
  finished: boolean;
  time: number | null;
}
