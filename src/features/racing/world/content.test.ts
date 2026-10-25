import { describe, expect, it } from "vitest";
import { ARCH, BUGGY, GRAVITY } from "../config";
import { buildTrackContent } from "./content";
import { TRACKS } from "./index";
import { PROFILES } from "./profile";
import { Track, newQuery } from "./track";

/** Tallest ground each world should reach in a coarse sample (a sanity band, not a spec). */
const GROUND_BAND = { desert: [4, 40], winter: [20, 75], alpine: [70, 230], beach: [3, 18], jungle: [20, 75] } as const;

describe.each(TRACKS)("track content: $name", (def) => {
  const track = new Track(def);
  const content = buildTrackContent(track);
  const q = newQuery();

  it("is deterministic: the same track always gets the same pickups and scenery", () => {
    const again = buildTrackContent(track);
    expect(JSON.stringify(again.collectibles)).toBe(JSON.stringify(content.collectibles));
    expect(JSON.stringify(again.obstacles)).toBe(JSON.stringify(content.obstacles));
    expect(JSON.stringify(again.scatter)).toBe(JSON.stringify(content.scatter));
  });

  it("lays a generous coin trail and hides gems on the shoulders", () => {
    const coins = content.collectibles.filter((c) => c.kind === "coin");
    const gems = content.collectibles.filter((c) => c.kind === "gem");
    expect(coins.length).toBeGreaterThan(80);
    expect(coins.length).toBeLessThan(240);
    expect(gems).toHaveLength(def.gems.length);
    for (const g of gems) {
      track.projectGlobal(g.x, g.z, q);
      expect(Math.abs(q.lateral)).toBeGreaterThan(q.halfWidth);
      expect(Math.abs(q.lateral)).toBeLessThan(q.boundary - 1);
    }
  });

  it("keeps every pickup reachable inside the corridor", () => {
    for (const c of content.collectibles) {
      track.projectGlobal(c.x, c.z, q);
      expect(Math.abs(q.lateral)).toBeLessThan(q.boundary - 1);
    }
  });

  it("numbers pickups by their index", () => {
    content.collectibles.forEach((c, i) => expect(c.id).toBe(i));
  });

  it("follows the arc of a jump with the coins after a ramp", () => {
    const ramp = track.ramps[0];
    const afterRamp = content.collectibles.filter((c) => c.kind === "coin" && c.s > ramp.s1 && c.s < ramp.s1 + 40);
    expect(afterRamp.length).toBeGreaterThanOrEqual(3);
    // Higher than ground-level coins near the take-off, coming back down as the arc ends.
    expect(afterRamp[0].y).toBeGreaterThan(afterRamp[afterRamp.length - 1].y);
    const jump = def.coinTrails.find((t) => t.air?.ramp === 0)!.air!;
    const vy0 = (ramp.height / ramp.length) * jump.speed;
    const first = afterRamp[0];
    const t = (first.s - ramp.s1) / jump.speed;
    expect(first.y).toBeCloseTo(ramp.height + vy0 * t - 0.5 * GRAVITY * t * t + 1.35, 4);
  });

  it("keeps obstacles on the shoulders so the racing line is clear", () => {
    expect(content.obstacles.length).toBeGreaterThanOrEqual(def.obstacles.length);
    for (const o of content.obstacles) {
      track.projectGlobal(o.x, o.z, q);
      expect(Math.abs(q.lateral)).toBeGreaterThan(q.halfWidth + o.r * 0.4);
      // They stand on the ground of the hill they are on.
      expect(o.y).toBeCloseTo(track.hillAt(q.s), 0);
    }
  });

  it("keeps the start grid and ramps clear of obstacles", () => {
    for (let slot = 0; slot < 5; slot++) {
      const g = track.gridPose(slot);
      for (const o of content.obstacles) {
        // Arch legs stand on the shoulders at the line: close to the grid, but never touching a car on it.
        const need = o.kind === "pillar" ? BUGGY.radius + o.r + 2 : 20;
        expect(Math.hypot(o.x - g.x, o.z - g.z), `${o.kind} near grid slot ${slot}`).toBeGreaterThan(need);
      }
    }
    for (const o of content.obstacles) {
      track.projectGlobal(o.x, o.z, q);
      if (o.kind === "plant") expect(track.nearRamp(q.s, 14)).toBe(false);
    }
  });

  it("stands a solid pillar at both feet of every arch", () => {
    const pillars = content.obstacles.filter((o) => o.kind === "pillar");
    expect(pillars).toHaveLength(track.checkpoints.length * 2);
    for (const gate of track.checkpoints) {
      for (const side of [-1, 1]) {
        const lat = side * (gate.halfWidth + ARCH.legOffset);
        const x = gate.x - gate.tz * lat;
        const z = gate.z + gate.tx * lat;
        expect(pillars.some((p) => Math.hypot(p.x - x, p.z - z) < 0.01)).toBe(true);
      }
    }
    // Tall enough that no jump clears them.
    for (const p of pillars) expect(p.height).toBeGreaterThan(20);
  });

  it("chains boulders (or snow banks) along both walls", () => {
    expect(content.scatter.wallRocks.length).toBeGreaterThan(track.length / 6.2);
    let left = 0;
    let right = 0;
    for (const r of content.scatter.wallRocks) {
      track.projectGlobal(r.x, r.z, q);
      expect(Math.abs(q.lateral)).toBeGreaterThan(q.boundary - 0.5);
      if (q.lateral < 0) left++;
      else right++;
    }
    expect(left).toBeGreaterThan(50);
    expect(right).toBeGreaterThan(50);
  });

  it("places the scenery its world asks for, out of every part of the corridor", () => {
    const want = PROFILES[def.world];
    expect(content.scatter.flora.length).toBeGreaterThan(want.flora.count * 0.5);
    expect(content.scatter.rocks.length).toBeGreaterThan(want.rocks.count * 0.5);
    expect(content.scatter.tufts.length).toBeGreaterThan(want.tufts.count * 0.5);
    expect(content.scatter.landmarks.length).toBeGreaterThanOrEqual(Math.floor(want.landmarks.count * 0.5));
    for (const list of [content.scatter.flora, content.scatter.rocks, content.scatter.landmarks, content.scatter.tufts]) {
      for (const p of list) expect(track.distanceOutside(p.x, p.z, 60)).toBeGreaterThanOrEqual(1.4);
    }
  });

  it("keeps trees and flowers below the snow line", () => {
    const limit = PROFILES[def.world].flora.maxHeight;
    if (limit === undefined) return;
    for (const p of content.scatter.flora) expect(p.y).toBeLessThanOrEqual(limit + 0.001);
  });

  it("places turn signs on the outside of bends, pointing the way", () => {
    expect(content.scatter.signs.length).toBeGreaterThanOrEqual(3);
    for (const sign of content.scatter.signs) {
      track.projectGlobal(sign.x, sign.z, q);
      const ahead = track.sample(q.s + 34).heading - track.sample(q.s + 8).heading;
      // Variant 1 points right (the heading decreases through a right-hand bend).
      const wrapped = Math.atan2(Math.sin(ahead), Math.cos(ahead));
      if (Math.abs(wrapped) > 0.2) expect(sign.variant).toBe(wrapped < 0 ? 1 : 0);
    }
  });

  describe("terrain", () => {
    it("follows the road through the corridor (flat when the road is flat) and rolls beyond it", () => {
      for (const s of [0, 200, 600, 1000]) {
        const p = track.sample(s);
        // A hair under the road mesh, so the two never fight for the pixels.
        const road = track.hillAt(s) - (track.hills.length > 0 ? 0.05 : 0);
        expect(content.terrain.heightAt(p.x, p.z)).toBeCloseTo(road, 3);
        expect(content.terrain.heightAt(p.x - p.tz * 10, p.z + p.tx * 10)).toBeCloseTo(road, 1);
      }
      let max = -Infinity;
      const b = content.terrain.bounds;
      for (let i = 0; i < 1500; i++) {
        const x = b.minX + (((i * 97) % 1000) / 1000) * (b.maxX - b.minX);
        const z = b.minZ + (((i * 389) % 1000) / 1000) * (b.maxZ - b.minZ);
        max = Math.max(max, content.terrain.heightAt(x, z));
      }
      const [lo, hi] = GROUND_BAND[def.world];
      expect(max).toBeGreaterThan(lo);
      expect(max).toBeLessThan(hi);
    });

    it("is flat again at the edge of the terrain mesh", () => {
      const b = content.terrain.bounds;
      const floor = PROFILES[def.world].terrain.baseline ?? 0;
      expect(content.terrain.heightAt(b.minX, (b.minZ + b.maxZ) / 2)).toBe(floor);
      expect(content.terrain.heightAt(b.maxX + 500, 0)).toBe(floor);
    });

    it("has no cliffs next to the road: the ground changes gently from one point to the next", () => {
      if (track.hills.length === 0) return;
      let steepest = 0;
      for (let s = 0; s < track.length; s += 15) {
        const p = track.sample(s);
        for (let lat = -70; lat <= 70; lat += 3) {
          const x = p.x - p.tz * lat;
          const z = p.z + p.tx * lat;
          const a = content.terrain.heightAt(x, z);
          const b = content.terrain.heightAt(x - p.tz * 3, z + p.tx * 3);
          steepest = Math.max(steepest, Math.abs(a - b) / 3);
        }
      }
      expect(steepest).toBeLessThan(1);
    });

    it("keeps scenery on dry ground where the world asks for it", () => {
      for (const spec of ["flora", "rocks", "tufts"] as const) {
        const min = PROFILES[def.world][spec].minHeight;
        if (min === undefined) continue;
        for (const p of content.scatter[spec]) expect(content.terrain.heightAt(p.x, p.z)).toBeGreaterThanOrEqual(min - 1e-6);
      }
    });

    it("is deterministic", () => {
      const again = buildTrackContent(track).terrain;
      expect(again.heightAt(500, -400)).toBe(content.terrain.heightAt(500, -400));
    });
  });
});

describe("world variety", () => {
  it("gives each world its own ground: the mountains stand far taller than the dunes", () => {
    const tall = (id: string) => {
      const def = TRACKS.find((t) => t.id === id)!;
      const t = new Track(def);
      const terrain = buildTrackContent(t).terrain;
      const b = terrain.bounds;
      let max = 0;
      for (let i = 0; i < 1500; i++) max = Math.max(max, terrain.heightAt(b.minX + (((i * 97) % 1000) / 1000) * (b.maxX - b.minX), b.minZ + (((i * 389) % 1000) / 1000) * (b.maxZ - b.minZ)));
      return max;
    };
    expect(tall("sunny-summit")).toBeGreaterThan(tall("desert-dash") * 2.5);
  });
});
