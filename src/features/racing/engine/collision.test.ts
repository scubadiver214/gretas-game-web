import { describe, expect, it } from "vitest";
import type { Obstacle } from "../world/content";
import { Track, newQuery } from "../world/track";
import { DUSTY_DESERT_DASH } from "../world/tracks/desert";
import { resolveBoundary, resolveObstacles } from "./collision";
import { createVehicle, placeVehicle, type VehicleState } from "./vehicle";

const track = new Track(DUSTY_DESERT_DASH);
const R = 1.5;
const DT = 1 / 60;

/** A car on the track at arc length `s`, `lateral` metres to the right, moving at `speed` along the road plus `side` m/s toward the right. */
function carAt(s: number, lateral: number, speed: number, side = 0): VehicleState {
  const p = track.sample(s);
  const v = createVehicle(0);
  placeVehicle(v, p.x - p.tz * lateral, p.z + p.tx * lateral, p.heading);
  v.vx = p.tx * speed - p.tz * side;
  v.vz = p.tz * speed + p.tx * side;
  track.projectGlobal(v.x, v.z, v.query);
  return v;
}

const rightSpeed = (v: VehicleState) => {
  const q = v.query;
  return v.vx * -q.tz + v.vz * q.tx;
};

describe("boundary walls", () => {
  it("leaves a car in the corridor alone", () => {
    const v = carAt(300, 3, 20);
    const before = [v.x, v.z, v.vx, v.vz];
    expect(resolveBoundary(v, v.query, R, 1, DT)).toBe(0);
    expect([v.x, v.z, v.vx, v.vz]).toEqual(before);
  });

  it("pushes a car back inside, on either side", () => {
    for (const side of [1, -1]) {
      const v = carAt(300, 0, 20);
      const b = v.query.boundary;
      const q = v.query;
      const p = track.sample(300);
      v.x = p.x - p.tz * side * (b + 2);
      v.z = p.z + p.tx * side * (b + 2);
      track.projectGlobal(v.x, v.z, q);
      resolveBoundary(v, q, R, 1, DT);
      track.projectGlobal(v.x, v.z, q);
      expect(Math.abs(q.lateral)).toBeLessThanOrEqual(b - R + 1e-3);
    }
  });

  it("bounces the outward velocity back inward but keeps most of the forward speed on a glancing hit", () => {
    const v = carAt(300, 0, 25, 6);
    const q = v.query;
    const limit = q.boundary - R;
    const p = track.sample(300);
    v.x = p.x - p.tz * (limit + 0.3);
    v.z = p.z + p.tx * (limit + 0.3);
    track.projectGlobal(v.x, v.z, q);
    const impact = resolveBoundary(v, q, R, 0.35, DT);
    expect(impact).toBeCloseTo(6, 0);
    expect(rightSpeed(v)).toBeLessThan(0);
    expect(Math.abs(rightSpeed(v))).toBeLessThan(6);
    const forward = v.vx * q.tx + v.vz * q.tz;
    expect(forward).toBeGreaterThan(18);
  });

  function hitWith(penalty: number, side: number): number {
    const v = carAt(300, 0, 20, side);
    const q = v.query;
    const p = track.sample(300);
    const limit = q.boundary - R;
    v.x = p.x - p.tz * (limit + 0.2);
    v.z = p.z + p.tx * (limit + 0.2);
    track.projectGlobal(v.x, v.z, q);
    resolveBoundary(v, q, R, penalty, DT);
    return Math.hypot(v.vx, v.vz);
  }

  it("costs more speed with a higher collision penalty, and harder hits cost more", () => {
    expect(hitWith(1, 12)).toBeLessThan(hitWith(0.35, 12));
    expect(hitWith(0.35, 12)).toBeLessThan(hitWith(0.35, 3) + 6);
    expect(hitWith(0, 8)).toBeGreaterThan(hitWith(1, 8));
  });

  it("is forgiving at the first tier: a head-on wall hit is not a dead stop", () => {
    const v = carAt(300, 0, 0, 30);
    const q = v.query;
    const p = track.sample(300);
    const limit = q.boundary - R;
    v.x = p.x - p.tz * (limit + 0.2);
    v.z = p.z + p.tx * (limit + 0.2);
    track.projectGlobal(v.x, v.z, q);
    resolveBoundary(v, q, R, 0.35, DT);
    expect(Math.hypot(v.vx, v.vz)).toBeGreaterThan(6);
  });

  it("swings a glancing car's nose along the wall", () => {
    const v = carAt(300, 0, 25, 8);
    const q = v.query;
    const p = track.sample(300);
    const limit = q.boundary - R;
    v.x = p.x - p.tz * (limit + 0.2);
    v.z = p.z + p.tx * (limit + 0.2);
    v.heading = p.heading - 0.5;
    track.projectGlobal(v.x, v.z, q);
    const before = Math.abs(v.heading - p.heading);
    resolveBoundary(v, q, R, 0.35, DT);
    expect(Math.abs(v.heading - p.heading)).toBeLessThan(before);
  });
});

describe("obstacles", () => {
  const cactus: Obstacle = { x: 0, z: 10, r: 1, kind: "plant", bounce: 0.5, height: 4 };

  function carFacing(distance: number, speed: number): VehicleState {
    const v = createVehicle(0);
    placeVehicle(v, 0, distance, 0);
    v.vz = speed;
    return v;
  }

  it("ignores obstacles that are not touched", () => {
    const v = carFacing(5, 20);
    expect(resolveObstacles(v, [cactus], R, 1)).toBe(0);
    expect(v.vz).toBe(20);
  });

  it("pushes the car out to the combined radius and bounces it back", () => {
    const v = carFacing(10 - 1.2, 20);
    const impact = resolveObstacles(v, [cactus], R, 0.35);
    expect(impact).toBeGreaterThan(10);
    expect(Math.hypot(v.x - cactus.x, v.z - cactus.z)).toBeCloseTo(cactus.r + R, 6);
    expect(v.vz).toBeLessThan(0);
  });

  it("costs more speed with a higher penalty and bounces more off bouncier obstacles", () => {
    const soft = carFacing(10 - 1.2, 20);
    const hard = carFacing(10 - 1.2, 20);
    resolveObstacles(soft, [cactus], R, 0.2);
    resolveObstacles(hard, [cactus], R, 1);
    expect(Math.abs(hard.vz)).toBeLessThan(Math.abs(soft.vz));
    const dead = carFacing(10 - 1.2, 20);
    const springy = carFacing(10 - 1.2, 20);
    resolveObstacles(dead, [{ ...cactus, bounce: 0.1 }], R, 0);
    resolveObstacles(springy, [{ ...cactus, bounce: 0.9 }], R, 0);
    expect(Math.abs(springy.vz)).toBeGreaterThan(Math.abs(dead.vz));
  });

  it("lets an airborne car sail over a low obstacle", () => {
    const v = carFacing(10 - 1.2, 20);
    v.y = 6;
    expect(resolveObstacles(v, [cactus], R, 1)).toBe(0);
    expect(v.vz).toBe(20);
    const hay: Obstacle = { ...cactus, kind: "hay", height: 1.7 };
    const w = carFacing(10 - 1.2, 20);
    w.y = 2;
    expect(resolveObstacles(w, [hay], R, 1)).toBe(0);
  });

  it("does not stick to a car that is driving away", () => {
    const v = carFacing(10 - 1.2, -5);
    resolveObstacles(v, [cactus], R, 1);
    expect(v.vz).toBe(-5);
  });

  it("copes with a car dead centre on an obstacle", () => {
    const v = carFacing(10, 5);
    expect(() => resolveObstacles(v, [cactus], R, 1)).not.toThrow();
    expect(Number.isFinite(v.x) && Number.isFinite(v.z)).toBe(true);
  });
});

describe("query helpers used by collisions", () => {
  it("newQuery has sane defaults", () => {
    const q = newQuery();
    expect(q.tz).toBe(1);
    expect(q.lateral).toBe(0);
  });
});
