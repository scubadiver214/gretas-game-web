import { describe, expect, it } from "vitest";
import { RACE } from "../config";
import { neutralControls } from "../types";
import { loadWorld, TRACKS } from "../world";
import { newQuery } from "../world/track";
import { RaceEngine } from "./RaceEngine";
import { resolveObstacles } from "./collision";
import { createVehicle } from "./vehicle";
import { runFor } from "./testDriver";

const def = TRACKS.find((t) => t.id === "jungle-rally")!;
const world = loadWorld(def);

function racing(): RaceEngine {
  const e = new RaceEngine(world.track, world.content, { tier: def.tier, assist: "helper" });
  e.start();
  runFor(e, RACE.countdownSeconds + 0.05, () => null);
  return e;
}

describe("animals that cross the road", () => {
  it("are placed from the track definition, waiting outside the road on alternating sides", () => {
    expect(world.content.animals).toHaveLength(def.animals!.length);
    const kinds = new Set(world.content.animals.map((a) => a.kind));
    expect([...kinds].sort()).toEqual(["giraffe", "lion", "tiger"]);
    // Each starts on the side the definition asked for, and its two waiting spots are on opposite sides of the road.
    const q = newQuery();
    world.content.animals.forEach((a, i) => {
      world.track.projectGlobal(a.a.x, a.a.z, q);
      const sideA = Math.sign(q.lateral);
      world.track.projectGlobal(a.b.x, a.b.z, q);
      expect(Math.sign(q.lateral)).toBe(-sideA);
      expect(sideA).toBe(def.animals![i].side);
    });
  });

  it("wait at the roadside, clear of the road and its walls", () => {
    for (const a of world.content.animals) {
      for (const spot of [a.a, a.b]) {
        const outside = world.track.distanceOutside(spot.x, spot.z, 30);
        expect(outside).toBeGreaterThan(0.5);
        expect(outside).toBeLessThan(6);
      }
    }
    const e = racing();
    for (const a of e.animals) expect(a.phase).toBe("wait");
  });

  it("dash across when a car comes, then rest on the far side and wait for the next", () => {
    const e = racing();
    const lion = e.animals[0];
    const start = { x: lion.x, z: lion.z };
    e.setControls({ ...neutralControls(), throttle: 1 });
    let guard = 0;
    while (lion.phase === "wait" && guard++ < 60 * 20) e.advance(1 / 60);
    expect(lion.phase).toBe("cross");
    // Hold the car well back, so it neither hits the animal nor changes the outcome.
    e.setControls({ ...neutralControls(), brake: 1 });
    runFor(e, 1, () => null);
    const mid = Math.hypot(lion.x - start.x, lion.z - start.z);
    expect(mid).toBeGreaterThan(5);
    expect(lion.progress).toBeGreaterThan(0.1);
    runFor(e, 6, () => null);
    expect(lion.at).toBe(1);
    expect(Math.hypot(lion.x - lion.spec.b.x, lion.z - lion.spec.b.z)).toBeLessThan(0.01);
    expect(["rest", "wait"]).toContain(lion.phase);
  });

  it("only run in a race, and go back to their starting places on reset", () => {
    const e = new RaceEngine(world.track, world.content, { tier: def.tier, assist: "helper" });
    runFor(e, 5, () => null);
    for (const a of e.animals) expect(a.phase).toBe("wait");
    const r = racing();
    r.setControls({ ...neutralControls(), throttle: 1 });
    runFor(r, 8, () => null);
    expect(r.animals.some((a) => a.phase !== "wait")).toBe(true);
    r.reset();
    for (const a of r.animals) {
      expect(a.phase).toBe("wait");
      expect(a.at).toBe(0);
      expect(a.x).toBeCloseTo(a.spec.a.x, 6);
      expect(a.z).toBeCloseTo(a.spec.a.z, 6);
    }
  });

  it("interpolate their pose between steps for smooth drawing", () => {
    const e = racing();
    const out = { x: 0, y: 0, z: 0, heading: 0, running: false };
    e.animalPose(0, out);
    expect(out.x).toBeCloseTo(e.animals[0].spec.a.x, 6);
    expect(out.running).toBe(false);
  });

  it("are soft to hit: a car loses speed into one but is never thrown back", () => {
    const v = createVehicle(0);
    v.x = 0;
    v.z = -2.2;
    v.heading = 0;
    v.vx = 0;
    v.vz = 30;
    const hit = resolveObstacles(v, [{ x: 0, z: 0, r: 1.5, kind: "animal", bounce: 0.5, height: 2.4, y: 0 }], 1.5, 0.7);
    expect(hit).toBeGreaterThan(20);
    expect(v.vz).toBeGreaterThanOrEqual(0);
    expect(v.vz).toBeLessThan(30 * 0.5);
  });

  it("let a car sail over a low animal from a jump but not past a giraffe", () => {
    const v = createVehicle(0);
    v.x = 0;
    v.z = -2.2;
    v.vz = 30;
    v.y = 2.5;
    expect(resolveObstacles(v, [{ x: 0, z: 0, r: 1.5, kind: "animal", bounce: 0.5, height: 2.2, y: 0 }], 1.5, 0.7)).toBe(0);
    expect(resolveObstacles(v, [{ x: 0, z: 0, r: 1.5, kind: "animal", bounce: 0.5, height: 5.4, y: 0 }], 1.5, 0.7)).toBeGreaterThan(0);
  });
});

describe("animals roaming in the wild", () => {
  it("keep to their own clearings, away from the road and each other", () => {
    const roamers = world.content.roamers;
    expect(roamers).toHaveLength(def.roamers!);
    for (const r of roamers) {
      expect(world.track.distanceOutside(r.cx, r.cz, r.radius + 40)).toBeGreaterThanOrEqual(r.radius + 6);
      expect(Math.abs(r.omega * r.radius)).toBeGreaterThan(5);
      expect(Math.abs(r.omega * r.radius)).toBeLessThan(10);
    }
    for (let i = 0; i < roamers.length; i++) {
      for (let j = i + 1; j < roamers.length; j++) {
        expect(Math.hypot(roamers[i].cx - roamers[j].cx, roamers[i].cz - roamers[j].cz)).toBeGreaterThan(roamers[i].radius + roamers[j].radius);
      }
    }
  });

  it("keep trees and rocks out of their clearings", () => {
    for (const r of world.content.roamers) {
      for (const list of [world.content.scatter.flora, world.content.scatter.rocks]) {
        for (const p of list) expect(Math.hypot(p.x - r.cx, p.z - r.cz)).toBeGreaterThan(r.radius + 5.9);
      }
    }
  });

  it("are left out of tracks that have none", () => {
    expect(loadWorld(TRACKS[0]).content.roamers).toHaveLength(0);
    expect(loadWorld(TRACKS[0]).content.animals).toHaveLength(0);
  });
});
