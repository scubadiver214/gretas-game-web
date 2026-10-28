import { EXPLOSION } from "../config";
import type { ExplosionKind } from "../types";
import { clamp, clamp01 } from "./math";

/** Why a car was wrecked. Gun and mine outrank a slide; a slide outranks a plain crash. */
export type WreckCause = "obstacle" | "collision" | "gun" | "mine";

export interface ExplosionPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * What one blast asks the camera, the speakers and the visuals to do.
 * Intensity, shake and volume are already scaled for this listener.
 */
export interface ExplosionFeedback {
  explosionType: ExplosionKind;
  explosionPosition: ExplosionPoint;
  /** 0..1 after distance. Drives the fireball. */
  explosionIntensity: number;
  shakeDuration: number;
  /** World metres of camera offset at the first jolt, after distance and the shake setting. */
  shakeMagnitude: number;
  /** 0..1, multiplied by the player's sound volume by the mixer. */
  audioVolume: number;
  effectRadius: number;
  /** 0..1. 1 on top of the blast, 0 at the edge of `effectRadius`. */
  falloff: number;
  /** 0..1. A second, smaller wave part way through a big blast. */
  tremor: number;
  /** Brief screen ripple. Only the big blasts, and only when shake is allowed. */
  distort: boolean;
}

/** Gun and mine always boom. A wreck while still sliding is the oil crash. A hard car hit is a collision. */
export function explosionKind(cause: WreckCause, oiled: boolean): ExplosionKind | null {
  if (cause === "gun") return "gun";
  if (cause === "mine") return "mine";
  if (oiled) return "oil";
  if (cause === "collision") return "collision";
  return null;
}

/**
 * Smooth falloff: full on top of the blast, still strong nearby, gone at `radius`.
 * The curve stays high through the first part of the radius so a car just up the road
 * gets a real shake, then eases off instead of cutting out.
 */
export function explosionFalloff(distance: number, radius: number): number {
  if (radius <= 0) return distance <= 0 ? 1 : 0;
  if (distance <= 0) return 1;
  if (distance >= radius) return 0;
  const t = distance / radius;
  const s = t * t * (3 - 2 * t);
  return (1 - s) * (1 - s);
}

/** A stable phase so two blasts at different spots don't shake in lockstep. */
export function shakePhase(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * Math.PI * 2;
}

/**
 * 1 at the jolt, then smaller, with an optional second hump for the big blasts.
 * Zero at the end so the camera is back where the chase camera left it.
 */
export function quakeEnvelope(u: number, tremor: number): number {
  const t = clamp01(u);
  const primary = Math.exp(-3.4 * t) * (1 - t);
  const pulse = tremor * Math.exp(-18 * (t - 0.58) * (t - 0.58)) * 0.55 * (1 - t);
  return primary + pulse;
}

/**
 * How this listener should feel `kind` at `position`.
 * `direct` is the car that was hit: they always get the full blast, even after the
 * wreck slides them back up the road. `shakeScale` is 0 when shake is off.
 */
export function feedbackFor(kind: ExplosionKind, position: ExplosionPoint, listener: ExplosionPoint, direct: boolean, shakeScale: number): ExplosionFeedback {
  const preset = EXPLOSION.kinds[kind];
  const distance = Math.hypot(listener.x - position.x, listener.y - position.y, listener.z - position.z);
  const falloff = direct ? 1 : explosionFalloff(distance, preset.effectRadius);
  const scale = clamp01(shakeScale);
  return {
    explosionType: kind,
    explosionPosition: position,
    explosionIntensity: preset.intensity * falloff,
    shakeDuration: preset.shakeDuration,
    shakeMagnitude: preset.shakeMagnitude * falloff * scale,
    audioVolume: preset.audioVolume * falloff,
    effectRadius: preset.effectRadius,
    falloff,
    tremor: preset.tremor * falloff,
    distort: preset.distort && falloff >= EXPLOSION.distortMin && scale > 0,
  };
}

interface Quake {
  age: number;
  duration: number;
  magnitude: number;
  tremor: number;
  phase: number;
}

export interface ShakeOffset {
  x: number;
  y: number;
  z: number;
  roll: number;
}

/**
 * Stacked earthquake offsets for the camera. Applied on top of the chase camera,
 * never to the cars. Overlapping blasts are summed and then clamped.
 */
export class ExplosionShake {
  readonly offset: ShakeOffset = { x: 0, y: 0, z: 0, roll: 0 };
  private readonly layers: Quake[] = [];

  add(magnitude: number, duration: number, tremor: number, phase: number): void {
    if (magnitude < 0.001 || duration <= 0) return;
    if (this.layers.length >= EXPLOSION.maxLayers) {
      let weakest = 0;
      for (let i = 1; i < this.layers.length; i++) {
        if (this.layers[i].magnitude < this.layers[weakest].magnitude) weakest = i;
      }
      if (this.layers[weakest].magnitude >= magnitude) return;
      this.layers.splice(weakest, 1);
    }
    this.layers.push({ age: 0, duration, magnitude, tremor: clamp01(tremor), phase });
  }

  advance(dt: number): void {
    let x = 0;
    let y = 0;
    let z = 0;
    let roll = 0;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const q = this.layers[i];
      q.age += dt;
      if (q.age >= q.duration) {
        this.layers.splice(i, 1);
        continue;
      }
      const env = quakeEnvelope(q.age / q.duration, q.tremor);
      const amp = q.magnitude * env;
      x += Math.sin(q.age * 37 + q.phase) * amp;
      y += Math.cos(q.age * 29 + q.phase * 1.3) * amp * 0.72;
      z += Math.sin(q.age * 23 + q.phase * 0.6) * amp * 0.48;
      roll += Math.sin(q.age * 17 + q.phase * 0.4) * amp * 0.04;
    }
    const len = Math.hypot(x, y, z);
    if (len > EXPLOSION.maxShake) {
      const s = EXPLOSION.maxShake / len;
      x *= s;
      y *= s;
      z *= s;
      roll *= s;
    }
    this.offset.x = x;
    this.offset.y = y;
    this.offset.z = z;
    this.offset.roll = clamp(roll, -EXPLOSION.maxRoll, EXPLOSION.maxRoll);
  }

  clear(): void {
    this.layers.length = 0;
    this.offset.x = 0;
    this.offset.y = 0;
    this.offset.z = 0;
    this.offset.roll = 0;
  }
}
