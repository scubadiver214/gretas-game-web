import { AIM, FOV } from "../config";
import type { Vec3 } from "../types";
import { clamp, cross, norm } from "./vec";

/** yaw 0 looks down -Z; positive yaw turns left; positive pitch looks up. Same as a three.js "YXZ" camera. */
export interface Aim {
  yaw: number;
  pitch: number;
}

export function dirFromAim(a: Aim): Vec3 {
  const cp = Math.cos(a.pitch);
  return { x: -Math.sin(a.yaw) * cp, y: Math.sin(a.pitch), z: -Math.cos(a.yaw) * cp };
}

export function aimFromDir(d: Vec3): Aim {
  const n = norm(d);
  return { yaw: Math.atan2(-n.x, -n.z), pitch: Math.asin(clamp(n.y, -1, 1)) };
}

export function clampAim(a: Aim): Aim {
  return { yaw: clamp(a.yaw, -AIM.yawLimit, AIM.yawLimit), pitch: clamp(a.pitch, AIM.pitchMin, AIM.pitchMax) };
}

/** Camera right and up vectors for an aim (no roll). */
export function aimBasis(a: Aim): { forward: Vec3; right: Vec3; up: Vec3 } {
  const forward = dirFromAim(a);
  const right = { x: Math.cos(a.yaw), y: 0, z: -Math.sin(a.yaw) };
  return { forward, right, up: cross(right, forward) };
}

/** Vertical field of view in degrees for the current tool state. */
export function fovFor(zoom: number, ads: boolean): number {
  if (zoom > 1) {
    const half = (FOV.base * Math.PI) / 360;
    return (Math.atan(Math.tan(half) / zoom) * 360) / Math.PI;
  }
  return ads ? FOV.ads : FOV.base;
}
