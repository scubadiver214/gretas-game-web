import { hashString } from "@/lib/rng";
import { lerp, smoothstep } from "../engine/math";
import { PROFILES, type TerrainStyle } from "./profile";
import type { NearestResult, Track } from "./track";

/** Deterministic 2D value noise in 0..1. */
function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq, seed + i * 17) * amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum;
}

export interface Terrain {
  /**
   * Ground height. Inside the corridor it is the road's own height (0 on a flat track, the hills'
   * height otherwise, a hair below the road mesh); beyond it the ground rolls in a shape that suits the world.
   */
  heightAt(x: number, z: number): number;
  /** Rectangle the terrain mesh covers; beyond it the ground is flat. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/** How far past the wall the ground starts to rise. */
const FLAT_MARGIN = 3;
/** The terrain mesh extends this far beyond the corridor bounding box; heights fade to 0 at its edge. */
export const TERRAIN_REACH = 260;

/** The shape of the ground at (x, z) before it is faded in from the corridor: 0..1 times the world's height. */
type Shape = (x: number, z: number, seed: number) => number;

const SHAPES: Record<TerrainStyle, Shape> = {
  // Long soft dunes with a sharper crest, plus fine ripples.
  dunes(x, z, seed) {
    const n = fbm(x * 0.0075, z * 0.0075, seed);
    const crest = Math.pow(Math.max(0, n - 0.18) / 0.82, 1.45);
    const ripples = (valueNoise(x * 0.09, z * 0.09, seed + 3) - 0.5) * 0.027;
    return crest + ripples;
  },
  // Big smooth snowdrifts and rounded hills, with a little wind-packed texture.
  drifts(x, z, seed) {
    const n = fbm(x * 0.0058, z * 0.0058, seed, 4);
    const hills = Math.pow(Math.max(0, n - 0.2) / 0.8, 1.25);
    const drifts = (valueNoise(x * 0.035, z * 0.035, seed + 5) - 0.5) * 0.035;
    return hills + drifts;
  },
  // Foothills with real mountains rising behind them: ridged noise gives sharp crests and steep sides.
  alps(x, z, seed) {
    const foothills = fbm(x * 0.0065, z * 0.0065, seed + 9, 3);
    const n = fbm(x * 0.0036, z * 0.0036, seed, 5);
    const ridge = 1 - Math.abs(2 * n - 1);
    const peaks = Math.pow(Math.max(0, ridge - 0.42) / 0.58, 1.7);
    const rolling = (valueNoise(x * 0.05, z * 0.05, seed + 7) - 0.5) * 0.012;
    return foothills * 0.16 + peaks * 0.84 + rolling;
  },
  // Steep green hills: rounded, with a little roughness.
  jungle(x, z, seed) {
    const n = fbm(x * 0.0062, z * 0.0062, seed, 4);
    const hills = Math.pow(Math.max(0, n - 0.22) / 0.78, 1.2);
    const lumps = (valueNoise(x * 0.05, z * 0.05, seed + 5) - 0.5) * 0.045;
    return hills + lumps;
  },
  // Unused: the shore is built by `shoreHeight`.
  shore: () => 0,
};

/** How far from the road the ground follows the road's height, blending into the natural land. */
const FOLLOW = 32;
/** The terrain sits this far under the road mesh inside the corridor, so the two never fight for the pixels. */
const ROAD_SINK = 0.05;

/** Sand dunes along the road, a beach, then a sea floor; sand bars and spits poke out further off. */
function shoreHeight(x: number, z: number, seed: number, out: number, floor: number, top: number): number {
  const reach = smoothstep(FLAT_MARGIN, 30, out);
  const n = fbm(x * 0.016, z * 0.016, seed, 3);
  const dune = (0.2 + Math.min(1, Math.max(0, n - 0.3) * 2.2) * top + (valueNoise(x * 0.11, z * 0.11, seed + 3) - 0.5) * 0.12) * reach;
  const bars = smoothstep(0.58, 0.66, fbm(x * 0.0045 + 9, z * 0.0045 - 4, seed + 5, 4));
  const land = Math.max(1 - smoothstep(18, 70, out), bars * 0.95);
  const seabed = floor + (valueNoise(x * 0.02, z * 0.02, seed + 11) - 0.5) * 1.2;
  return lerp(seabed, dune, land);
}

/**
 * The ground: flat through the racing corridor so driving is predictable and
 * rolling beyond the wall in a shape that suits the world (dunes, snowdrifts or
 * mountains). A pure function of the track, so the renderer and the camera agree exactly.
 */
export function createTerrain(track: Track): Terrain {
  const profile = PROFILES[track.def.world].terrain;
  const shape = SHAPES[profile.style];
  const baseline = profile.baseline ?? 0;
  const seed = hashString(`${track.def.seed}:terrain`) | 0;
  const b = track.bounds;
  const bounds = { minX: b.minX - TERRAIN_REACH, maxX: b.maxX + TERRAIN_REACH, minZ: b.minZ - TERRAIN_REACH, maxZ: b.maxZ + TERRAIN_REACH };
  const FADE = 70;
  const hilly = track.hills.length > 0;
  const range = Math.max(profile.fullAt, hilly ? FOLLOW : 0);
  const near: NearestResult = { dist: 0, s: 0 };
  return {
    bounds,
    heightAt(x: number, z: number): number {
      const edge = Math.min(x - bounds.minX, bounds.maxX - x, z - bounds.minZ, bounds.maxZ - z);
      if (edge <= 0) return baseline;
      track.nearest(x, z, range, near);
      const out = near.dist;
      const fade = smoothstep(0, FADE, edge);
      let natural: number;
      if (profile.style === "shore") {
        natural = lerp(baseline, shoreHeight(x, z, seed, out, baseline, profile.height), fade);
      } else {
        const reach = smoothstep(FLAT_MARGIN, profile.fullAt, out);
        natural = reach <= 0 ? 0 : Math.max(0, shape(x, z, seed) * profile.height * reach * fade);
      }
      if (!hilly) return natural;
      const w = 1 - smoothstep(0, FOLLOW, out);
      if (w <= 0) return natural;
      return lerp(natural, track.hillAt(near.s) - ROAD_SINK, w);
    },
  };
}
