import type { Vec3 } from "../types";

export const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
export const clone = (a: Vec3): Vec3 => ({ x: a.x, y: a.y, z: a.z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const len = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

export function norm(a: Vec3): Vec3 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: -1 };
}

export const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Angle between two unit vectors. */
export const angleBetween = (a: Vec3, b: Vec3): number => Math.acos(clamp(dot(a, b), -1, 1));

/** Rotate unit vector `from` toward unit vector `to` by at most `maxAngle` radians. */
export function rotateToward(from: Vec3, to: Vec3, maxAngle: number): Vec3 {
  const angle = angleBetween(from, to);
  if (angle <= maxAngle || angle < 1e-6) return clone(to);
  const t = maxAngle / angle;
  // Slerp between the two directions.
  const s = Math.sin(angle);
  const a = Math.sin((1 - t) * angle) / s;
  const b = Math.sin(t * angle) / s;
  return norm({ x: from.x * a + to.x * b, y: from.y * a + to.y * b, z: from.z * a + to.z * b });
}

/** Heading (yaw) of a horizontal direction, 0 = -Z, positive = turning left. Matches the camera yaw. */
export const headingOf = (d: Vec3): number => Math.atan2(-d.x, -d.z);

export const wrapAngle = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};
