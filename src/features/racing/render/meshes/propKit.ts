import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { hashString, mulberry32 } from "@/lib/rng";
import type { MeshKit } from "@/components/three/kit";
import type { Obstacle, Placement, TrackContent } from "../../world/content";
import type { WorldId } from "../../world/track";
import type { RacingTextures } from "../textures";

const m4 = new Matrix4();
const q4 = new Quaternion();
const v3 = new Vector3();
const s3 = new Vector3();
const e3 = new Euler();

/** Pseudo-noise that depends only on a position, so split vertices of a non-indexed mesh move together. */
export function posNoise(x: number, y: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.1) * 43758.5453;
  return n - Math.floor(n);
}

export function tint(geo: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex);
  const n = geo.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geo;
}

/** A coloured, positioned copy of a primitive, ready to merge. */
export function part(geo: BufferGeometry, hex: string, p: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]): BufferGeometry {
  const g = geo.clone();
  tint(g, hex);
  e3.set(rot[0], rot[1], rot[2]);
  m4.compose(v3.set(p[0], p[1], p[2]), q4.setFromEuler(e3), s3.set(scale[0], scale[1], scale[2]));
  g.applyMatrix4(m4);
  return g;
}

export function merge(parts: BufferGeometry[]): BufferGeometry {
  // Primitives mix indexed and non-indexed geometry; merging needs them all alike.
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(flat, false);
  for (const p of parts) p.dispose();
  for (const p of flat) p.dispose();
  if (!merged) throw new Error("racing: could not merge prop geometry");
  return merged;
}

/** Lumpy rock: a squashed, jittered icosphere. */
export function rockGeometry(seed: number): BufferGeometry {
  const g = new IcosahedronGeometry(1, 1);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 0.78 + posNoise(Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(z * 100) / 100, seed) * 0.5;
    pos.setXYZ(i, x * k, Math.max(y * k * 0.72, -0.28), z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** A rock whose upward-facing surfaces are covered in `cap` (snow, or moss). Carries vertex colours. */
export function cappedRockGeometry(seed: number, rock: string, cap: string): BufferGeometry {
  const g = rockGeometry(seed).toNonIndexed();
  g.computeVertexNormals();
  const normal = g.getAttribute("normal");
  const n = g.getAttribute("position").count;
  const base = new Color(rock);
  const top = new Color(cap);
  const c = new Color();
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const up = Math.min(1, Math.max(0, (normal.getY(i) - 0.3) / 0.4));
    c.copy(base).lerp(top, up);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return g;
}

export function hayGeometry(): BufferGeometry {
  const bale = new CylinderGeometry(0.9, 0.9, 2.6, 14);
  const band = new CylinderGeometry(0.93, 0.93, 0.16, 14);
  const parts: BufferGeometry[] = [];
  for (const z of [-0.92, 0.92]) {
    parts.push(part(bale, "#e3c36a", [0, 0.9, z], [0, 0, Math.PI / 2]));
    for (const x of [-0.7, 0.7]) parts.push(part(band, "#a98a3a", [x, 0.9, z], [0, 0, Math.PI / 2]));
  }
  parts.push(part(bale, "#ebcf7a", [0, 1.68, 0], [0, 0, Math.PI / 2]));
  for (const x of [-0.7, 0.7]) parts.push(part(band, "#a98a3a", [x, 1.68, 0], [0, 0, Math.PI / 2]));
  return merge(parts);
}

export function tiresGeometry(): BufferGeometry {
  const tire = new TorusGeometry(0.62, 0.3, 8, 16);
  const parts: BufferGeometry[] = [];
  for (const x of [-0.85, 0.85]) {
    for (let i = 0; i < 3; i++) parts.push(part(tire, i === 1 ? "#ffffff" : "#e53935", [x, 0.3 + i * 0.58, 0], [Math.PI / 2, 0, 0]));
  }
  return merge(parts);
}

/** A fence post carrying a two-sided pennant. `flags` picks the pennant colour of each variant. */
export function postGeometry(variant: number, flags: readonly [string, string]): BufferGeometry {
  const flag = flags[variant % 2];
  return merge([
    part(new BoxGeometry(0.24, 3.2, 0.24), "#8a5a33", [0, 1.6, 0]),
    part(new PlaneGeometry(1.1, 0.7), flag, [0.62, 2.8, 0]),
    part(new PlaneGeometry(1.1, 0.7), flag, [0.62, 2.8, 0], [0, Math.PI, 0]),
  ]);
}

export function signPostsGeometry(): BufferGeometry {
  return merge([part(new BoxGeometry(0.16, 3.6, 0.16), "#6b7280", [-1.3, 1.8, -0.1]), part(new BoxGeometry(0.16, 3.6, 0.16), "#6b7280", [1.3, 1.8, -0.1])]);
}

/** Places one InstancedMesh from placements; `colorOf` tints each instance. */
export function instanced(
  geo: BufferGeometry,
  material: MeshStandardMaterial,
  placements: readonly Placement[],
  opts: { shadow?: boolean; receive?: boolean; colorOf?: (p: Placement, i: number) => Color; stretch?: [number, number, number] } = {},
): InstancedMesh | null {
  if (placements.length === 0) return null;
  const mesh = new InstancedMesh(geo, material, placements.length);
  const stretch = opts.stretch ?? [1, 1, 1];
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    q4.setFromAxisAngle(v3.set(0, 1, 0), p.rot);
    m4.compose(v3.set(p.x, p.y, p.z), q4, s3.set(p.scale * stretch[0], p.scale * stretch[1], p.scale * stretch[2]));
    mesh.setMatrixAt(i, m4);
    if (opts.colorOf) mesh.setColorAt(i, opts.colorOf(p, i));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = opts.shadow ?? false;
  mesh.receiveShadow = opts.receive ?? true;
  return mesh;
}

export function palette(hexes: readonly string[]): Color[] {
  return hexes.map((c) => new Color(c));
}

/** A repeatable pick from a palette that depends only on where the thing stands, lightly brightened or darkened. */
export function pickColor(colors: readonly Color[], x: number, z: number, out: Color): Color {
  const r = mulberry32(hashString(`${x.toFixed(1)},${z.toFixed(1)}`))();
  out.copy(colors[Math.floor(r * colors.length)]);
  return out.multiplyScalar(0.88 + r * 0.24);
}

export function obstaclePlacement(o: Obstacle, scale = 1): Placement {
  const r = mulberry32(hashString(`${o.x.toFixed(1)},${o.z.toFixed(1)}`))();
  return { x: o.x, y: o.y ?? 0, z: o.z, rot: r * Math.PI * 2, scale, variant: Math.floor(r * 3) };
}

/** Everything a world's prop builder needs. */
export interface PropContext {
  content: TrackContent;
  kit: MeshKit;
  textures: RacingTextures;
  group: Group;
  scratch: Color;
  add(mesh: InstancedMesh | null): void;
  /** A flat-shaded material for props; vertex colours carry the paint. */
  std(opts?: { vertexColors?: boolean; doubleSided?: boolean; rough?: number; metal?: number }): MeshStandardMaterial;
}

export function makeContext(content: TrackContent, kit: MeshKit, textures: RacingTextures): PropContext {
  const group = new Group();
  return {
    content,
    kit,
    textures,
    group,
    scratch: new Color(),
    add: (m) => {
      if (m) group.add(m);
    },
    std: (opts = {}) =>
      kit.track(
        new MeshStandardMaterial({
          color: "#ffffff",
          roughness: opts.rough ?? 0.9,
          metalness: opts.metal ?? 0,
          flatShading: true,
          vertexColors: opts.vertexColors ?? false,
          ...(opts.doubleSided ? { side: DoubleSide } : {}),
        }),
      ),
  };
}

/** The pennant colours of the two fence-post variants in each world. */
export const POST_FLAGS: Record<WorldId, readonly [string, string]> = {
  desert: ["#ff7a1a", "#ffffff"],
  winter: ["#2e86ff", "#ffffff"],
  alpine: ["#e8312f", "#ffffff"],
  beach: ["#ff4f9a", "#ffffff"],
  jungle: ["#ffd23f", "#ffffff"],
};

/** Posts with pennants, hay bales and tyres (shared by several worlds). */
export function addPosts(ctx: PropContext, world: WorldId): void {
  const flagMat = ctx.std({ vertexColors: true, doubleSided: true });
  for (let variant = 0; variant < 2; variant++) {
    ctx.add(instanced(ctx.kit.geo(`post-${world}-${variant}`, () => postGeometry(variant, POST_FLAGS[world])), flagMat, ctx.content.scatter.posts.filter((p) => p.variant === variant), { shadow: true }));
  }
}

export function addHay(ctx: PropContext): void {
  const mat = ctx.std({ vertexColors: true });
  ctx.add(instanced(ctx.kit.geo("hay", hayGeometry), mat, ctx.content.obstacles.filter((o) => o.kind === "hay").map((o) => obstaclePlacement(o, 1)), { shadow: true }));
}

export function addTires(ctx: PropContext): void {
  const mat = ctx.std({ vertexColors: true });
  ctx.add(instanced(ctx.kit.geo("tires", tiresGeometry), mat, ctx.content.obstacles.filter((o) => o.kind === "tires").map((o) => obstaclePlacement(o, 1)), { shadow: true }));
}

/** Boulders on the shoulders, drawn like the world's own rocks. */
export function addBoulders(ctx: PropContext, colors: readonly Color[]): void {
  const boulders = ctx.content.obstacles.filter((o) => o.kind === "boulder");
  if (!boulders.length) return;
  const geo = ctx.kit.geo("rock-0", () => rockGeometry(1));
  ctx.add(instanced(geo, ctx.std(), boulders.map((o) => obstaclePlacement(o, o.r * 1.12)), { shadow: true, colorOf: (p) => pickColor(colors, p.x, p.z, ctx.scratch) }));
}

/**
 * A pine: a trunk and stacked, tapering tiers of branches. `snow` (when given) puts a
 * cap of that colour on every tier. Variants: 0 tall, 1 broad and short, 2 tallest and slim.
 */
export function pineGeometry(variant: number, greens: readonly [string, string, string], snow: string | null): BufferGeometry {
  const tiers = [4, 3, 5][variant % 3];
  const spread = [1, 1.18, 0.82][variant % 3];
  const parts: BufferGeometry[] = [part(new CylinderGeometry(0.26, 0.36, 1.5, 7), "#6b4a2e", [0, 0.75, 0])];
  for (let i = 0; i < tiers; i++) {
    const radius = (1.9 - (i * 1.15) / tiers) * spread;
    const y = 1.2 + i * 1.12 + 1.05;
    parts.push(part(new ConeGeometry(radius, 2.1, 9), greens[i % 3], [0, y, 0]));
    if (snow) parts.push(part(new ConeGeometry(radius * 0.76, 1.15, 9), snow, [0, y + 0.5, 0]));
  }
  return merge(parts);
}
