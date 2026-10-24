import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/rng";
import { CABINET, CLAW } from "../config";
import { TOY_TEMPLATES } from "../content/prizes";
import { dropForTipY, tipY } from "./claw";
import { PLANAR_PILE_BOUNDS, highestUnder, layoutPile, overChute, pickTemplates, reachDistance, restHeight, stepPile, stopDropFor } from "./pile";
import type { ToyState } from "./types";

const templates = Object.values(TOY_TEMPLATES).filter((t) => t.size <= 0.5);

function toy(partial: Partial<ToyState>): ToyState {
  return {
    uid: 1,
    prizeId: "x",
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

describe("restHeight", () => {
  it("rests on the floor with nothing below", () => {
    expect(restHeight({ uid: 9, x: 0, z: 0, radius: 0.3 }, [])).toBe(0.3);
  });

  it("stacks on a toy directly beneath and ignores toys far away", () => {
    const under = toy({ uid: 1, radius: 0.4, y: 0.4 });
    const far = toy({ uid: 2, x: 3, radius: 0.4, y: 0.4 });
    const onTop = restHeight({ uid: 3, x: 0, z: 0, radius: 0.3 }, [under, far]);
    expect(onTop).toBeGreaterThan(0.4);
    expect(onTop).toBeLessThanOrEqual(0.4 + 0.7);
    expect(restHeight({ uid: 3, x: -3, z: 0, radius: 0.3 }, [under, far])).toBe(0.3);
  });
});

describe("layoutPile", () => {
  it("keeps every toy inside the cabinet, off the chute and under the claw's ceiling", () => {
    for (const seed of ["a", "b", "c", "d"]) {
      const rng = seededRng(seed);
      const toys = layoutPile(rng, pickTemplates(rng, templates, 24), 0.6);
      expect(toys).toHaveLength(24);
      for (const t of toys) {
        expect(Math.abs(t.x) + t.radius).toBeLessThanOrEqual(CABINET.width / 2 + 1e-6);
        expect(Math.abs(t.z) + t.radius).toBeLessThanOrEqual(CABINET.depth / 2 + 1e-6);
        expect(t.y + t.radius).toBeLessThanOrEqual(CLAW.maxPileTop + 1e-6);
        expect(t.y).toBeGreaterThanOrEqual(t.radius - 1e-6);
        expect(overChute(t.x, t.z, t.radius)).toBe(false);
      }
    }
  });

  it("keeps simple-machine piles in the band under the rail", () => {
    const rng = seededRng("band");
    const toys = layoutPile(rng, pickTemplates(rng, templates, 16), 0.3, PLANAR_PILE_BOUNDS);
    for (const t of toys) {
      expect(t.z - t.radius).toBeGreaterThanOrEqual(PLANAR_PILE_BOUNDS.minZ - 1e-6);
      expect(t.z + t.radius).toBeLessThanOrEqual(PLANAR_PILE_BOUNDS.maxZ + 1e-6);
    }
    // Planar reach ignores the small depth offsets inside the band.
    expect(reachDistance(0, 0, { x: 0.2, z: 0.7 }, true)).toBeCloseTo(0.2);
    expect(reachDistance(0, 0, { x: 0.2, z: 0.7 }, false)).toBeGreaterThan(0.7);
  });

  it("is deterministic for a seed", () => {
    const a = layoutPile(seededRng("same"), pickTemplates(seededRng("same"), templates, 12), 0.2);
    const b = layoutPile(seededRng("same"), pickTemplates(seededRng("same"), templates, 12), 0.2);
    expect(a).toEqual(b);
  });

  it("keeps an easy pile on the floor, toward the open platform, not stacked on the back wall", () => {
    const rng = seededRng("easy-floor");
    const toys = layoutPile(rng, pickTemplates(rng, templates, 12), 0.1);
    const onFloor = toys.filter((t) => Math.abs(t.y - t.radius) < 0.03);
    expect(onFloor.length).toBeGreaterThanOrEqual(10);
    const meanZ = toys.reduce((s, t) => s + t.z, 0) / toys.length;
    expect(meanZ).toBeGreaterThan(-0.35);
  });

  it("does not leave toys floating: one physics step changes nothing", () => {
    const toys = layoutPile(seededRng("settle"), pickTemplates(seededRng("settle"), templates, 16), 0.4);
    const before = toys.map((t) => t.y);
    stepPile(toys, 1 / 120);
    toys.forEach((t, i) => expect(t.y).toBeCloseTo(before[i], 2));
    expect(toys.every((t) => t.status === "resting")).toBe(true);
  });

  it("cycles through the pool so every prize appears before repeats", () => {
    const pool = templates.slice(0, 5);
    const picked = pickTemplates(seededRng("cycle"), pool, 5).map((t) => t.id).sort();
    expect(picked).toEqual(pool.map((t) => t.id).sort());
  });
});

describe("stepPile", () => {
  it("drops a toy that lost its support and lands it resting", () => {
    const floor = toy({ uid: 1, y: 0.4 });
    const above = toy({ uid: 2, y: 1.6, status: "falling" });
    const toys = [floor, above];
    const landed: number[] = [];
    for (let i = 0; i < 240; i++) stepPile(toys, 1 / 120, (t) => landed.push(t.uid));
    expect(above.status).toBe("resting");
    expect(above.y).toBeCloseTo(restHeight(above, [floor]), 3);
    expect(landed).toEqual([2]);
  });

  it("lands with a wobble that then fades", () => {
    const above = toy({ uid: 2, y: 0.6, status: "falling" });
    const toys = [above];
    let wobbleAtLanding = 0;
    for (let i = 0; i < 120; i++) stepPile(toys, 1 / 120, (t) => (wobbleAtLanding = t.wobble));
    expect(wobbleAtLanding).toBeGreaterThan(0);
    for (let i = 0; i < 600; i++) stepPile(toys, 1 / 120);
    expect(above.wobble).toBeLessThan(wobbleAtLanding);
  });

  it("leaves held and delivered toys alone", () => {
    const held = toy({ uid: 1, y: 3, status: "held" });
    const done = toy({ uid: 2, y: -1, status: "delivered" });
    stepPile([held, done], 0.5);
    expect(held.y).toBe(3);
    expect(done.y).toBe(-1);
  });
});

describe("stopDropFor", () => {
  it("stops the fingers just inside the top toy under the claw", () => {
    const t = toy({ uid: 1, y: 0.4, radius: 0.4 });
    const drop = stopDropFor(0, 0, [t]);
    expect(tipY(drop)).toBeCloseTo(0.8 - CLAW.sink, 5);
  });

  it("goes almost to the floor when nothing is under the claw", () => {
    const drop = stopDropFor(2, 1, [toy({ x: -2 })]);
    expect(tipY(drop)).toBeLessThan(0.1);
    expect(drop).toBeCloseTo(dropForTipY(0.04), 5);
    expect(highestUnder(2, 1, [toy({ x: -2 })])).toBeNull();
  });
});
