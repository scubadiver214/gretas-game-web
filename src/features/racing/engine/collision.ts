import { TRAFFIC } from "../config";
import type { Obstacle } from "../world/content";
import type { TrackQuery } from "../world/track";
import { angleDiff, clamp } from "./math";
import type { VehicleState } from "./vehicle";

/** Restitution of the boundary wall: a firm but friendly bounce. */
const WALL_BOUNCE = 0.28;
/** How hard a wall steers a glancing car back along itself (0..1 per hit). */
const WALL_ALIGN = 0.14;

/**
 * Keeps a car inside the corridor (road + shoulders). Pushes it back, bounces
 * the part of its velocity that was heading out, scrubs speed in proportion
 * to how hard it hit (scaled by `penalty`, which is gentler for small kids)
 * and nudges a glancing car to run along the wall instead of stopping dead.
 * Returns the impact speed, or 0 if the car is clear.
 */
export function resolveBoundary(v: VehicleState, q: TrackQuery, radius: number, penalty: number, dt: number): number {
  const limit = q.boundary - radius;
  const over = Math.abs(q.lateral) - limit;
  if (over <= 0) return 0;

  const side = Math.sign(q.lateral);
  // Inward normal: left of travel when the car is on the right side, and vice versa.
  const nx = side * q.tz;
  const nz = -side * q.tx;
  v.x += nx * over;
  v.z += nz * over;
  q.lateral = side * limit;

  const vn = v.vx * nx + v.vz * nz;
  let impact = 0;
  if (vn < 0) {
    impact = -vn;
    const j = -(1 + WALL_BOUNCE) * vn;
    v.vx += nx * j;
    v.vz += nz * j;
    const scrub = 1 - penalty * clamp(impact / 22, 0.04, 0.6);
    v.vx *= scrub;
    v.vz *= scrub;
    if (impact > 1.5) {
      // Swing the nose toward the direction of the wall that the car was already mostly travelling in.
      const along = v.vx * q.tx + v.vz * q.tz >= 0 ? q.heading : q.heading + Math.PI;
      v.heading += angleDiff(along, v.heading) * WALL_ALIGN;
    }
  }
  // Rubbing along a wall always costs a little.
  const rub = 1 - 0.45 * penalty * dt;
  v.vx *= rub;
  v.vz *= rub;
  return impact;
}

/**
 * Two cars touching: pushes them apart and trades the closing part of their velocity,
 * shared by mass (`ma`, `mb`), so a monster truck shoves a bubble car further than the
 * other way round. Cars at different heights (one mid-jump) pass. Returns the closing
 * speed, or 0 if they were not touching or were already separating.
 */
export function resolveCars(a: VehicleState, ra: number, ma: number, b: VehicleState, rb: number, mb: number): number {
  if (Math.abs(a.y - b.y) > TRAFFIC.maxHeightGap) return 0;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const min = ra + rb;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return 0;
  const d = Math.sqrt(d2);
  let nx: number;
  let nz: number;
  if (d < 1e-4) {
    nx = Math.cos(a.heading);
    nz = -Math.sin(a.heading);
  } else {
    nx = dx / d;
    nz = dz / d;
  }
  const wa = mb / (ma + mb);
  const wb = ma / (ma + mb);
  const overlap = min - d;
  a.x -= nx * overlap * wa;
  a.z -= nz * overlap * wa;
  b.x += nx * overlap * wb;
  b.z += nz * overlap * wb;
  const closing = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (closing >= 0) return 0;
  const j = (-(1 + TRAFFIC.bounce) * closing) / (1 / ma + 1 / mb);
  a.vx -= (nx * j) / ma;
  a.vz -= (nz * j) / ma;
  b.vx += (nx * j) / mb;
  b.vz += (nz * j) / mb;
  return -closing;
}

/** Fraction of the speed a car loses into an animal (the rest carries on past it). */
const ANIMAL_ABSORB = 0.6;

/**
 * Solid circles: cacti, hay, tyres, boulders. A car that is airborne above an
 * obstacle sails over it. Returns the strongest impact speed, or 0.
 */
export function resolveObstacles(v: VehicleState, nearby: readonly Obstacle[], radius: number, penalty: number): number {
  let strongest = 0;
  for (let i = 0; i < nearby.length; i++) {
    const o = nearby[i];
    if (v.y > (o.y ?? 0) + o.height - 0.25) continue;
    const dx = v.x - o.x;
    const dz = v.z - o.z;
    const min = o.r + radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2);
    let nx: number;
    let nz: number;
    if (d < 1e-4) {
      nx = -Math.sin(v.heading);
      nz = -Math.cos(v.heading);
    } else {
      nx = dx / d;
      nz = dz / d;
    }
    v.x = o.x + nx * min;
    v.z = o.z + nz * min;
    const vn = v.vx * nx + v.vz * nz;
    if (vn < 0) {
      const impact = -vn;
      // Animals are not walls: the car shoulders past (loses most of its speed into them, but never bounces back).
      const soft = o.kind === "animal";
      const j = soft ? -ANIMAL_ABSORB * vn : -(1 + o.bounce) * vn;
      v.vx += nx * j;
      v.vz += nz * j;
      const scrub = 1 - penalty * (soft ? 0.2 : 0.4) * clamp(impact / 20, 0.12, 1);
      v.vx *= scrub;
      v.vz *= scrub;
      if (impact > strongest) strongest = impact;
    }
  }
  return strongest;
}
