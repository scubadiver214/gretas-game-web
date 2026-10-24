import type { Rng } from "@/lib/rng";
import { CABINET, CHUTE, CLAW, PHYSICS } from "../config";
import { dropForTipY } from "./claw";
import type { ToyState, ToyTemplate } from "./types";

/** Toys sink into each other a little, like plushies in a real machine. */
const NESTLE = 0.82;
/** Horizontal overlap needed before one toy rests on another (fraction of summed radii). */
const SUPPORT_OVERLAP = 0.92;
/** The pile stays out of the chute by this much extra. */
const CHUTE_CLEARANCE = 0.25;

export interface PileBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Floor area toys may occupy: inside the glass, away from the chute. */
export const PILE_BOUNDS: PileBounds = {
  minX: -CABINET.width / 2 + 0.1,
  maxX: CABINET.width / 2 - 0.1,
  minZ: -CABINET.depth / 2 + 0.1,
  maxZ: CABINET.depth / 2 - 0.1,
};

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
  // Use most of the open floor (chute is front-left). Higher crowding tightens
  // the scatter so later levels still look like a real packed machine.
  const crowd = Math.min(1, Math.max(0, crowding));
  const shrink = 0.88 - 0.22 * crowd;
  const cx = (bounds.minX + bounds.maxX) / 2 + 0.18;
  const cz = (bounds.minZ + bounds.maxZ) / 2 + 0.06;
  const halfW = ((bounds.maxX - bounds.minX) / 2) * shrink;
  const halfD = ((bounds.maxZ - bounds.minZ) / 2) * shrink;
  const spread = 0.7 * (1 - crowd);
  const tries = crowd < 0.5 ? 10 : 4;
  templates.forEach((t, i) => {
    const radius = t.size;
    let best: { x: number; z: number; y: number; score: number } | null = null;
    for (let attempt = 0; attempt < 16; attempt++) {
      const x = Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, cx + (rng() * 2 - 1) * halfW));
      const z = Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, cz + (rng() * 2 - 1) * halfD));
      if (overChute(x, z, radius)) continue;
      const y = restHeight({ uid: -1, x, z, radius }, toys);
      if (y + radius > CLAW.maxPileTop) continue;
      let gap = 8;
      for (const o of toys) {
        const d = Math.hypot(o.x - x, o.z - z) - o.radius - radius;
        if (d < gap) gap = d;
      }
      // Prefer the floor, then a little breathing room between toys.
      const score = y - gap * spread;
      if (!best || score < best.score) best = { x, z, y, score };
      if (attempt + 1 >= tries && best) break;
    }
    // Last resort: park on the floor in the open (front-right) of the cabinet.
    const spot = best ?? { x: Math.min(bounds.maxX - radius, cx + halfW * 0.25), z: Math.min(bounds.maxZ - radius, Math.max(bounds.minZ + radius, 0.15)), y: radius };
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
