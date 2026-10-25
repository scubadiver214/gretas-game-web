import { BufferGeometry, Color, Float32BufferAttribute } from "three";

/** One cross-section of a lofted body, at a position along the car (z, nose toward +z). */
export interface Station {
  z: number;
  /** Lowest and highest point of the section. */
  bottom: number;
  top: number;
  /** Half the width at the widest point. */
  hw: number;
}

/** A dense, smooth run of stations, built once and reused for both the mesh and for placing details on it. */
export type Profile = readonly Station[];

/** Catmull-Rom between p1 and p2, with p0 and p3 as neighbours. */
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Smooths the keyframe stations into `sub` steps per interval. */
export function profileOf(keys: readonly Station[], sub = 6): Profile {
  const out: Station[] = [];
  const n = keys.length;
  for (let i = 0; i < n - 1; i++) {
    const a = keys[Math.max(0, i - 1)];
    const b = keys[i];
    const c = keys[i + 1];
    const d = keys[Math.min(n - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      out.push({
        z: cr(a.z, b.z, c.z, d.z, t),
        bottom: cr(a.bottom, b.bottom, c.bottom, d.bottom, t),
        top: cr(a.top, b.top, c.top, d.top, t),
        hw: Math.max(0.001, cr(a.hw, b.hw, c.hw, d.hw, t)),
      });
    }
  }
  out.push({ ...keys[n - 1] });
  return out;
}

/** The profile's section at `z` (linear between neighbouring dense stations). */
export function sampleAt(profile: Profile, z: number): Station {
  if (z <= profile[0].z) return profile[0];
  for (let i = 1; i < profile.length; i++) {
    const b = profile[i];
    if (z <= b.z) {
      const a = profile[i - 1];
      const t = (z - a.z) / Math.max(1e-6, b.z - a.z);
      return { z, bottom: a.bottom + (b.bottom - a.bottom) * t, top: a.top + (b.top - a.top) * t, hw: a.hw + (b.hw - a.hw) * t };
    }
  }
  return profile[profile.length - 1];
}

/** How steeply the top surface falls toward the nose at `z`, as a pitch angle in radians (positive: front dips). */
export function topPitch(profile: Profile, z: number): number {
  const a = sampleAt(profile, z - 0.06);
  const b = sampleAt(profile, z + 0.06);
  return Math.atan2(a.top - b.top, 0.12);
}

export interface LoftOptions {
  /** Points around each section. */
  around?: number;
  /** Squareness of the section: 2 is an ellipse, higher is boxier. */
  squareness?: number;
  /** Paint at a vertex: its position and `v`, which is -1 under the car, 0 at the sides and +1 on top. */
  paint: (x: number, y: number, z: number, v: number, out: Color) => void;
}

const signedPow = (v: number, p: number) => Math.sign(v) * Math.abs(v) ** p;

/**
 * A smooth, closed body made by sweeping a superellipse along the profile, with a
 * colour per vertex. The ends close in a point, so the first and last stations should
 * be small. Replaces a pile of boxes with something that reads as one sculpted shape.
 */
export function loft(profile: Profile, options: LoftOptions): BufferGeometry {
  const around = options.around ?? 28;
  const p = 2 / (options.squareness ?? 3);
  const rings = profile.length;
  const positions: number[] = [];
  const colors: number[] = [];
  const color = new Color();
  const push = (x: number, y: number, z: number, v: number) => {
    positions.push(x, y, z);
    options.paint(x, y, z, v, color);
    colors.push(color.r, color.g, color.b);
  };

  for (const s of profile) {
    const yc = (s.top + s.bottom) / 2;
    const hh = (s.top - s.bottom) / 2;
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2;
      const sy = Math.sin(a);
      push(s.hw * signedPow(Math.cos(a), p), yc + hh * signedPow(sy, p), s.z, sy);
    }
  }
  // One centre point at each end closes the loft.
  const first = profile[0];
  const last = profile[rings - 1];
  const rearCentre = positions.length / 3;
  push(0, (first.top + first.bottom) / 2, first.z, 0);
  const frontCentre = positions.length / 3;
  push(0, (last.top + last.bottom) / 2, last.z, 0);

  const index: number[] = [];
  for (let r = 0; r < rings - 1; r++) {
    for (let k = 0; k < around; k++) {
      const a = r * around + k;
      const b = r * around + ((k + 1) % around);
      const c = (r + 1) * around + k;
      const d = (r + 1) * around + ((k + 1) % around);
      index.push(a, b, c, b, d, c);
    }
  }
  for (let k = 0; k < around; k++) {
    const k2 = (k + 1) % around;
    index.push(rearCentre, k2, k);
    index.push(frontCentre, (rings - 1) * around + k, (rings - 1) * around + k2);
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
