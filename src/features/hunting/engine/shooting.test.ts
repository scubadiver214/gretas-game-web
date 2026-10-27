import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { AIM } from "../config";
import { aimFromDir, clampAim, dirFromAim } from "./aim";
import { assistTarget, pelletDirections, raySphere, rayPointDistance, resolveShot } from "./shooting";
import { angleBetween, norm } from "./vec";

const O = { x: 0, y: 0, z: 0 };
const FWD = { x: 0, y: 0, z: -1 };

describe("raySphere", () => {
  it("hits a sphere straight ahead at the near surface", () => {
    expect(raySphere(O, FWD, { x: 0, y: 0, z: -10 }, 1)).toBeCloseTo(9);
  });
  it("misses a sphere off to the side and one behind", () => {
    expect(raySphere(O, FWD, { x: 3, y: 0, z: -10 }, 1)).toBeNull();
    expect(raySphere(O, FWD, { x: 0, y: 0, z: 10 }, 1)).toBeNull();
  });
  it("measures perpendicular distance to the ray", () => {
    expect(rayPointDistance(O, FWD, { x: 2, y: 0, z: -10 })).toBeCloseTo(2);
    expect(rayPointDistance(O, FWD, { x: 0, y: 0, z: 5 })).toBe(Infinity);
  });
});

describe("shotgun pellets", () => {
  it("puts the first pellet dead centre and the rest inside the cone", () => {
    const spread = 0.05;
    const pellets = pelletDirections(FWD, 9, spread, mulberry32(7));
    expect(pellets).toHaveLength(9);
    expect(angleBetween(pellets[0], FWD)).toBeCloseTo(0);
    for (const p of pellets) expect(angleBetween(p, FWD)).toBeLessThanOrEqual(spread + 1e-6);
  });

  it("can hit two ducks flying close together with one shell", () => {
    const pellets = pelletDirections(FWD, 30, 0.06, mulberry32(3));
    const ids = resolveShot(O, pellets, [{ id: 1, pos: { x: 0.6, y: 0, z: -20 }, radius: 0.55 }, { id: 2, pos: { x: -0.6, y: 0, z: -20 }, radius: 0.55 }], 70);
    expect(ids.sort()).toEqual([1, 2]);
  });

  it("ignores targets beyond the shotgun's range", () => {
    expect(resolveShot(O, [FWD], [{ id: 1, pos: { x: 0, y: 0, z: -100 }, radius: 1 }], 70)).toEqual([]);
  });

  it("picks the nearest target in the assist cone only", () => {
    const targets = [
      { id: 1, pos: { x: 2, y: 0, z: -20 }, radius: 0.5 },
      { id: 2, pos: { x: 15, y: 0, z: -20 }, radius: 0.5 },
    ];
    expect(assistTarget(O, FWD, targets, 0.2)?.id).toBe(1);
    expect(assistTarget(O, FWD, targets, 0.05)).toBeNull();
  });
});

describe("aim", () => {
  it("round-trips yaw and pitch through a direction", () => {
    const a = { yaw: 0.4, pitch: 0.3 };
    const back = aimFromDir(dirFromAim(a));
    expect(back.yaw).toBeCloseTo(a.yaw);
    expect(back.pitch).toBeCloseTo(a.pitch);
  });
  it("looks down -Z at rest and turns left for positive yaw", () => {
    expect(dirFromAim({ yaw: 0, pitch: 0 }).z).toBeCloseTo(-1);
    expect(dirFromAim({ yaw: 0.5, pitch: 0 }).x).toBeLessThan(0);
  });
  it("clamps to the lake view", () => {
    const c = clampAim({ yaw: 5, pitch: -5 });
    expect(c.yaw).toBeCloseTo(AIM.yawLimit);
    expect(c.pitch).toBeCloseTo(AIM.pitchMin);
    expect(norm(dirFromAim(c)).y).toBeLessThan(0);
  });
});
