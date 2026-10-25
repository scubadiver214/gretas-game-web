import type { Color } from "three";
import { describe, expect, it } from "vitest";
import { loft, profileOf, sampleAt, topPitch, type Station } from "./loft";

const KEYS: Station[] = [
  { z: -2, bottom: 0.5, top: 0.7, hw: 0.2 },
  { z: -1, bottom: 0.3, top: 1.1, hw: 1 },
  { z: 1, bottom: 0.3, top: 0.9, hw: 1 },
  { z: 2, bottom: 0.4, top: 0.5, hw: 0.2 },
];

describe("profileOf / sampleAt", () => {
  const profile = profileOf(KEYS, 6);

  it("passes through every keyframe and runs rear to nose", () => {
    for (const k of KEYS) {
      const s = sampleAt(profile, k.z);
      expect(s.hw).toBeCloseTo(k.hw, 1);
      expect(s.top).toBeCloseTo(k.top, 1);
      expect(s.bottom).toBeCloseTo(k.bottom, 1);
    }
    for (let i = 1; i < profile.length; i++) expect(profile[i].z).toBeGreaterThan(profile[i - 1].z);
  });

  it("clamps outside the body", () => {
    expect(sampleAt(profile, -9).z).toBe(profile[0].z);
    expect(sampleAt(profile, 9).z).toBe(profile[profile.length - 1].z);
  });

  it("pitches the front down where the top falls toward the nose", () => {
    expect(topPitch(profile, 1.5)).toBeGreaterThan(0);
  });
});

describe("loft", () => {
  const profile = profileOf(KEYS, 4);
  const geo = loft(profile, { around: 16, paint: (_x, _y, _z, v, out: Color) => void out.setScalar(v > 0 ? 1 : 0) });
  const pos = geo.getAttribute("position");

  it("fits the profile and carries a colour per vertex", () => {
    expect(geo.getAttribute("color").count).toBe(pos.count);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.min.z).toBeCloseTo(-2, 5);
    expect(box.max.z).toBeCloseTo(2, 5);
    // The spline may swell a little between keyframes, but never far past the widest one.
    expect(box.max.x).toBeGreaterThanOrEqual(0.95);
    expect(box.max.x).toBeLessThan(1.2);
    expect(box.min.x).toBeCloseTo(-box.max.x, 5);
  });

  it("faces outward along the body, so the paint is not drawn inside out", () => {
    const normal = geo.getAttribute("normal");
    for (let i = 0; i < pos.count - 2; i++) {
      // Skip the tapering ends, where the cross-section is nearly a point.
      if (Math.abs(pos.getZ(i)) > 1.5) continue;
      const centreY = (sampleAt(profile, pos.getZ(i)).top + sampleAt(profile, pos.getZ(i)).bottom) / 2;
      const outward = pos.getX(i) * normal.getX(i) + (pos.getY(i) - centreY) * normal.getY(i);
      expect(outward).toBeGreaterThan(-1e-3);
    }
  });
});
