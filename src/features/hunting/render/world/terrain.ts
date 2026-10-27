import { BufferAttribute, BufferGeometry, Color } from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";
import { lakeDist } from "../../engine/lake";
import { smoothstep } from "../../engine/vec";

const perlin = new ImprovedNoise();

/** Perlin noise, roughly -1..1. */
export const noise2 = (x: number, z: number, seed = 0): number => perlin.noise(x, z, seed);

export function fbm(x: number, z: number, octaves: number, seed: number): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, z * freq, seed + i * 1.7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** Ridged multifractal, 0..~1: sharp crests for the mountain range. */
export function ridged(x: number, z: number, octaves = 6): number {
  let amp = 0.55;
  let freq = 1;
  let sum = 0;
  let weight = 1;
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noise2(x * freq, z * freq, 7.3 + i * 3.1));
    n *= n;
    n *= weight;
    weight = Math.min(1, n * 1.6);
    sum += n * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum;
}

/**
 * Ground height at a world point: a lake basin, a low grassy bank around the
 * water, rolling hills, then a ridged mountain range a few hundred metres out.
 */
export function terrainHeight(x: number, z: number): number {
  const d = lakeDist(x, z) + fbm(x * 0.03, z * 0.03, 2, 3.1) * 0.01;
  // The grassy rise the player stands on, sloping down to the water in front.
  const knoll = 1.75 * Math.exp(-((x * x) / 60 + ((z - 2.5) * (z - 2.5)) / 26));
  if (d < 1) return -0.25 - 3.4 * smoothstep(1.0, 0.86, d) + knoll * smoothstep(0.93, 1.0, d);
  const s = d - 1;
  const shore = 0.08 + Math.min(s, 0.05) * 7 + fbm(x * 0.09, z * 0.09, 2, 5) * 0.18 * smoothstep(0, 0.03, s);
  const hills = (fbm(x * 0.011, z * 0.011, 4, 11) * 0.5 + 0.5) * 16 * smoothstep(0.22, 0.95, s);
  const foothills = (fbm(x * 0.0048, z * 0.0048, 4, 21) * 0.5 + 0.5) * 75 * smoothstep(0.8, 2.1, s);
  const peaks = ridged(x * 0.0021, z * 0.0021) * 400 * smoothstep(1.6, 3.9, s);
  return shore + knoll + hills + foothills + peaks;
}

const C = (hex: string) => new Color(hex);
const MUD = C("#5f5640");
const SAND = C("#b9a57a");
const GRASS_A = C("#4f8a2a");
const GRASS_B = C("#86b443");
const FOREST_A = C("#25502a");
const FOREST_B = C("#3a6a32");
const ROCK_A = C("#6c7684");
const ROCK_B = C("#9ba5b1");
const SNOW = C("#f2f6fb");

/** Terrain colour from height, slope (0 flat .. 1 cliff) and a little noise. */
export function terrainColor(out: Color, x: number, z: number, h: number, slope: number): Color {
  const n = fbm(x * 0.05, z * 0.05, 3, 41) * 0.5 + 0.5;
  const n2 = fbm(x * 0.006, z * 0.006, 3, 57) * 0.5 + 0.5;
  if (h < 0.18) {
    out.copy(MUD).lerp(SAND, smoothstep(-1.5, 0.15, h) * (0.6 + 0.4 * n));
    return out;
  }
  out.copy(GRASS_A).lerp(GRASS_B, n);
  out.lerp(SAND, (1 - smoothstep(0.18, 0.45, h)) * 0.6);
  const forest = smoothstep(2.5, 9, h) * (0.65 + 0.35 * n2) * (1 - smoothstep(150, 220, h));
  if (forest > 0) out.lerp(FOREST_A.clone().lerp(FOREST_B, n), Math.min(1, forest));
  const rock = Math.min(1, smoothstep(0.34, 0.58, slope) + smoothstep(110, 190, h) * 0.9);
  if (rock > 0) out.lerp(ROCK_A.clone().lerp(ROCK_B, n2), rock);
  const snow = smoothstep(285, 335, h + (n - 0.5) * 70) * (1 - smoothstep(0.32, 0.55, slope));
  if (snow > 0) out.lerp(SNOW, snow);
  return out;
}

export interface TerrainOptions {
  rings: number;
  segments: number;
  radius: number;
  /** Total arc in radians, centred on -Z. */
  arc: number;
}

/**
 * A polar grid around the player: dense under their feet, coarse at the
 * horizon, and only in front of them (nobody can turn round).
 */
export function buildTerrain(o: TerrainOptions): BufferGeometry {
  const cols = o.segments + 1;
  const count = (o.rings + 1) * cols;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i <= o.rings; i++) {
    const r = 0.6 + (o.radius - 0.6) * Math.pow(i / o.rings, 2.3);
    for (let j = 0; j < cols; j++) {
      const a = -o.arc / 2 + (o.arc * j) / o.segments;
      const x = -Math.sin(a) * r;
      const z = -Math.cos(a) * r;
      const k = (i * cols + j) * 3;
      pos[k] = x;
      pos[k + 1] = terrainHeight(x, z);
      pos[k + 2] = z;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < o.rings; i++) {
    for (let j = 0; j < o.segments; j++) {
      const a = i * cols + j;
      const b = a + cols;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const nrm = g.getAttribute("normal");
  const col = new Float32Array(count * 3);
  const c = new Color();
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3];
    const h = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    terrainColor(c, x, z, h, 1 - nrm.getY(v));
    col[v * 3] = c.r;
    col[v * 3 + 1] = c.g;
    col[v * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

/** Slope (0 flat .. 1 vertical) by finite differences. */
export function terrainSlope(x: number, z: number): number {
  const e = 1.5;
  const dx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const dz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  const ny = 1 / Math.hypot(dx / (2 * e), 1, dz / (2 * e));
  return 1 - ny;
}
