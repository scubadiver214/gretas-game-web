import { describe, expect, it } from "vitest";
import { EXPLOSION } from "../config";
import { ExplosionShake, explosionFalloff, explosionKind, feedbackFor, quakeEnvelope } from "./explosion";

const origin = { x: 0, y: 0, z: 0 };

describe("explosion kind", () => {
  it("lets a gun or a mine outrank a slide, and a slide outrank a car hit", () => {
    expect(explosionKind("gun", true)).toBe("gun");
    expect(explosionKind("mine", true)).toBe("mine");
    expect(explosionKind("collision", true)).toBe("oil");
    expect(explosionKind("obstacle", true)).toBe("oil");
    expect(explosionKind("collision", false)).toBe("collision");
    expect(explosionKind("obstacle", false)).toBeNull();
  });
});

describe("explosion falloff", () => {
  it("is full on the blast, gone at the edge, and smooth in between", () => {
    const radius = EXPLOSION.kinds.gun.effectRadius;
    expect(explosionFalloff(0, radius)).toBe(1);
    expect(explosionFalloff(radius, radius)).toBe(0);
    expect(explosionFalloff(radius + 20, radius)).toBe(0);
    const near = explosionFalloff(8, radius);
    const mid = explosionFalloff(radius * 0.45, radius);
    const far = explosionFalloff(radius * 0.8, radius);
    expect(near).toBeGreaterThan(0.85);
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });
});

describe("explosion feedback", () => {
  it("orders the blasts from an oil slide up to a gun", () => {
    const oil = EXPLOSION.kinds.oil;
    const mine = EXPLOSION.kinds.mine;
    const gun = EXPLOSION.kinds.gun;
    expect(oil.shakeDuration).toBeGreaterThanOrEqual(0.6);
    expect(gun.shakeDuration).toBeLessThanOrEqual(1.2);
    expect(gun.shakeDuration).toBeGreaterThan(mine.shakeDuration);
    expect(mine.shakeMagnitude).toBeGreaterThan(oil.shakeMagnitude);
    expect(gun.shakeMagnitude).toBeGreaterThan(mine.shakeMagnitude);
    expect(gun.audioVolume).toBeGreaterThan(mine.audioVolume);
    expect(mine.audioVolume).toBeGreaterThan(oil.audioVolume);
  });

  it("gives the car that was hit the full blast, and a distant car almost nothing", () => {
    const onTop = feedbackFor("mine", origin, { x: 4, y: 0, z: 0 }, true, 1);
    const nearby = feedbackFor("mine", origin, { x: 12, y: 0, z: 0 }, false, 1);
    const gone = feedbackFor("mine", origin, { x: 400, y: 0, z: 0 }, false, 1);
    expect(onTop.falloff).toBe(1);
    expect(onTop.shakeMagnitude).toBeCloseTo(EXPLOSION.kinds.mine.shakeMagnitude, 5);
    expect(onTop.audioVolume).toBeCloseTo(EXPLOSION.kinds.mine.audioVolume, 5);
    expect(nearby.shakeMagnitude).toBeLessThan(onTop.shakeMagnitude);
    expect(nearby.shakeMagnitude).toBeGreaterThan(onTop.shakeMagnitude * 0.5);
    expect(nearby.audioVolume).toBeLessThan(onTop.audioVolume);
    expect(gone.shakeMagnitude).toBe(0);
    expect(gone.audioVolume).toBe(0);
    expect(gone.distort).toBe(false);
  });

  it("drops the shake and the ripple when shake is off, and still reports the sound", () => {
    const quiet = feedbackFor("gun", origin, origin, true, 0);
    expect(quiet.shakeMagnitude).toBe(0);
    expect(quiet.distort).toBe(false);
    expect(quiet.audioVolume).toBeCloseTo(EXPLOSION.kinds.gun.audioVolume, 5);
    expect(quiet.explosionIntensity).toBeCloseTo(EXPLOSION.kinds.gun.intensity, 5);
  });
});

describe("earthquake envelope", () => {
  it("starts at a full jolt, ends at rest, and hums again when a big blast asks it to", () => {
    expect(quakeEnvelope(0, 0)).toBeCloseTo(1, 5);
    expect(quakeEnvelope(1, 0.9)).toBeCloseTo(0, 5);
    expect(quakeEnvelope(0.2, 0)).toBeLessThan(quakeEnvelope(0, 0));
    expect(quakeEnvelope(0.58, 0.85)).toBeGreaterThan(quakeEnvelope(0.58, 0) + 0.05);
  });
});

describe("ExplosionShake", () => {
  it("jolts on the first step and is still again once the blast is over", () => {
    const shake = new ExplosionShake();
    shake.add(1.4, 0.8, 0.4, 0.7);
    shake.advance(1 / 60);
    expect(Math.hypot(shake.offset.x, shake.offset.y, shake.offset.z)).toBeGreaterThan(0.2);
    expect(Math.abs(shake.offset.roll)).toBeGreaterThan(0);
    shake.advance(2);
    expect(shake.offset.x).toBe(0);
    expect(shake.offset.y).toBe(0);
    expect(shake.offset.z).toBe(0);
    expect(shake.offset.roll).toBe(0);
  });

  it("keeps a stack of blasts inside the cap", () => {
    const shake = new ExplosionShake();
    for (let i = 0; i < 6; i++) shake.add(EXPLOSION.kinds.gun.shakeMagnitude, 1.16, 0.9, 0);
    shake.advance(0.04);
    expect(Math.hypot(shake.offset.x, shake.offset.y, shake.offset.z)).toBeLessThanOrEqual(EXPLOSION.maxShake + 1e-6);
    expect(Math.abs(shake.offset.roll)).toBeLessThanOrEqual(EXPLOSION.maxRoll + 1e-6);
  });

  it("ignores a blast that was asked not to shake", () => {
    const shake = new ExplosionShake();
    shake.add(0, 1, 0, 0);
    shake.advance(0.1);
    expect(shake.offset.x).toBe(0);
    expect(shake.offset.roll).toBe(0);
  });
});
