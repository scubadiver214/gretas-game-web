import type { Rng } from "@/lib/rng";
import { CLAW, GRAB } from "../config";
import { isExposed, isSupport, reachDistance } from "./pile";
import type { DifficultyVars, GrabOutcome, ToyState } from "./types";

/**
 * Grip resolution. A pure function of where the claw stopped, what is under
 * it and the level's difficulty, so the same situation always has the same
 * odds and a test can check them. Alignment dominates: a claw centred on a
 * light toy at an easy level is (almost) a sure thing, a claw hanging off
 * its edge is a long shot. Nothing here looks at how many toys the player
 * has already won.
 */

export interface Candidate {
  toy: ToyState;
  /** Horizontal distance from the finger tips to the toy centre. */
  d: number;
  chance: number;
}

/** 1 when the fingers are centred on the toy, 0 at the edge of the tolerance band. */
export function alignmentScore(d: number, radius: number, tolerance: number): number {
  return 1 - Math.min(1, Math.max(0, d / (radius + tolerance)));
}

/** Other resting toys pressed against this one (they get in the way of the fingers). */
export function neighbourCount(toy: ToyState, toys: readonly ToyState[]): number {
  let n = 0;
  for (const other of toys) {
    if (other.uid === toy.uid || !isSupport(other)) continue;
    const d = Math.hypot(other.x - toy.x, other.z - toy.z);
    if (d < (other.radius + toy.radius) * 0.9 && Math.abs(other.y - toy.y) < toy.radius * 0.8) n++;
  }
  return n;
}

/** Probability that a closing jaw keeps hold of `toy` when its centre is `d` away. */
export function grabChance(toy: ToyState, d: number, vars: DifficultyVars, neighbours: number): number {
  const align = Math.pow(alignmentScore(d, toy.radius, vars.alignTolerance), GRAB.alignPower);
  if (align <= 0) return 0;
  const grip = Math.min(1, Math.max(0, vars.gripStrength - toy.weight * GRAB.weightPenalty - toy.gripDifficulty * GRAB.gripPenalty + GRAB.gripBias));
  const oversize = Math.max(0, toy.radius - CLAW.reach);
  const sizeFit = Math.min(1, Math.max(0.1, 1 - oversize * GRAB.oversizePenalty));
  const crowd = Math.min(1, Math.max(0.4, 1 - neighbours * GRAB.crowdPenalty));
  return Math.min(GRAB.maxChance, Math.max(GRAB.minChance, align * grip * sizeFit * crowd));
}

/** Toys the fingers can close on, best odds first. `planar` measures alignment on x only (simple machines). */
export function candidates(x: number, z: number, tipY: number, toys: readonly ToyState[], vars: DifficultyVars, planar = false): Candidate[] {
  const out: Candidate[] = [];
  for (const toy of toys) {
    if (toy.status !== "resting") continue;
    const d = reachDistance(x, z, toy, planar);
    if (d >= toy.radius + vars.alignTolerance) continue;
    // The fingers reach down about two thirds of their length past the tip stop.
    const top = toy.y + toy.radius;
    if (top < tipY - CLAW.fingerLength * 0.7) continue;
    if (!isExposed(toy, toys)) continue;
    out.push({ toy, d, chance: grabChance(toy, d, vars, neighbourCount(toy, toys)) });
  }
  out.sort((a, b) => b.chance - a.chance);
  return out;
}

/** Mystery machines: the fingers must land within this share of the prize's radius. No dice. */
export const EXACT_WINDOW = 0.65;

/**
 * Resolves a grab. `exact` (mystery machines) makes the outcome a pure
 * function of alignment - inside the window wins, outside misses - so timing
 * the sweeping claw is all that matters.
 */
export function resolveGrab(x: number, z: number, tipY: number, toys: readonly ToyState[], vars: DifficultyVars, rng: Rng, planar = false, exact = false): GrabOutcome {
  const cands = candidates(x, z, tipY, toys, vars, planar);
  if (cands.length === 0) return { caught: false, toy: null, chance: 0, reason: "nothing" };
  const best = cands[0];
  if (exact) {
    const inside = best.d <= best.toy.radius * EXACT_WINDOW;
    return { caught: inside, toy: best.toy.uid, chance: inside ? 1 : 0, reason: inside ? "caught" : "roll" };
  }
  const roll = rng();
  if (roll < best.chance) return { caught: true, toy: best.toy.uid, chance: best.chance, reason: "caught" };
  return { caught: false, toy: best.toy.uid, chance: best.chance, reason: "roll" };
}

/** Where along the carry the toy slips, or null for a safe trip. Decided when the toy is caught. */
export function slipPoint(toy: ToyState, vars: DifficultyVars, rng: Rng): number | null {
  if (vars.slipChance <= 0) return null;
  const p = vars.slipChance * (0.5 + toy.weight * 0.5 + toy.gripDifficulty * 0.3);
  if (rng() >= p) return null;
  const [lo, hi] = GRAB.slipWindow;
  return lo + rng() * (hi - lo);
}

/** The exposed toy with the best odds under a perfectly centred claw (used for the assist hint). */
export function easiestToy(toys: readonly ToyState[], vars: DifficultyVars): ToyState | null {
  let best: ToyState | null = null;
  let bestChance = -1;
  for (const toy of toys) {
    if (toy.status !== "resting" || !isExposed(toy, toys)) continue;
    const c = grabChance(toy, 0, vars, neighbourCount(toy, toys));
    if (c > bestChance) {
      bestChance = c;
      best = toy;
    }
  }
  return best;
}
