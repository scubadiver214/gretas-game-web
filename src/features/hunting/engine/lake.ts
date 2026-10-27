import { LAKE } from "../config";

/**
 * Normalised distance from the lake centre: < 1 is water, > 1 is land. The shore
 * wobbles a little and a grassy spit pokes into the water at the player's front-left
 * (the bank in the bottom-left of the reference screenshot). The water shader has a
 * GLSL copy of this (render/world/Water.tsx); keep them in step.
 */
export function lakeDist(x: number, z: number): number {
  const dx = (x - LAKE.cx) / LAKE.rx;
  const dz = (z - LAKE.cz) / LAKE.rz;
  const base = Math.hypot(dx, dz);
  const a = Math.atan2(dz, dx);
  const wobble = 0.035 * Math.sin(a * 3 + 1.3) + 0.022 * Math.sin(a * 7 + 0.4) + 0.012 * Math.sin(a * 13 + 2.1);
  const spit = 0.07 * Math.exp(-(((x + 11) * (x + 11)) / 46 + ((z + 3) * (z + 3)) / 7));
  return base - wobble + spit;
}

export const isWater = (x: number, z: number, margin = 0): boolean => lakeDist(x, z) < 1 - margin;
