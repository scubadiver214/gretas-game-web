import { describe, expect, it } from "vitest";
import { TAU, angleDiff, clamp, clamp01, damp, dampAngle, lerp, lerpAngle, modLoop, smoothstep, wrapAngle, wrapLoop } from "./math";

describe("racing math", () => {
  it("clamps and lerps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it("smoothstep eases between its edges", () => {
    expect(smoothstep(0, 10, -5)).toBe(0);
    expect(smoothstep(0, 10, 15)).toBe(1);
    expect(smoothstep(0, 10, 5)).toBe(0.5);
  });

  it("wraps angles into (-PI, PI]", () => {
    expect(wrapAngle(TAU + 0.5)).toBeCloseTo(0.5, 9);
    expect(wrapAngle(-TAU - 0.5)).toBeCloseTo(-0.5, 9);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 9);
    expect(wrapAngle(0)).toBe(0);
  });

  it("takes the short way round", () => {
    expect(angleDiff(0.1, TAU - 0.1)).toBeCloseTo(0.2, 9);
    expect(angleDiff(TAU - 0.1, 0.1)).toBeCloseTo(-0.2, 9);
    expect(lerpAngle(TAU - 0.1, 0.1, 0.5)).toBeCloseTo(TAU, 9);
  });

  it("damps toward a target independent of frame rate", () => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 5, 1 / 60);
    for (let i = 0; i < 30; i++) b = damp(b, 1, 5, 1 / 30);
    expect(a).toBeCloseTo(b, 9);
    expect(a).toBeGreaterThan(0.99);
    expect(dampAngle(TAU - 0.2, 0.2, 100, 1)).toBeCloseTo(0.2, 3);
  });

  it("wraps distances on a loop", () => {
    expect(wrapLoop(990, 1000)).toBeCloseTo(-10, 9);
    expect(wrapLoop(-990, 1000)).toBeCloseTo(10, 9);
    expect(wrapLoop(10, 1000)).toBeCloseTo(10, 9);
    expect(modLoop(-10, 1000)).toBe(990);
    expect(modLoop(1010, 1000)).toBe(10);
  });
});
