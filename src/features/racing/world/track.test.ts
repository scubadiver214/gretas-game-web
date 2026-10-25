import { describe, expect, it } from "vitest";
import { SURFACES } from "../config";
import { headingOf } from "../engine/math";
import { Track, newQuery, validateTrack, type TrackDefinition } from "./track";
import { DUSTY_DESERT_DASH } from "./tracks/desert";

const track = new Track(DUSTY_DESERT_DASH);

describe("Track construction", () => {
  it("builds a closed loop of equally spaced samples", () => {
    expect(track.length).toBeGreaterThan(1200);
    expect(track.length).toBeLessThan(1600);
    for (let i = 0; i < track.count; i += 17) {
      const j = (i + 1) % track.count;
      const d = Math.hypot(track.px[j] - track.px[i], track.pz[j] - track.pz[i]);
      // Chord length, so a touch under the arc spacing on bends.
      expect(d).toBeGreaterThan(track.spacing * 0.95);
      expect(d).toBeLessThanOrEqual(track.spacing * 1.001);
    }
  });

  it("has unit tangents", () => {
    for (let i = 0; i < track.count; i += 11) expect(Math.hypot(track.tx[i], track.tz[i])).toBeCloseTo(1, 4);
  });

  it("starts on the line heading along the first control point", () => {
    expect(track.px[0]).toBeCloseTo(DUSTY_DESERT_DASH.points[0].x, 0);
    expect(track.pz[0]).toBeCloseTo(DUSTY_DESERT_DASH.points[0].z, 0);
    expect(track.checkpoints[0].s).toBe(0);
  });

  it("is deterministic", () => {
    const again = new Track(DUSTY_DESERT_DASH);
    expect(Array.from(again.px)).toEqual(Array.from(track.px));
    expect(Array.from(again.pz)).toEqual(Array.from(track.pz));
    expect(again.length).toBe(track.length);
  });

  it("passes validation: wide, gentle corners and no overlapping corridors", () => {
    expect(validateTrack(track, 35)).toEqual([]);
  });

  it("rejects a track that crosses itself", () => {
    // A figure of eight: the path passes through the origin twice, in different directions.
    const eight: TrackDefinition = {
      ...DUSTY_DESERT_DASH,
      id: "eight",
      ramps: [],
      points: [
        { x: -100, z: -60 },
        { x: 0, z: 0 },
        { x: 100, z: 60 },
        { x: 160, z: 0 },
        { x: 100, z: -60 },
        { x: 0, z: 0.5 },
        { x: -100, z: 60 },
        { x: -160, z: 0 },
      ],
    };
    const problems = validateTrack(new Track(eight), 20);
    expect(problems.some((p) => p.kind === "overlap")).toBe(true);
  });

  it("rejects a track with a hairpin tighter than allowed", () => {
    // A stadium whose ends are 25 m radius half-circles, with a narrow road so the legs do not overlap.
    const arc = (cx: number, from: number, to: number) =>
      [from, (from + to) / 2, to].map((deg) => ({ x: cx + 25 * Math.cos((deg * Math.PI) / 180), z: 25 + 25 * Math.sin((deg * Math.PI) / 180) }));
    const stadium: TrackDefinition = {
      ...DUSTY_DESERT_DASH,
      id: "stadium",
      ramps: [],
      roadWidth: 16,
      shoulder: 4,
      points: [{ x: 0, z: 0 }, { x: 100, z: 0 }, ...arc(200, -90, 90), { x: 100, z: 50 }, ...arc(0, 90, 270).slice(0, 2)],
    };
    const built = new Track(stadium);
    expect(built.minRadius).toBeLessThan(35);
    const problems = validateTrack(built, 35);
    expect(problems.some((p) => p.kind === "tight")).toBe(true);
    expect(problems.some((p) => p.kind === "overlap")).toBe(false);
  });
});

describe("Track projection", () => {
  const q = newQuery();

  it("puts a point on the centre line at lateral 0 and the right s", () => {
    for (const s of [0, 120, 400, 777, track.length - 3]) {
      const p = track.sample(s);
      track.projectGlobal(p.x, p.z, q);
      expect(Math.abs(q.lateral)).toBeLessThan(0.05);
      const ds = Math.min(Math.abs(q.s - s), track.length - Math.abs(q.s - s));
      expect(ds).toBeLessThan(0.1);
    }
  });

  it("measures lateral positive to the driver's right", () => {
    const p = track.sample(300);
    // The driver's right is (-tz, tx).
    const rx = -p.tz;
    const rz = p.tx;
    track.projectGlobal(p.x + rx * 5, p.z + rz * 5, q);
    expect(q.lateral).toBeCloseTo(5, 1);
    track.projectGlobal(p.x - rx * 7, p.z - rz * 7, q);
    expect(q.lateral).toBeCloseTo(-7, 1);
  });

  it("agrees with the vehicle heading convention (forward is sin h, cos h)", () => {
    const p = track.sample(500);
    const h = p.heading;
    expect(Math.sin(h)).toBeCloseTo(p.tx, 5);
    expect(Math.cos(h)).toBeCloseTo(p.tz, 5);
    expect(headingOf(p.tx, p.tz)).toBeCloseTo(h, 6);
    // Right of a car with heading h is (-cos h, sin h): the same side as the track's right.
    expect(-Math.cos(h)).toBeCloseTo(-p.tz, 5);
    expect(Math.sin(h)).toBeCloseTo(p.tx, 5);
  });

  it("local projection matches global when started from a nearby hint", () => {
    const p = track.sample(600);
    const x = p.x + 3;
    const z = p.z - 2;
    track.projectGlobal(x, z, q);
    const globalS = q.s;
    const hint = (q.index + 6) % track.count;
    track.project(x, z, hint, q);
    expect(q.s).toBeCloseTo(globalS, 3);
  });

  it("reports the road half-width and boundary", () => {
    const p = track.sample(50);
    track.projectGlobal(p.x, p.z, q);
    expect(q.boundary).toBeCloseTo(q.halfWidth + DUSTY_DESERT_DASH.shoulder, 6);
    expect(q.halfWidth).toBeGreaterThan(10);
  });

  it("picks the road for points on it and the sand for points on the shoulder", () => {
    const p = track.sample(50);
    track.projectGlobal(p.x, p.z, q);
    expect(track.surfaceAt(q)).toBe(SURFACES.dirt);
    track.projectGlobal(p.x - p.tz * (q.halfWidth + 3), p.z + p.tx * (q.halfWidth + 3), q);
    expect(track.surfaceAt(q)).toBe(SURFACES.sand);
  });
});

describe("Track features", () => {
  it("spaces six gates evenly with gate 0 on the line", () => {
    expect(track.checkpoints).toHaveLength(6);
    const gap = track.length / 6;
    track.checkpoints.forEach((c, i) => expect(c.s).toBeCloseTo(i * gap, 6));
  });

  it("has flat ground except on ramps, which rise linearly then drop", () => {
    const r = track.ramps[0];
    expect(track.heightAt(r.s0 - 5)).toBe(0);
    expect(track.heightAt(r.s0)).toBe(0);
    expect(track.heightAt(r.s0 + r.length / 2)).toBeCloseTo(r.height / 2, 6);
    expect(track.heightAt(r.s0 + r.length)).toBeCloseTo(r.height, 6);
    expect(track.heightAt(r.s0 + r.length + 0.1)).toBe(0);
    expect(track.slopeAt(r.s0 + 3)).toBeCloseTo(r.height / r.length, 6);
    expect(track.slopeAt(r.s0 - 10)).toBe(0);
  });

  it("knows when it is near a ramp", () => {
    const r = track.ramps[1];
    expect(track.nearRamp(r.s0 + 3, 5)).toBe(true);
    expect(track.nearRamp(r.s0 - 30, 5)).toBe(false);
  });

  it("puts grid slots behind the line, side by side, heading along the road", () => {
    const q = newQuery();
    const seen = new Set<string>();
    for (let slot = 0; slot < 5; slot++) {
      const g = track.gridPose(slot);
      track.projectGlobal(g.x, g.z, q);
      expect(q.s).toBeGreaterThan(track.length - 60);
      expect(q.s).toBeLessThan(track.length);
      expect(Math.abs(q.lateral)).toBeLessThan(q.halfWidth * 0.5);
      expect(Math.abs(g.heading - q.heading)).toBeLessThan(0.05);
      seen.add(`${g.x.toFixed(1)},${g.z.toFixed(1)}`);
    }
    expect(seen.size).toBe(5);
  });

  it("measures distance outside the corridor", () => {
    const p = track.sample(50);
    expect(track.distanceOutside(p.x, p.z)).toBeLessThan(0);
    const far = track.distanceOutside(p.x - p.tz * 60, p.z + p.tx * 60, 40);
    expect(far).toBeGreaterThan(15);
    expect(track.distanceOutside(p.x + 1000, p.z + 1000, 40)).toBe(40);
  });
});
