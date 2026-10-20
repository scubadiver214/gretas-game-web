import { PLATFORM_GRACE } from "../config";
import type { Lane, LaneEntity } from "../types";

/** Positive modulo. */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * Left edge (tiles) of an entity at lane time `t`. Positions are a pure
 * function of time, so collisions do not depend on frame rate and a seeded
 * lane layout replays identically for every player.
 */
export function entityLeft(lane: Lane, e: LaneEntity, t: number): number {
  return lane.trackStart + mod(e.offset + lane.dir * lane.speed * t, lane.trackLength);
}

/** Velocity (tiles/s) of everything in a lane. */
export function laneVelocity(lane: Lane): number {
  return lane.dir * lane.speed;
}

// Turtle dive cycle, as fractions of the lane's diveCycle.
export const TURTLE_SURFACED_END = 0.55;
export const TURTLE_WARNING_END = 0.7;
export const TURTLE_SUBMERGED_END = 0.9;
/** Rising turtles become safe again once they are this far through the cycle. */
export const TURTLE_SAFE_AGAIN = 0.95;

export type TurtleState = "surfaced" | "warning" | "submerged" | "rising";

export function turtleCycle(lane: Lane, e: LaneEntity, t: number): number {
  if (!e.dives || !lane.diveCycle) return 0;
  return mod(t / lane.diveCycle + (e.divePhase ?? 0), 1);
}

export function turtleState(f: number): TurtleState {
  if (f < TURTLE_SURFACED_END) return "surfaced";
  if (f < TURTLE_WARNING_END) return "warning";
  if (f < TURTLE_SUBMERGED_END) return "submerged";
  return "rising";
}

/** 0 = fully surfaced, 1 = fully under water. Drives the renderer and the safety check. */
export function turtleDepth(f: number): number {
  if (f < TURTLE_WARNING_END) return 0;
  const sinkSpan = 0.04;
  if (f < TURTLE_WARNING_END + sinkSpan) return (f - TURTLE_WARNING_END) / sinkSpan;
  if (f < TURTLE_SUBMERGED_END) return 1;
  return 1 - (f - TURTLE_SUBMERGED_END) / (1 - TURTLE_SUBMERGED_END);
}

export function isTurtleSafe(f: number): boolean {
  return f < TURTLE_WARNING_END || f >= TURTLE_SAFE_AGAIN;
}

/** The log or surfaced turtle group under x, or null if the frog would be in the water. */
export function platformUnder(lane: Lane, x: number, t: number): LaneEntity | null {
  for (const e of lane.entities) {
    const left = entityLeft(lane, e, t);
    if (x < left - PLATFORM_GRACE || x > left + e.length + PLATFORM_GRACE) continue;
    if (lane.kind === "turtle" && !isTurtleSafe(turtleCycle(lane, e, t))) continue;
    return e;
  }
  return null;
}
