import { describe, expect, it } from "vitest";
import { TRACKS, loadWorld } from "./index";
import { Track, validateTrack } from "./track";

describe("track registry", () => {
  it("lists tracks with unique ids and sensible settings", () => {
    const ids = TRACKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of TRACKS) {
      expect(def.laps).toBeGreaterThanOrEqual(1);
      expect(def.tier).toBeGreaterThanOrEqual(1);
      expect(def.tier).toBeLessThanOrEqual(5);
      expect(def.checkpoints).toBeGreaterThanOrEqual(3);
      expect(def.points.length).toBeGreaterThanOrEqual(8);
    }
  });

  it("only ships tracks that pass validation: no overlapping corridors and no hairpins tighter than 35 m", () => {
    for (const def of TRACKS) expect(validateTrack(new Track(def), 35), def.id).toEqual([]);
  });

  it("keeps ramps clear of gates so a respawn never lands on one", () => {
    for (const def of TRACKS) {
      const t = new Track(def);
      for (const gate of t.checkpoints) expect(t.nearRamp(gate.s, 8), `${def.id} gate ${gate.index}`).toBe(false);
    }
  });

  it("builds a world once and shares it", () => {
    const a = loadWorld(TRACKS[0]);
    const b = loadWorld(TRACKS[0]);
    expect(b).toBe(a);
    expect(a.track.def).toBe(TRACKS[0]);
    expect(a.content.collectibles.length).toBeGreaterThan(0);
  });
});

describe("hills and the road's height", () => {
  const beach = new Track(TRACKS.find((t) => t.id === "beach-blast")!);
  const flat = new Track(TRACKS[0]);

  it("rises and falls smoothly: zero at both ends of a hill and highest in the middle", () => {
    const h = beach.hills[0];
    expect(beach.hillAt(h.s0 - 1)).toBe(0);
    expect(beach.hillAt(h.s0)).toBeCloseTo(0, 9);
    expect(beach.hillAt(h.s0 + h.length / 2)).toBeCloseTo(h.height, 6);
    expect(beach.hillAt(h.s0 + h.length)).toBeCloseTo(0, 6);
    expect(beach.heightAt(h.s0 + h.length / 2)).toBeCloseTo(h.height, 6);
  });

  it("has a slope that matches the height it reports", () => {
    for (const h of beach.hills) {
      for (const f of [0.1, 0.3, 0.5, 0.8]) {
        const s = h.s0 + h.length * f;
        const numeric = (beach.hillAt(s + 0.5) - beach.hillAt(s - 0.5)) / 1;
        expect(beach.hillSlopeAt(s)).toBeCloseTo(numeric, 3);
        expect(beach.slopeAt(s)).toBeCloseTo(beach.hillSlopeAt(s), 9);
      }
    }
  });

  it("stays gentle enough to drive: no hill steeper than the limit, none on a ramp", () => {
    expect(validateTrack(beach, 35)).toEqual([]);
    for (const ramp of beach.ramps) expect(beach.hillAt(ramp.s0 + ramp.length / 2)).toBe(0);
  });

  it("leaves a flat track flat", () => {
    expect(flat.hills).toHaveLength(0);
    for (let s = 0; s < flat.length; s += 50) expect(flat.hillAt(s)).toBe(0);
  });

  it("rejects a hill that is too steep, or that sits on a ramp", () => {
    const base = TRACKS.find((t) => t.id === "beach-blast")!;
    const steep = new Track({ ...base, hills: [{ at: 0.2, length: 60, height: 14 }] });
    expect(validateTrack(steep, 35).some((p) => p.kind === "hills")).toBe(true);
    const onRamp = new Track({ ...base, hills: [{ at: base.ramps[0].at - 0.01, length: 120, height: 3 }] });
    expect(validateTrack(onRamp, 35).some((p) => p.kind === "hills")).toBe(true);
  });

  it("puts every gate on the road at its height", () => {
    for (const c of beach.checkpoints) expect(c.y).toBeCloseTo(beach.hillAt(c.s), 9);
  });

  it("finds the nearest road and its arc length precisely", () => {
    const out = { dist: 0, s: 0 };
    for (const s of [40, 400, 900, 1300]) {
      const p = beach.sample(s);
      beach.nearest(p.x - p.tz * 40, p.z + p.tx * 40, 80, out);
      expect(out.s).toBeCloseTo(s, -1);
      expect(out.dist).toBeCloseTo(40 - (p.halfWidth + beach.def.shoulder), 0);
    }
    beach.nearest(1e5, 1e5, 70, out);
    expect(out.dist).toBe(70);
  });
});
