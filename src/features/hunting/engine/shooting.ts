import type { Rng } from "@/lib/rng";
import type { Vec3 } from "../types";
import { angleBetween, cross, dot, norm, sub } from "./vec";

export interface ShotTarget {
  id: number;
  pos: Vec3;
  radius: number;
}

/** Distance along a unit ray to the first point on a sphere, or null when it misses (or the sphere is behind). */
export function raySphere(origin: Vec3, dir: Vec3, center: Vec3, radius: number): number | null {
  const oc = sub(origin, center);
  const b = dot(oc, dir);
  const c = dot(oc, oc) - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t0 = -b - s;
  if (t0 >= 0) return t0;
  const t1 = -b + s;
  return t1 >= 0 ? 0 : null;
}

/** Perpendicular distance from a point to a unit ray (Infinity when the point is behind the origin). */
export function rayPointDistance(origin: Vec3, dir: Vec3, p: Vec3): number {
  const op = sub(p, origin);
  const t = dot(op, dir);
  if (t < 0) return Infinity;
  const cx = op.x - dir.x * t;
  const cy = op.y - dir.y * t;
  const cz = op.z - dir.z * t;
  return Math.hypot(cx, cy, cz);
}

/** Two unit vectors perpendicular to `dir`. */
function basis(dir: Vec3): [Vec3, Vec3] {
  const helper = Math.abs(dir.y) < 0.95 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const u = norm(cross(dir, helper));
  const w = cross(dir, u);
  return [u, w];
}

/**
 * Pellet directions for one shotgun shell: the first flies dead centre, the rest
 * spread evenly (by area) inside a cone of half-angle `spread`.
 */
export function pelletDirections(dir: Vec3, count: number, spread: number, rng: Rng): Vec3[] {
  const d = norm(dir);
  const [u, w] = basis(d);
  const out: Vec3[] = [d];
  for (let i = 1; i < count; i++) {
    const a = spread * Math.sqrt(rng());
    const phi = rng() * Math.PI * 2;
    const tan = Math.tan(a);
    const x = Math.cos(phi) * tan;
    const y = Math.sin(phi) * tan;
    out.push(norm({ x: d.x + u.x * x + w.x * y, y: d.y + u.y * x + w.y * y, z: d.z + u.z * x + w.z * y }));
  }
  return out;
}

/** Ids of every target any pellet touches within range, nearest first. */
export function resolveShot(origin: Vec3, pellets: readonly Vec3[], targets: readonly ShotTarget[], range: number): number[] {
  const hits: { id: number; t: number }[] = [];
  for (const target of targets) {
    let best = Infinity;
    for (const p of pellets) {
      const t = raySphere(origin, p, target.pos, target.radius);
      if (t !== null && t <= range && t < best) best = t;
    }
    if (best < Infinity) hits.push({ id: target.id, t: best });
  }
  hits.sort((a, b) => a.t - b.t);
  return hits.map((h) => h.id);
}

/** The target closest (by angle) to the aim direction inside `cone`, if any. */
export function assistTarget(origin: Vec3, aim: Vec3, targets: readonly ShotTarget[], cone: number): { id: number; dir: Vec3; angle: number } | null {
  let best: { id: number; dir: Vec3; angle: number } | null = null;
  for (const target of targets) {
    const to = norm(sub(target.pos, origin));
    const angle = angleBetween(aim, to);
    if (angle <= cone && (!best || angle < best.angle)) best = { id: target.id, dir: to, angle };
  }
  return best;
}
