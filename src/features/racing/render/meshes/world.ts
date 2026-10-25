import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
} from "three";
import { clamp01, smoothstep } from "../../engine/math";
import type { Terrain } from "../../world/terrain";
import type { Track, WorldId } from "../../world/track";
import type { MeshKit } from "@/components/three/kit";
import { ROAD_TEX, type RacingTextures } from "../textures";
import { PROFILES } from "../../world/profile";
import { THEMES } from "../theme";

/** Sand palette for the dunes: pale on crests, rich orange in the hollows, pinker on steep faces. */
const SAND_LIGHT = new Color("#f6d79a");
const SAND_MID = new Color("#e8b66a");
const SAND_DARK = new Color("#c98a48");
const SAND_SHADE = new Color("#b4703d");

/** Snow: bright on top, blue in the shade of steep drifts, bare grey rock where it is too steep to hold. */
const SNOW_LIGHT = new Color("#fbfdff");
const SNOW_MID = new Color("#e9f2fb");
const SNOW_SHADE = new Color("#a9c3df");
const SNOW_ROCK = new Color("#7d8794");

/** Mountain meadow: lush grass at the bottom, paler and yellower up high, rock on the steep faces, snow on the summits. */
const GRASS_LUSH = new Color("#47b83c");
const GRASS_BRIGHT = new Color("#7fd94f");
const GRASS_DEEP = new Color("#2f9a37");
const GRASS_HIGH = new Color("#a7d466");
const ROCK_WARM = new Color("#8c8579");
const ROCK_COOL = new Color("#9a9ca2");
const SUMMIT_SNOW = new Color("#ffffff");

/** Beach: pale dry sand, darker where the tide wets it, dune grass up high and a turquoise sea floor. */
const BEACH_PALE = new Color("#f7e7bd");
const BEACH_SAND = new Color("#ebd09a");
const BEACH_SHADE = new Color("#c9a56a");
const BEACH_WET = new Color("#c7a870");
const DUNE_GRASS = new Color("#9bbc58");
const SEA_SHALLOW = new Color("#8fe0d2");
const SEA_DEEP = new Color("#1673a6");
const FOAM = new Color("#ffffff");

/** Jungle: layered greens, red mud in the hollows, mossy rock on the steep faces. */
const JUNGLE_LUSH = new Color("#2f8a38");
const JUNGLE_BRIGHT = new Color("#4fae44");
const JUNGLE_DEEP = new Color("#1f6a2e");
const JUNGLE_MUD = new Color("#7a5232");
const JUNGLE_ROCK = new Color("#6f7466");

/** Where the ground of a world gets its colour: height, steepness (0 flat..1 vertical), and the spot it is at. */
type GroundColor = (h: number, steep: number, x: number, z: number, out: Color) => void;

/** A slowly varying 0..1 patchwork, so big fields of one colour get some life without any noise textures. */
function patch(x: number, z: number, scale: number): number {
  return 0.5 + 0.25 * Math.sin(x * scale + Math.cos(z * scale * 0.7) * 1.6) + 0.25 * Math.sin(z * scale * 1.3 - Math.sin(x * scale * 0.5) * 1.4);
}

const BEACH_WATER = PROFILES.beach.water ?? -1;

const BEACH_GROUND: GroundColor = (h, steep, x, z, out) => {
  const p = patch(x, z, 0.05);
  if (h > BEACH_WATER + 0.55) {
    out.copy(BEACH_SAND).lerp(BEACH_PALE, p * 0.7).lerp(BEACH_SHADE, clamp01(steep * 3.5));
    // Tufts of dune grass on the higher, patchy ground.
    out.lerp(DUNE_GRASS, smoothstep(1.4, 3, h) * (1 - smoothstep(4, 6, h)) * (patch(x, z, 0.12) > 0.55 ? 0.7 : 0.15));
    out.multiplyScalar(0.97 + 0.05 * patch(x, z, 0.2));
    return;
  }
  // Wet sand at the tide line, foam on the water's edge, then shallows deepening to the open sea.
  const wet = smoothstep(BEACH_WATER + 0.55, BEACH_WATER, h);
  out.copy(BEACH_SAND).lerp(BEACH_WET, wet);
  const depth = smoothstep(BEACH_WATER, BEACH_WATER - 5.5, h);
  out.lerp(SEA_SHALLOW, smoothstep(BEACH_WATER + 0.05, BEACH_WATER - 0.35, h)).lerp(SEA_DEEP, depth);
  out.lerp(FOAM, clamp01(1 - Math.abs(h - (BEACH_WATER - 0.1)) / 0.35) * 0.75);
};

const JUNGLE_GROUND: GroundColor = (_h, steep, x, z, out) => {
  const p = patch(x, z, 0.045);
  out.copy(JUNGLE_DEEP).lerp(JUNGLE_LUSH, 0.4 + p * 0.5).lerp(JUNGLE_BRIGHT, smoothstep(0.55, 0.9, patch(x, z, 0.09)) * 0.5);
  out.lerp(JUNGLE_MUD, clamp01((patch(x, z, 0.13) - 0.78) * 6) * 0.8);
  out.lerp(JUNGLE_ROCK, clamp01((steep - 0.22) * 4));
  out.multiplyScalar(0.94 + 0.08 * patch(x, z, 0.19));
};

const GROUND_COLORS: Record<WorldId, GroundColor> = {
  desert(h, steep, x, _z, out) {
    const height = clamp01(h / 22);
    // Hollows and flats: mid sand; crests: light; steep faces: shaded toward rust.
    out.copy(SAND_MID).lerp(SAND_LIGHT, height * 0.8).lerp(SAND_DARK, clamp01(1 - height * 3) * 0.25).lerp(SAND_SHADE, clamp01(steep * 3.2));
    // Wind ripples: a faint banding with height.
    out.multiplyScalar(0.97 + 0.03 * Math.sin(h * 3.1 + x * 0.05));
  },
  winter(h, steep, x, z, out) {
    const height = clamp01(h / 55);
    out.copy(SNOW_MID).lerp(SNOW_LIGHT, 0.35 + height * 0.5).lerp(SNOW_SHADE, clamp01(steep * 2.4)).lerp(SNOW_ROCK, clamp01((steep - 0.34) * 4));
    // Faint wind-blown shading across the drifts.
    out.multiplyScalar(0.965 + 0.035 * patch(x, z, 0.045));
  },
  alpine(h, steep, x, z, out) {
    const p = patch(x, z, 0.03);
    // Grass in a patchwork of lush and bright greens, getting paler with altitude.
    out.copy(GRASS_LUSH).lerp(GRASS_BRIGHT, p * 0.75).lerp(GRASS_DEEP, clamp01(0.5 - p) * 0.5);
    out.lerp(GRASS_HIGH, smoothstep(30, 85, h) * 0.8);
    // Rock where the slope is steep, and above the grass line.
    const rock = clamp01((steep - 0.2) * 4.5) + smoothstep(78, 118, h);
    out.lerp(patch(x, z, 0.06) > 0.5 ? ROCK_WARM : ROCK_COOL, clamp01(rock));
    // Snow on the high summits, shed by the steepest faces.
    out.lerp(SUMMIT_SNOW, smoothstep(128, 160, h) * clamp01(1 - (steep - 0.35) * 2.5));
    out.multiplyScalar(0.96 + 0.06 * patch(x, z, 0.11));
  },
  beach: BEACH_GROUND,
  jungle: JUNGLE_GROUND,
};

/**
 * The ground: one vertex-coloured mesh over the whole racing area. Heights come
 * from the same Terrain the camera uses, so what you see is what the camera
 * stays above. Beyond its edge a flat plane carries on to the horizon.
 */
export function buildTerrain(terrain: Terrain, kit: MeshKit, world: WorldId, cell = 7): Group {
  const b = terrain.bounds;
  const nx = Math.ceil((b.maxX - b.minX) / cell) + 1;
  const nz = Math.ceil((b.maxZ - b.minZ) / cell) + 1;
  const positions = new Float32Array(nx * nz * 3);
  const heights = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = b.minX + i * cell;
      const z = b.minZ + j * cell;
      const h = terrain.heightAt(x, z);
      const k = j * nx + i;
      heights[k] = h;
      positions[k * 3] = x;
      positions[k * 3 + 1] = h;
      positions[k * 3 + 2] = z;
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const bb = a + 1;
      const c = a + nx;
      const d = c + 1;
      // Alternate the diagonal so crests do not all lean one way.
      if ((i + j) % 2 === 0) indices.push(a, c, bb, bb, c, d);
      else indices.push(a, c, d, a, d, bb);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const normal = geo.getAttribute("normal");
  const colors = new Float32Array(nx * nz * 3);
  const c = new Color();
  const colorFor = GROUND_COLORS[world];
  for (let k = 0; k < nx * nz; k++) {
    colorFor(heights[k], clamp01(1 - normal.getY(k)), positions[k * 3], positions[k * 3 + 2], c);
    colors[k * 3] = c.r;
    colors[k * 3 + 1] = c.g;
    colors[k * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  kit.geo("terrain", () => geo);

  const material = kit.track(new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  const mesh = new Mesh(geo, material);
  mesh.receiveShadow = true;

  // Flat ground to the horizon, the colour the terrain fades to.
  const floorGeo = kit.geo("floor", () => new PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2));
  const floor = new Mesh(floorGeo, kit.mat(THEMES[world].floor, { rough: 1, flat: false }));
  floor.position.set((b.minX + b.maxX) / 2, (PROFILES[world].terrain.baseline ?? 0) - 0.06, (b.minZ + b.maxZ) / 2);
  floor.receiveShadow = true;

  const group = new Group();
  group.add(floor, mesh);
  return group;
}

/**
 * How many times the dirt texture repeats along the whole loop. The texture is
 * ROAD_TEX.height / ROAD_TEX.width times taller than wide, so one repeat covers
 * (road width + margin) * that ratio of road: pixels stay square and the loop
 * closes on a whole number of repeats.
 */
function tileLength(track: Track): { tiles: number } {
  let width = 0;
  for (let i = 0; i < track.count; i++) width += track.width[i] + 2.4;
  const avg = width / track.count;
  return { tiles: Math.max(1, Math.round(track.length / (avg * (ROAD_TEX.height / ROAD_TEX.width)))) };
}

/**
 * The road: a ribbon along the centre line, slightly wider than the road so
 * the soft-edged dirt texture melts into the sand.
 */
export function buildRoad(track: Track, kit: MeshKit, textures: RacingTextures): Mesh {
  const n = track.count;
  const { tiles } = tileLength(track);
  const pos = new Float32Array((n + 1) * 2 * 3);
  const uv = new Float32Array((n + 1) * 2 * 2);
  const idx: number[] = [];
  for (let k = 0; k <= n; k++) {
    const i = k % n;
    const half = track.width[i] / 2 + 1.2;
    const rx = -track.tz[i];
    const rz = track.tx[i];
    const l = k * 2;
    const y = track.hillAt(i * track.spacing) + 0.04;
    pos.set([track.px[i] - rx * half, y, track.pz[i] - rz * half], l * 3);
    pos.set([track.px[i] + rx * half, y, track.pz[i] + rz * half], (l + 1) * 3);
    const v = (k / n) * tiles;
    uv.set([0, v], l * 2);
    uv.set([1, v], (l + 1) * 2);
    // Counter-clockwise seen from above (left edge, right edge, next left; then right, next right, next left).
    if (k < n) idx.push(l, l + 1, l + 2, l + 1, l + 3, l + 2);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("uv", new BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  kit.geo("road", () => geo);
  textures.road.wrapT = RepeatWrapping;
  const mat = kit.track(
    new MeshStandardMaterial({ map: textures.road, roughness: 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  const mesh = new Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  return mesh;
}

/** The chequered line across the road at s = 0. */
export function buildStartLine(track: Track, kit: MeshKit, textures: RacingTextures): Group {
  const c = track.checkpoints[0];
  const group = new Group();
  const width = c.halfWidth * 2;
  const geo = kit.geo(`line-${width.toFixed(1)}`, () => new PlaneGeometry(width, 4.5).rotateX(-Math.PI / 2));
  const mat = kit.track(new MeshStandardMaterial({ map: textures.checker, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  const line = new Mesh(geo, mat);
  line.position.y = 0.07;
  line.receiveShadow = true;
  group.add(line);
  group.position.set(c.x, c.y, c.z);
  group.rotation.y = c.heading;
  return group;
}

/**
 * Kicker ramps. Each ramp is a wedge across the whole corridor (road and
 * shoulders), built from the same height profile the car drives over:
 * a plank surface rising to `height`, then a vertical drop.
 */
export function buildRamps(track: Track, kit: MeshKit, textures: RacingTextures): Group {
  const group = new Group();
  const top = kit.track(new MeshStandardMaterial({ map: textures.planks, roughness: 0.85, side: DoubleSide }));
  const side = kit.track(new MeshStandardMaterial({ color: "#7a4a26", roughness: 0.9, flatShading: true, side: DoubleSide }));
  for (const ramp of track.ramps) {
    const steps = Math.max(2, Math.round(ramp.length / track.spacing));
    const topPos: number[] = [];
    const topUv: number[] = [];
    const topIdx: number[] = [];
    const rails: number[] = [];
    const railIdx: number[] = [];
    const edge = (t: number) => {
      const s = ramp.s0 + t * ramp.length;
      const p = track.sample(s);
      const b = p.halfWidth + track.def.shoulder + 1;
      return { s, p, b, y: ramp.height * t };
    };
    for (let k = 0; k <= steps; k++) {
      const e = edge(k / steps);
      const rx = -e.p.tz;
      const rz = e.p.tx;
      topPos.push(e.p.x - rx * e.b, e.y + 0.02, e.p.z - rz * e.b, e.p.x + rx * e.b, e.y + 0.02, e.p.z + rz * e.b);
      topUv.push(0, (k / steps) * 2, 1, (k / steps) * 2);
      if (k < steps) topIdx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
    const topGeo = new BufferGeometry();
    topGeo.setAttribute("position", new Float32BufferAttribute(topPos, 3));
    topGeo.setAttribute("uv", new Float32BufferAttribute(topUv, 2));
    topGeo.setIndex(topIdx);
    topGeo.computeVertexNormals();
    kit.geo(`ramp-top-${ramp.s0}`, () => topGeo);
    const topMesh = new Mesh(topGeo, top);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Vertical back face and the two triangular sides.
    const last = edge(1);
    const first = edge(0);
    const lx = -last.p.tz;
    const lz = last.p.tx;
    const fx = -first.p.tz;
    const fz = first.p.tx;
    const backA = [last.p.x - lx * last.b, 0, last.p.z - lz * last.b];
    const backB = [last.p.x + lx * last.b, 0, last.p.z + lz * last.b];
    const backC = [last.p.x + lx * last.b, last.y, last.p.z + lz * last.b];
    const backD = [last.p.x - lx * last.b, last.y, last.p.z - lz * last.b];
    const leftFoot = [first.p.x - fx * first.b, 0, first.p.z - fz * first.b];
    const rightFoot = [first.p.x + fx * first.b, 0, first.p.z + fz * first.b];
    rails.push(...backA, ...backB, ...backC, ...backD, ...leftFoot, ...rightFoot);
    // back quad, then each side as a triangle to the foot of the ramp.
    railIdx.push(0, 1, 2, 0, 2, 3, 0, 3, 4, 1, 5, 2);
    const wallGeo = new BufferGeometry();
    wallGeo.setAttribute("position", new Float32BufferAttribute(rails, 3));
    wallGeo.setIndex(railIdx);
    wallGeo.computeVertexNormals();
    kit.geo(`ramp-wall-${ramp.s0}`, () => wallGeo);
    const wall = new Mesh(wallGeo, side);
    wall.castShadow = true;
    group.add(wall);
  }
  return group;
}

/** The sea: one big translucent plane at the water level. `update` slides its ripples so the water looks alive. */
export interface Water {
  mesh: Mesh;
  update(time: number): void;
}

export function buildWater(terrain: Terrain, kit: MeshKit, textures: RacingTextures, level: number): Water {
  const b = terrain.bounds;
  const size = 9000;
  const tile = 36;
  const geo = kit.geo("water", () => new PlaneGeometry(size, size).rotateX(-Math.PI / 2));
  const map = textures.water;
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.repeat.set(size / tile, size / tile);
  const mat = kit.track(
    new MeshStandardMaterial({ map, color: "#3fb6dc", roughness: 0.28, metalness: 0.1, transparent: true, opacity: 0.8, emissive: "#0b5d86", emissiveIntensity: 0.25 }),
  );
  const mesh = new Mesh(geo, mat);
  mesh.position.set((b.minX + b.maxX) / 2, level, (b.minZ + b.maxZ) / 2);
  mesh.renderOrder = 2;
  return {
    mesh,
    update(time: number) {
      map.offset.set((time * 0.5) / tile, (time * 0.3) / tile);
    },
  };
}
