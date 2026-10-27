import { BufferAttribute, BufferGeometry, Color, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3, type Material } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Painter = (p: Vector3, n: Vector3, out: Color) => void;

const _p = new Vector3();
const _n = new Vector3();
const _c = new Color();

/** Bake a per-vertex colour into the geometry from its position and normal. */
export function paint(g: BufferGeometry, painter: Painter): BufferGeometry {
  const pos = g.getAttribute("position");
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const nrm = g.getAttribute("normal");
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i);
    _n.fromBufferAttribute(nrm, i);
    painter(_p, _n, _c);
    col[i * 3] = _c.r;
    col[i * 3 + 1] = _c.g;
    col[i * 3 + 2] = _c.b;
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}

export function solid(g: BufferGeometry, color: Color | string): BufferGeometry {
  const c = typeof color === "string" ? new Color(color) : color;
  return paint(g, (_p, _n, out) => out.copy(c));
}

/** Merge geometries that only need position / normal / colour (uvs dropped so mixed sources merge). */
export function mergeColored(parts: BufferGeometry[]): BufferGeometry {
  const prepared = parts.map((g) => {
    const x = g.index ? g.toNonIndexed() : g.clone();
    for (const name of Object.keys(x.attributes)) if (name !== "position" && name !== "normal" && name !== "color") x.deleteAttribute(name);
    if (!x.getAttribute("normal")) x.computeVertexNormals();
    return x;
  });
  const merged = mergeGeometries(prepared, false);
  for (const g of prepared) g.dispose();
  for (const g of parts) g.dispose();
  if (!merged) throw new Error("mergeColored: incompatible geometries");
  merged.computeBoundingSphere();
  return merged;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _t = new Vector3();
const _s = new Vector3();

/** Position / rotate (Euler XYZ) / scale a geometry in place and return it. */
export function place(g: BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scl: [number, number, number] | number = 1): BufferGeometry {
  const s = typeof scl === "number" ? [scl, scl, scl] : scl;
  _q.setFromEuler(_e.set(rot[0], rot[1], rot[2]));
  return g.applyMatrix4(_m.compose(_t.set(pos[0], pos[1], pos[2]), _q, _s.set(s[0], s[1], s[2])));
}

/**
 * A tube through `points` whose radius follows `radii` (same length), with
 * `radial` sides. Rings use a parallel-transport frame so the tube never twists.
 */
export function taperedTube(points: Vector3[], radii: number[], radial = 8): BufferGeometry {
  const n = points.length;
  const pos: number[] = [];
  const index: number[] = [];
  const tangent = new Vector3();
  let normal = new Vector3(1, 0, 0);
  const binormal = new Vector3();
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const t = new Vector3().subVectors(b, a).normalize();
    if (i === 0) {
      const helper = Math.abs(t.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      normal = new Vector3().crossVectors(t, helper).normalize();
    } else {
      const axis = new Vector3().crossVectors(tangent, t);
      if (axis.lengthSq() > 1e-10) {
        axis.normalize();
        const ang = Math.acos(Math.min(1, Math.max(-1, tangent.dot(t))));
        normal.applyAxisAngle(axis, ang);
      }
    }
    tangent.copy(t);
    binormal.crossVectors(t, normal).normalize();
    for (let j = 0; j <= radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const cx = Math.cos(th) * radii[i];
      const cy = Math.sin(th) * radii[i];
      pos.push(points[i].x + normal.x * cx + binormal.x * cy, points[i].y + normal.y * cx + binormal.y * cy, points[i].z + normal.z * cx + binormal.z * cy);
    }
  }
  const cols = radial + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * cols + j;
      const b = a + cols;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Points along a quadratic Bezier. */
export function bezier(a: Vector3, c: Vector3, b: Vector3, steps: number): Vector3[] {
  const out: Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push(new Vector3(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y, u * u * a.z + 2 * u * t * c.z + t * t * b.z));
  }
  return out;
}

/** Dispose every geometry and material under an object. */
export function disposeTree(root: { traverse: (cb: (o: unknown) => void) => void }, keep?: Set<unknown>): void {
  root.traverse((o) => {
    const m = o as { geometry?: BufferGeometry; material?: Material | Material[] };
    if (m.geometry && !keep?.has(m.geometry)) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) if (!keep?.has(mat)) mat.dispose();
  });
}

/** Tiny deterministic random for decoration placement. */
export function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
