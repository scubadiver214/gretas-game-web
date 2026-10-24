import type { Rng } from "@/lib/rng";
import { CABINET, CHUTE, CLAW, PHYSICS } from "../config";
import { RAIL_BOUNDS, dropForTipY } from "./claw";
import type { ToyState, ToyTemplate } from "./types";

/** Toys sink into each other a little, like plushies in a real machine. */
const NESTLE = 0.82;
/** Horizontal overlap needed before one toy rests on another (fraction of summed radii). */
const SUPPORT_OVERLAP = 0.92;
/** The pile stays out of the chute by this much extra. */
const CHUTE_CLEARANCE = 0.25;
/** Sit on the grab floor, just inside the glass — same inset as the claw rails. */
const WALL_CLEARANCE = CABINET.margin;

export interface PileBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Floor area toys may occupy: the checkered grab floor, out to the glass. */
export const PILE_BOUNDS: PileBounds = {
  minX: -CABINET.width / 2 + WALL_CLEARANCE,
  maxX: CABINET.width / 2 - WALL_CLEARANCE,
  minZ: -CABINET.depth / 2 + WALL_CLEARANCE,
  maxZ: CABINET.depth / 2 - WALL_CLEARANCE,
};

/** True when the claw head can sit over this point. */
export function clawCanReach(x: number, z: number): boolean {
  return x >= RAIL_BOUNDS.minX && x <= RAIL_BOUNDS.maxX && z >= RAIL_BOUNDS.minZ && z <= RAIL_BOUNDS.maxZ;
}

/**
 * Simple (left/right only) machines keep the pile in a band under the rail
 * so every toy is visually beneath the claw; alignment then only measures x.
 */
export const PLANAR_PILE_BOUNDS: PileBounds = {
  ...PILE_BOUNDS,
  minZ: CLAW.homeZ - CABINET.planarBand / 2,
  maxZ: CLAW.homeZ + CABINET.planarBand / 2,
};

export function pileBoundsFor(depthControl: boolean): PileBounds {
  return depthControl ? PILE_BOUNDS : PLANAR_PILE_BOUNDS;
}

/** Horizontal distance from the fingers to a toy centre: x only on planar machines. */
export function reachDistance(x: number, z: number, toy: { x: number; z: number }, planar: boolean): number {
  return planar ? Math.abs(toy.x - x) : Math.hypot(toy.x - x, toy.z - z);
}

export function overChute(x: number, z: number, radius = 0): boolean {
  const half = CHUTE.size / 2 + CHUTE_CLEARANCE;
  return Math.abs(x - CHUTE.x) < half + radius && Math.abs(z - CHUTE.z) < half + radius;
}

/** The claw can hover over the toy's centre, the body stays inside the glass, and it is not in the chute. */
export function onGrabFloor(x: number, z: number, radius: number, bounds: PileBounds = PILE_BOUNDS): boolean {
  return clawCanReach(x, z) && insideWalls(x, z, radius) && insideBounds(x, z, radius, bounds) && !overChute(x, z, radius);
}

function insideBounds(x: number, z: number, radius: number, bounds: PileBounds): boolean {
  return (
    x - radius >= bounds.minX - 1e-9 &&
    x + radius <= bounds.maxX + 1e-9 &&
    z - radius >= bounds.minZ - 1e-9 &&
    z + radius <= bounds.maxZ + 1e-9
  );
}

function insideWalls(x: number, z: number, radius: number): boolean {
  return (
    Math.abs(x) + radius <= CABINET.width / 2 - WALL_CLEARANCE + 1e-9 &&
    Math.abs(z) + radius <= CABINET.depth / 2 - WALL_CLEARANCE + 1e-9
  );
}

function clampToFloor(x: number, z: number, radius: number, bounds: PileBounds): { x: number; z: number } {
  const wallX = CABINET.width / 2 - WALL_CLEARANCE - radius;
  const wallZ = CABINET.depth / 2 - WALL_CLEARANCE - radius;
  let minX = Math.max(bounds.minX, RAIL_BOUNDS.minX, -wallX);
  let maxX = Math.min(bounds.maxX, RAIL_BOUNDS.maxX, wallX);
  let minZ = Math.max(bounds.minZ, RAIL_BOUNDS.minZ, -wallZ);
  let maxZ = Math.min(bounds.maxZ, RAIL_BOUNDS.maxZ, wallZ);
  if (minX > maxX) {
    const mid = (minX + maxX) / 2;
    minX = maxX = mid;
  }
  if (minZ > maxZ) {
    const mid = (minZ + maxZ) / 2;
    minZ = maxZ = mid;
  }
  return { x: Math.min(maxX, Math.max(minX, x)), z: Math.min(maxZ, Math.max(minZ, z)) };
}

/** Stacked toys must stay this far from the back wall, or they read as stuck to it. */
const BACK_WALL_GAP = 0.6;

/** True for a toy that would sit on other toys right up against the back wall. */
function stackedAgainstBackWall(_x: number, z: number, y: number, radius: number, bounds: PileBounds): boolean {
  const lifted = y > radius + 0.05;
  return lifted && z - radius < bounds.minZ + BACK_WALL_GAP;
}

/** Walk the grab floor for a legal park when random sampling cannot find one. */
function fallbackOnFloor(radius: number, bounds: PileBounds, toys: readonly ToyState[]): { x: number; z: number; y: number } {
  let best: { x: number; z: number; y: number } | null = null;
  const cols = 8;
  const rows = 6;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const gx = bounds.minX + ((i + 0.5) / cols) * (bounds.maxX - bounds.minX);
      const gz = bounds.minZ + ((j + 0.5) / rows) * (bounds.maxZ - bounds.minZ);
      const { x, z } = clampToFloor(gx, gz, radius, bounds);
      if (!onGrabFloor(x, z, radius, bounds)) continue;
      const y = restHeight({ uid: -1, x, z, radius }, toys);
      if (y + radius > CLAW.maxPileTop) continue;
      if (stackedAgainstBackWall(x, z, y, radius, bounds)) continue;
      if (!best || y < best.y) best = { x, z, y };
    }
  }
  if (best) return best;
  const { x, z } = clampToFloor((bounds.minX + bounds.maxX) / 2 + 0.4, (bounds.minZ + bounds.maxZ) / 2, radius, bounds);
  const y = Math.min(restHeight({ uid: -1, x, z, radius }, toys), CLAW.maxPileTop - radius);
  return onGrabFloor(x, z, radius, bounds) ? { x, z, y } : { x: 0.45, z: 0, y: Math.min(radius, CLAW.maxPileTop - radius) };
}

/** True while the toy sits in the pile and can hold other toys up. */
export function isSupport(toy: ToyState): boolean {
  return toy.status === "resting" || toy.status === "falling";
}

/**
 * Height the centre of `toy` would rest at, sitting on the floor or on the
 * highest of `supports` it overlaps (sphere on sphere, slightly nestled).
 */
export function restHeight(toy: { uid: number; x: number; z: number; radius: number }, supports: Iterable<ToyState>): number {
  let rest = toy.radius;
  for (const s of supports) {
    if (s.uid === toy.uid || !isSupport(s)) continue;
    const d = Math.hypot(s.x - toy.x, s.z - toy.z);
    const reach = (s.radius + toy.radius) * SUPPORT_OVERLAP;
    if (d >= reach) continue;
    const lift = Math.sqrt(Math.max(0, reach * reach - d * d)) * NESTLE;
    rest = Math.max(rest, s.y + lift);
  }
  return rest;
}

/** Toys that are not covered by another resting toy, so the claw can reach them. */
export function isExposed(toy: ToyState, toys: readonly ToyState[]): boolean {
  for (const other of toys) {
    if (other.uid === toy.uid || !isSupport(other)) continue;
    if (other.y <= toy.y) continue;
    const d = Math.hypot(other.x - toy.x, other.z - toy.z);
    if (d < toy.radius * 0.8) return false;
  }
  return true;
}

/**
 * One physics step for the pile: toys above their rest height fall, land
 * with a little wobble, and wobble decays. Processed bottom-up so a toy
 * only ever rests on toys already settled this step.
 */
export function stepPile(toys: ToyState[], h: number, onLand?: (toy: ToyState) => void): void {
  const order = toys.filter(isSupport).sort((a, b) => a.y - b.y);
  const settled: ToyState[] = [];
  for (const toy of order) {
    const rest = restHeight(toy, settled);
    if (toy.y > rest + PHYSICS.settleEpsilon) {
      toy.status = "falling";
      toy.vy -= PHYSICS.gravity * h;
      toy.y += toy.vy * h;
      if (toy.y <= rest) {
        toy.y = rest;
        toy.vy = 0;
        toy.status = "resting";
        toy.wobble = Math.max(toy.wobble, PHYSICS.bumpWobble * 0.6);
        onLand?.(toy);
      }
    } else {
      if (toy.y < rest - PHYSICS.settleEpsilon) toy.y = rest;
      toy.vy = 0;
      toy.status = "resting";
    }
    settled.push(toy);
  }
  for (const toy of toys) {
    if (toy.wobble > 0) {
      toy.wobbleT += h;
      toy.wobble = Math.max(0, toy.wobble - PHYSICS.wobbleDecay * h * toy.wobble - 0.02 * h);
    }
  }
}

/** Shoves every toy touched by an open jaw so the pile reacts to the fingers. */
export function bumpToys(x: number, z: number, tipY: number, toys: ToyState[], planar = false): number[] {
  const bumped: number[] = [];
  for (const toy of toys) {
    if (!isSupport(toy)) continue;
    const d = reachDistance(x, z, toy, planar);
    const top = toy.y + toy.radius;
    if (d < CLAW.reach + toy.radius && top > tipY - CLAW.fingerLength && toy.y < tipY + toy.radius) {
      toy.wobble = Math.max(toy.wobble, PHYSICS.bumpWobble);
      toy.wobbleT = 0;
      bumped.push(toy.uid);
    }
  }
  return bumped;
}

/** The resting toy the fingers will land on (highest top within the jaw's footprint), if any. */
export function highestUnder(x: number, z: number, toys: readonly ToyState[], planar = false): ToyState | null {
  let best: ToyState | null = null;
  for (const toy of toys) {
    if (toy.status !== "resting") continue;
    const d = reachDistance(x, z, toy, planar);
    if (d >= CLAW.reach * 0.5 + toy.radius * 0.6) continue;
    if (!best || toy.y + toy.radius > best.y + best.radius) best = toy;
  }
  return best;
}

/** Cable extension at which the fingers stop: just into the top toy, or on the floor. */
export function stopDropFor(x: number, z: number, toys: readonly ToyState[], planar = false): number {
  const target = highestUnder(x, z, toys, planar);
  const topY = target ? target.y + target.radius : 0;
  const tip = Math.max(0.04, topY - CLAW.sink);
  return dropForTipY(tip);
}

/** Picks `count` templates from the pool, cycling so every prize appears before any repeats. */
export function pickTemplates(rng: Rng, pool: readonly ToyTemplate[], count: number): ToyTemplate[] {
  if (pool.length === 0) return [];
  const bag: ToyTemplate[] = [];
  while (bag.length < count) {
    const round = [...pool];
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    bag.push(...round);
  }
  return bag.slice(0, count);
}

/**
 * Drops each toy into the cabinet at a random spot and lets it rest on what
 * is already there. Low crowding spreads toys out and keeps the pile flat;
 * high crowding bunches them towards the middle and stacks them.
 */
export function layoutPile(rng: Rng, templates: readonly ToyTemplate[], crowding: number, bounds: PileBounds = PILE_BOUNDS): ToyState[] {
  const toys: ToyState[] = [];
  // Fill the whole checkered floor. Crowding only stacks extras, it does not
  // pull the pile into a clump in the middle.
  const crowd = Math.min(1, Math.max(0, crowding));
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const cols = 7;
  const rows = 6;
  const spread = 1.7 - 0.35 * crowd;
  const corners: Array<readonly [number, number]> = [
    [bounds.minX, bounds.minZ],
    [bounds.maxX, bounds.minZ],
    [bounds.minX, bounds.maxZ],
    [bounds.maxX, bounds.maxZ],
  ];
  const tries = 4 + cols * rows;
  templates.forEach((t, i) => {
    const radius = t.size;
    let best: { x: number; z: number; y: number; score: number } | null = null;
    for (let attempt = 0; attempt < tries; attempt++) {
      let gx: number;
      let gz: number;
      if (attempt < 4) {
        gx = corners[attempt][0];
        gz = corners[attempt][1];
      } else {
        const cell = attempt - 4;
        const col = cell % cols;
        const row = Math.floor(cell / cols);
        gx = bounds.minX + ((col + rng()) / cols) * width;
        gz = bounds.minZ + ((row + rng()) / rows) * depth;
      }
      const { x, z } = clampToFloor(gx, gz, radius, bounds);
      if (!onGrabFloor(x, z, radius, bounds)) continue;
      const y = restHeight({ uid: -1, x, z, radius }, toys);
      if (y + radius > CLAW.maxPileTop) continue;
      if (stackedAgainstBackWall(x, z, y, radius, bounds)) continue;
      let gap = 8;
      for (const o of toys) {
        const d = Math.hypot(o.x - x, o.z - z) - o.radius - radius;
        if (d < gap) gap = d;
      }
      // Prefer the floor, then space between toys, then a little toward the player
      // so the pile fills the platform instead of hugging the back glass.
      const score = y * 1.15 - gap * spread - z * 0.22;
      if (!best || score < best.score) best = { x, z, y, score };
    }
    const spot = best ?? fallbackOnFloor(radius, bounds, toys);
    toys.push({
      uid: i + 1,
      prizeId: t.id,
      rarity: t.rarity,
      x: spot.x,
      y: spot.y,
      z: spot.z,
      radius,
      weight: t.weight,
      gripDifficulty: t.gripDifficulty,
      rotY: rng() * Math.PI * 2,
      status: "resting",
      vy: 0,
      wobble: 0,
      wobbleT: 0,
      variant: Math.floor(rng() * 1000),
      hinted: false,
    });
  });
  return toys;
}

/** A single prize on a pedestal in the middle of the cabinet (mystery machine). */
export function layoutPedestal(template: ToyTemplate): ToyState[] {
  return [
    {
      uid: 1,
      prizeId: template.id,
      rarity: template.rarity,
      x: 0,
      y: template.size,
      z: -0.2,
      radius: template.size,
      weight: template.weight,
      gripDifficulty: template.gripDifficulty,
      rotY: 0,
      status: "resting",
      vy: 0,
      wobble: 0,
      wobbleT: 0,
      variant: 7,
      hinted: false,
    },
  ];
}
