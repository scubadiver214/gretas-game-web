import { seededRng } from "@/lib/rng";
import { ARCH, GRAVITY, WEAPONS } from "../config";
import type { WeaponKind } from "../types";
import { TAU, angleDiff } from "../engine/math";
import { PROFILES, type Scenery } from "./profile";
import { createTerrain, type Terrain } from "./terrain";
import type { AnimalKind, ObstacleKind, Track } from "./track";

/** A thing to drive through and pick up. `id` is its index in TrackContent.collectibles. */
export interface Collectible {
  id: number;
  kind: "coin" | "gem";
  x: number;
  y: number;
  z: number;
  s: number;
  lateral: number;
}

/** A solid circle on the ground (plants, hay bales, tyres, boulders, snowmen, logs). */
export interface Obstacle {
  x: number;
  z: number;
  r: number;
  kind: SolidKind;
  /** 0 = dead stop, 1 = perfect bounce. */
  bounce: number;
  height: number;
  /** Height of the ground it stands on (0 when left out). Cars driving above `y + height` pass over it. */
  y?: number;
}

/** A wild animal that waits at the roadside and dashes across when a car comes (the engine moves it). */
export interface AnimalSpec {
  kind: AnimalKind;
  /** Arc length of the crossing. */
  s: number;
  /** The two roadside waiting spots; it runs from one to the other and back. */
  a: { x: number; z: number };
  b: { x: number; z: number };
  /** Starts at spot `a` (0) or `b` (1). */
  startAt: 0 | 1;
  speed: number;
  /** Radius of its collision circle. */
  r: number;
  height: number;
}

/** An animal running in circles in the wild beside the road: scenery only, it never reaches the road. */
export interface Roamer {
  kind: AnimalKind;
  cx: number;
  cz: number;
  radius: number;
  /** Radians per second; the sign says which way round. */
  omega: number;
  phase: number;
  scale: number;
}

/** "plant" is whatever grows on the shoulders in this world: cacti, pines or trees. */
export type SolidKind = ObstacleKind | "plant" | "pillar" | "animal";

export interface Placement {
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  variant: number;
}

export interface Scatter {
  /** Boulders chained along both walls: the visible track boundary. */
  wallRocks: Placement[];
  /** Fence posts just outside the wall. */
  posts: Placement[];
  /** Tall plants beyond the wall (decoration): cacti, pines or trees. Plants on the shoulders are in `obstacles`. */
  flora: Placement[];
  rocks: Placement[];
  /** Ground cover: dry grass, ice crystals or wildflowers. */
  tufts: Placement[];
  /** Big far-off shapes: mesas, ice spires or crags. */
  landmarks: Placement[];
  /** Turn signs: variant 0 points left, 1 points right. */
  signs: Placement[];
}

/** A weapon icon sitting on the road. Driving over it adds one charge. */
export interface WeaponCrate {
  id: number;
  kind: WeaponKind;
  x: number;
  y: number;
  z: number;
  s: number;
}

export interface TrackContent {
  terrain: Terrain;
  collectibles: Collectible[];
  /** Gun, mine and oil icons, in order along the road. */
  weapons: WeaponCrate[];
  obstacles: Obstacle[];
  scatter: Scatter;
  animals: AnimalSpec[];
  roamers: Roamer[];
}

const OBSTACLE_SPECS: Record<SolidKind, { r: number; bounce: number; height: number }> = {
  hay: { r: 1.8, bounce: 0.3, height: 1.7 },
  tires: { r: 1.7, bounce: 0.65, height: 1.6 },
  boulder: { r: 2.1, bounce: 0.2, height: 2.4 },
  snowman: { r: 1.35, bounce: 0.35, height: 3.2 },
  iceblock: { r: 1.8, bounce: 0.5, height: 2.2 },
  logs: { r: 1.9, bounce: 0.25, height: 1.6 },
  sandcastle: { r: 1.9, bounce: 0.2, height: 2.4 },
  crate: { r: 1.5, bounce: 0.4, height: 1.8 },
  surfboards: { r: 1.5, bounce: 0.55, height: 2.4 },
  beachball: { r: 1.6, bounce: 0.95, height: 3.2 },
  stump: { r: 1.8, bounce: 0.25, height: 1.6 },
  idol: { r: 1.5, bounce: 0.2, height: 3.6 },
  animal: { r: 1.5, bounce: 0.5, height: 2.4 },
  plant: { r: 0.95, bounce: 0.5, height: 4 },
  pillar: { r: 1.7, bounce: 0.2, height: 40 },
};

/** How the animals that cross the road are built: how fast they run, how big they are. */
export const ANIMAL_SPECS: Record<AnimalKind, { speed: number; r: number; height: number }> = {
  lion: { speed: 12, r: 1.5, height: 2.2 },
  tiger: { speed: 13, r: 1.5, height: 2.2 },
  giraffe: { speed: 9.5, r: 1.35, height: 5.4 },
};

/** Height of a coin's centre above the ground. */
export const COIN_LIFT = 1.35;

function pointAt(track: Track, s: number, lateral: number): { x: number; z: number } {
  const p = track.sample(s);
  return { x: p.x - p.tz * lateral, z: p.z + p.tx * lateral };
}

function buildCollectibles(track: Track): Collectible[] {
  const out: Collectible[] = [];
  const L = track.length;
  const add = (kind: "coin" | "gem", s: number, lateral: number, y: number) => {
    const p = pointAt(track, s, lateral);
    out.push({ id: out.length, kind, x: p.x, y, z: p.z, s, lateral });
  };
  for (const trail of track.def.coinTrails) {
    if (trail.air) {
      const ramp = track.ramps[trail.air.ramp];
      const v = trail.air.speed;
      const vy0 = (ramp.height / ramp.length) * v;
      for (let d = 3; d < 60; d += 5) {
        const t = d / v;
        const y = ramp.height + vy0 * t - 0.5 * GRAVITY * t * t;
        if (y < 0) break;
        add("coin", ramp.s1 + d, 0, y + COIN_LIFT);
      }
      continue;
    }
    const from = trail.from * L;
    const to = trail.to * L;
    const spacing = trail.spacing ?? 6;
    for (let s = from; s <= to + 1e-6; s += spacing) {
      let lateral = trail.lateral ?? 0;
      if (trail.weave) lateral += trail.weave.amplitude * Math.sin(((s - from) / trail.weave.wavelength) * TAU);
      add("coin", s, lateral, track.heightAt(s) + COIN_LIFT);
    }
  }
  for (const gem of track.def.gems) {
    const s = gem.at * L;
    add("gem", s, gem.lateral, track.heightAt(s) + (gem.lift ?? 1.7));
  }
  return out;
}

/** Gun, mine and oil icons along the racing line, clear of the grid and of ramps. */
function buildWeaponCrates(track: Track): WeaponCrate[] {
  const out: WeaponCrate[] = [];
  const L = track.length;
  for (let s = 80; s < L - 40; s += WEAPONS.spacing) {
    if (track.nearRamp(s, 18)) continue;
    const lateral = (out.length % 2 === 0 ? -1 : 1) * 2.4;
    const p = pointAt(track, s, lateral);
    out.push({
      id: out.length,
      kind: WEAPONS.kinds[out.length % WEAPONS.kinds.length],
      x: p.x,
      y: track.heightAt(s) + 1.55,
      z: p.z,
      s,
    });
  }
  return out;
}

/**
 * Everything placed on a track that is not the road itself: pickups, solid
 * obstacles and decorative scenery. Deterministic for a track (seeded), so
 * every race on it looks and plays the same.
 */
export function buildTrackContent(track: Track): TrackContent {
  const def = track.def;
  const L = track.length;
  const terrain = createTerrain(track);
  const rng = seededRng(`${def.seed}:scatter`);
  const rand = (lo: number, hi: number) => lo + rng() * (hi - lo);

  const collectibles = buildCollectibles(track);
  const weapons = buildWeaponCrates(track);

  // Obstacles from the definition.
  const obstacles: Obstacle[] = [];
  for (const o of def.obstacles) {
    const p = pointAt(track, o.at * L, o.lateral);
    const spec = OBSTACLE_SPECS[o.kind];
    obstacles.push({ x: p.x, z: p.z, kind: o.kind, ...spec, y: track.hillAt(o.at * L) });
  }
  // The legs of every arch are solid.
  for (const gate of track.checkpoints) {
    for (const side of [-1, 1]) {
      const lat = side * (gate.halfWidth + ARCH.legOffset);
      obstacles.push({ x: gate.x - gate.tz * lat, z: gate.z + gate.tx * lat, kind: "pillar", ...OBSTACLE_SPECS.pillar, y: gate.y });
    }
  }

  const profile = PROFILES[def.world];

  // Animals that cross the road: where they wait, and which stretches of wall they need clear.
  const animals: AnimalSpec[] = [];
  const crossings: number[] = [];
  for (const a of def.animals ?? []) {
    const s = a.at * L;
    const p = track.sample(s);
    const lat = p.halfWidth + def.shoulder + 2.4;
    const spot = (side: number) => ({ x: p.x - p.tz * side * lat, z: p.z + p.tx * side * lat });
    const spec = ANIMAL_SPECS[a.kind];
    animals.push({ kind: a.kind, s, a: spot(a.side), b: spot(-a.side), startAt: 0, speed: spec.speed, r: spec.r, height: spec.height });
    crossings.push(s);
  }
  const nearCrossing = (s: number, within: number) =>
    crossings.some((c) => Math.abs(((s - c + L / 2 + L) % L) - L / 2) < within);
  const scatter: Scatter = { wallRocks: [], posts: [], flora: [], rocks: [], tufts: [], landmarks: [], signs: [] };
  const outside = (s: number, side: number, offset: number) => {
    const p = track.sample(s);
    const b = p.halfWidth + def.shoulder;
    const lat = side * (b + offset);
    return { x: p.x - p.tz * lat, z: p.z + p.tx * lat, b, p };
  };

  // The boundary: overlapping boulders along both walls.
  for (let s = 0; s < L; s += 6.2) {
    for (const side of [-1, 1]) {
      const q = outside(s + (side > 0 ? 3.1 : 0), side, 0.5 + rng() * 0.7);
      const scale = rand(1.15, 2.1);
      const rot = rng() * TAU;
      const variant = Math.floor(rng() * 3);
      // Leave a gap in the wall where animals cross.
      if (nearCrossing(s, 7)) continue;
      scatter.wallRocks.push({ x: q.x, y: terrain.heightAt(q.x, q.z) - 0.3 * scale, z: q.z, rot, scale, variant });
    }
  }

  // Fence posts just beyond the wall, alternating sides.
  let flip = 1;
  for (let s = 14; s < L; s += 34) {
    flip = -flip;
    const q = outside(s, flip, 2.6);
    if (nearCrossing(s, 8)) continue;
    scatter.posts.push({ x: q.x, y: terrain.heightAt(q.x, q.z), z: q.z, rot: q.p.heading + Math.PI / 2, scale: 1, variant: Math.floor(rng() * 2) });
  }

  // Plants on the shoulders are solid; keep them off the start grid, ramps and other obstacles.
  let placed = 0;
  for (let attempt = 0; attempt < 400 && placed < profile.solidPlants; attempt++) {
    const s = rand(55, L - 55);
    if (track.nearRamp(s, 14) || nearCrossing(s, 12)) continue;
    const side = rng() < 0.5 ? -1 : 1;
    const p = track.sample(s);
    const lat = side * (p.halfWidth + rand(2.8, def.shoulder - 3));
    const x = p.x - p.tz * lat;
    const z = p.z + p.tx * lat;
    if (obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < 7)) continue;
    obstacles.push({ x, z, kind: "plant", ...OBSTACLE_SPECS.plant, y: track.hillAt(s) });
    placed++;
  }

  // Animals running about in the wild: each gets a patch of ground clear of the road, trees and rocks.
  const roamers: Roamer[] = [];
  const kinds: AnimalKind[] = ["lion", "giraffe", "tiger"];
  for (let attempt = 0; attempt < 800 && roamers.length < (def.roamers ?? 0); attempt++) {
    const radius = rand(9, 20);
    const q = outside(rng() * L, rng() < 0.5 ? -1 : 1, radius + rand(10, 45));
    if (track.distanceOutside(q.x, q.z, radius + 40) < radius + 7) continue;
    if (roamers.some((o) => Math.hypot(o.cx - q.x, o.cz - q.z) < o.radius + radius + 10)) continue;
    const kind = kinds[roamers.length % kinds.length];
    const speed = rand(6, 9);
    roamers.push({ kind, cx: q.x, cz: q.z, radius, omega: (rng() < 0.5 ? -1 : 1) * (speed / radius), phase: rng() * TAU, scale: 1 });
  }
  const crowded = (x: number, z: number) =>
    roamers.some((o) => Math.hypot(o.cx - x, o.cz - z) < o.radius + 6) ||
    animals.some((a) => Math.hypot(a.a.x - x, a.a.z - z) < 7 || Math.hypot(a.b.x - x, a.b.z - z) < 7);

  // Scenery beyond the wall. A candidate must be well clear of every part of the corridor.
  const scenery = (list: Placement[], spec: Scenery) => {
    for (let attempt = 0; attempt < spec.count * 6 && list.length < spec.count; attempt++) {
      const s = rng() * L;
      const side = rng() < 0.5 ? -1 : 1;
      const q = outside(s, side, rand(spec.near, spec.far));
      if (track.distanceOutside(q.x, q.z, spec.clearance + 20) < spec.clearance) continue;
      const ground = terrain.heightAt(q.x, q.z);
      if (spec.maxHeight !== undefined && ground > spec.maxHeight) continue;
      if (spec.minHeight !== undefined && ground < spec.minHeight) continue;
      if (crowded(q.x, q.z)) continue;
      const scale = rand(spec.scaleLo, spec.scaleHi);
      list.push({ x: q.x, y: ground - (spec.sink ?? 0) * scale, z: q.z, rot: rng() * TAU, scale, variant: Math.floor(rng() * spec.variants) });
    }
  };
  scenery(scatter.flora, profile.flora);
  scenery(scatter.rocks, profile.rocks);
  scenery(scatter.tufts, profile.tufts);
  scenery(scatter.landmarks, profile.landmarks);

  // Turn signs: before each noticeable bend, on the outside of the turn, facing oncoming cars.
  let lastSign = -1e9;
  for (let s = 20; s < L - 40; s += 4) {
    const dh = angleDiff(track.sample(s + 26).heading, track.sample(s).heading);
    if (Math.abs(dh) < 0.24 || s - lastSign < 110) continue;
    const turnRight = dh < 0;
    const side = turnRight ? -1 : 1;
    const q = outside(s - 8, side, 1.4);
    scatter.signs.push({ x: q.x, y: terrain.heightAt(q.x, q.z), z: q.z, rot: q.p.heading + Math.PI, scale: 1, variant: turnRight ? 1 : 0 });
    lastSign = s;
  }

  return { terrain, collectibles, weapons, obstacles, scatter, animals, roamers };
}
