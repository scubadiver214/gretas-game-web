/** Small numeric helpers shared by the racing engine, camera and renderer. No allocations. */

export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing: moves `current` toward `target` at rate `lambda` (1/s). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Wraps an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  let r = a % TAU;
  if (r > Math.PI) r -= TAU;
  else if (r <= -Math.PI) r += TAU;
  return r;
}

/** Shortest signed difference `a - b` in radians. */
export function angleDiff(a: number, b: number): number {
  return wrapAngle(a - b);
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  return target + wrapAngle(current - target) * Math.exp(-lambda * dt);
}

/** Signed distance on a loop of `length`, mapped to [-length/2, length/2). */
export function wrapLoop(d: number, length: number): number {
  const half = length / 2;
  let r = (d + half) % length;
  if (r < 0) r += length;
  return r - half;
}

/** Position in [0, length). */
export function modLoop(s: number, length: number): number {
  const r = s % length;
  return r < 0 ? r + length : r;
}

/** Heading convention: forward is (sin h, cos h) in the (x, z) plane, matching three.js rotation.y. */
export function fwdX(heading: number): number {
  return Math.sin(heading);
}

export function fwdZ(heading: number): number {
  return Math.cos(heading);
}

/** Heading whose forward vector points along (dx, dz). */
export function headingOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}
