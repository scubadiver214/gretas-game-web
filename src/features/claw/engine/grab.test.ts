import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/rng";
import { CLAW, GRAB } from "../config";
import { difficultyFor } from "./difficulty";
import { alignmentScore, candidates, easiestToy, grabChance, resolveGrab, slipPoint } from "./grab";
import type { DifficultyVars, ToyState } from "./types";

function toy(partial: Partial<ToyState> = {}): ToyState {
  return {
    uid: partial.uid ?? 1,
    prizeId: "teddy-brown",
    rarity: "common",
    x: 0,
    y: 0.4,
    z: 0,
    radius: 0.4,
    weight: 0.3,
    gripDifficulty: 0.1,
    rotY: 0,
    status: "resting",
    vy: 0,
    wobble: 0,
    wobbleT: 0,
    variant: 0,
    hinted: false,
    ...partial,
  };
}

const easy: DifficultyVars = difficultyFor(1);
const hard: DifficultyVars = difficultyFor(50);

describe("alignment", () => {
  it("is 1 dead centre and 0 past the tolerance band", () => {
    expect(alignmentScore(0, 0.4, 0.3)).toBe(1);
    expect(alignmentScore(0.35, 0.4, 0.3)).toBeCloseTo(0.5);
    expect(alignmentScore(0.7, 0.4, 0.3)).toBe(0);
    expect(alignmentScore(2, 0.4, 0.3)).toBe(0);
  });
});

describe("grab chance", () => {
  it("is near certain for a light toy under a centred claw on level 1", () => {
    expect(grabChance(toy(), 0, easy, 0)).toBeGreaterThanOrEqual(0.95);
  });

  it("falls off as the claw moves away from the toy", () => {
    const centred = grabChance(toy(), 0, easy, 0);
    const edge = grabChance(toy(), 0.4, easy, 0);
    const far = grabChance(toy(), 0.9, easy, 0);
    expect(centred).toBeGreaterThan(edge);
    expect(edge).toBeGreaterThan(far);
    expect(far).toBe(0);
  });

  it("is lower for heavy, slippery and oversized toys", () => {
    const light = grabChance(toy(), 0, hard, 0);
    const heavy = grabChance(toy({ weight: 0.9 }), 0, hard, 0);
    const slippery = grabChance(toy({ gripDifficulty: 0.6 }), 0, hard, 0);
    const giant = grabChance(toy({ radius: CLAW.reach + 0.15 }), 0, hard, 0);
    expect(heavy).toBeLessThan(light);
    expect(slippery).toBeLessThan(light);
    expect(giant).toBeLessThan(light);
  });

  it("is lower when neighbours press against the target", () => {
    expect(grabChance(toy(), 0, hard, 3)).toBeLessThan(grabChance(toy(), 0, hard, 0));
  });

  it("stays within the configured floor and ceiling when a toy is in reach", () => {
    expect(grabChance(toy({ weight: 1, gripDifficulty: 1, radius: 0.9 }), 0.3, hard, 6)).toBeGreaterThanOrEqual(GRAB.minChance);
    expect(grabChance(toy(), 0, easy, 0)).toBeLessThanOrEqual(GRAB.maxChance);
  });

  it("gets easier as the level goes down", () => {
    const t = toy({ weight: 0.6, gripDifficulty: 0.4 });
    let last = 2;
    for (const level of [1, 10, 20, 30, 40, 50]) {
      const c = grabChance(t, 0.15, difficultyFor(level), 1);
      expect(c).toBeLessThanOrEqual(last);
      last = c;
    }
  });
});

describe("candidates", () => {
  it("ignores toys buried under another toy", () => {
    const bottom = toy({ uid: 1, y: 0.4 });
    const top = toy({ uid: 2, y: 1.05 });
    const cands = candidates(0, 0, 1.33, [bottom, top], easy);
    expect(cands.map((c) => c.toy.uid)).toEqual([2]);
  });

  it("ignores toys that are not resting", () => {
    expect(candidates(0, 0, 0.7, [toy({ status: "held" })], easy)).toHaveLength(0);
    expect(candidates(0, 0, 0.7, [toy({ status: "delivered" })], easy)).toHaveLength(0);
  });

  it("orders by chance, best first", () => {
    const near = toy({ uid: 1, x: 0.05 });
    const off = toy({ uid: 2, x: 0.5, z: 0.1 });
    const cands = candidates(0, 0, 0.7, [near, off], easy);
    expect(cands[0].toy.uid).toBe(1);
  });
});

describe("resolveGrab", () => {
  it("misses with 'nothing' when the floor is under the claw", () => {
    const out = resolveGrab(2, 1, 0.1, [toy({ x: -2 })], easy, seededRng("a"));
    expect(out).toMatchObject({ caught: false, toy: null, reason: "nothing" });
  });

  it("is deterministic for a seed", () => {
    const toys = [toy({ uid: 1, x: 0.2 }), toy({ uid: 2, x: 1.4 })];
    const a = resolveGrab(0, 0, 0.7, toys, hard, seededRng("same"));
    const b = resolveGrab(0, 0, 0.7, toys, hard, seededRng("same"));
    expect(a).toEqual(b);
  });

  it("favours success at low levels: a centred claw lands at least 9 of 10 grabs", () => {
    const rng = seededRng("fair");
    let caught = 0;
    for (let i = 0; i < 10; i++) if (resolveGrab(0, 0, 0.7, [toy()], easy, rng).caught) caught++;
    expect(caught).toBeGreaterThanOrEqual(9);
  });
});

describe("exact (mystery machine) grabs", () => {
  it("win inside the window and miss outside it, regardless of the dice", () => {
    const prize = toy({ radius: 0.6, weight: 0.8 });
    const vars: DifficultyVars = { clawSpeed: 0, gripStrength: 1.4, alignTolerance: 0.3, slipChance: 0, crowding: 0 };
    for (const seed of ["a", "b", "c"]) {
      expect(resolveGrab(0.2, 0, 1.1, [prize], vars, seededRng(seed), false, true)).toMatchObject({ caught: true, chance: 1 });
      expect(resolveGrab(0.55, 0, 1.1, [prize], vars, seededRng(seed), false, true)).toMatchObject({ caught: false, chance: 0 });
    }
    expect(resolveGrab(2, 0, 1.1, [prize], vars, seededRng("x"), false, true).reason).toBe("nothing");
  });
});

describe("slip", () => {
  it("never slips on levels without slip chance", () => {
    const rng = seededRng("slip");
    for (let i = 0; i < 20; i++) expect(slipPoint(toy({ weight: 1 }), easy, rng)).toBeNull();
  });

  it("slips inside the carry window on hard levels", () => {
    const rng = seededRng("slip");
    const points = Array.from({ length: 200 }, () => slipPoint(toy({ weight: 1, gripDifficulty: 0.6 }), hard, rng)).filter((p): p is number => p !== null);
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      expect(p).toBeGreaterThanOrEqual(GRAB.slipWindow[0]);
      expect(p).toBeLessThanOrEqual(GRAB.slipWindow[1]);
    }
  });
});

describe("easiestToy", () => {
  it("picks the exposed light toy over a heavy or buried one", () => {
    const heavy = toy({ uid: 1, x: -1.5, weight: 0.9 });
    const light = toy({ uid: 2, x: 1.5, weight: 0.2 });
    const buried = toy({ uid: 3, x: 1.5, y: 0.4, weight: 0.1 });
    const onTop = toy({ uid: 4, x: 1.5, y: 1.05, weight: 0.5 });
    expect(easiestToy([heavy, light], hard)?.uid).toBe(2);
    expect(easiestToy([heavy, buried, onTop], hard)?.uid).toBe(4);
  });
});
