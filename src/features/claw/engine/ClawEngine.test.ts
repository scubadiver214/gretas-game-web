import { describe, expect, it } from "vitest";
import { CHUTE } from "../config";
import { levelDef, mysterySetup } from "../content/levels";
import { TOY_TEMPLATES } from "../content/prizes";
import { ClawEngine } from "./ClawEngine";
import { RAIL_BOUNDS } from "./claw";
import { neighbourCount } from "./grab";
import { isExposed } from "./pile";
import type { ClawEvent, EnginePhase, HudSnapshot, LevelSetup } from "./types";

const STEP = 1 / 60;

function make(level = 1, seed = "test"): ClawEngine {
  return new ClawEngine({ ...levelDef(level), seed }, TOY_TEMPLATES);
}

/** Runs the engine until `done()` or the time budget runs out. Returns seconds simulated. */
function runUntil(engine: ClawEngine, done: () => boolean, maxSeconds = 30): number {
  let t = 0;
  while (!done() && t < maxSeconds) {
    engine.advance(STEP);
    t += STEP;
  }
  return t;
}

/** A resting toy with nothing on top of it (the kind a centred claw wins on level 1). */
function exposedToy(engine: ClawEngine) {
  const toys = engine.toys.filter((t) => t.status === "resting");
  const exposed = toys.filter((t) => isExposed(t, toys) && neighbourCount(t, toys) === 0) ;
  return (exposed.length ? exposed : toys.filter((t) => isExposed(t, toys)))[0];
}

function record(engine: ClawEngine): ClawEvent[] {
  const events: ClawEvent[] = [];
  engine.events.on((e) => events.push(e));
  return events;
}

/** Positions the claw over a toy and plays one full grab, returning the resolution. */
function grabAt(engine: ClawEngine, x: number, z?: number): { caught: boolean; endPhase: EnginePhase } {
  engine.moveTo(x, z ?? engine.claw.z);
  runUntil(engine, () => Math.abs(engine.claw.x - x) < 1e-6 && (z === undefined || Math.abs(engine.claw.z - z) < 1e-6));
  let caught = false;
  const off = engine.events.on((e) => {
    if (e.type === "grabResolved") caught = e.caught;
  });
  engine.grab();
  runUntil(engine, () => engine.phase === "positioning" || engine.phase === "delivered");
  off();
  return { caught, endPhase: engine.phase };
}

describe("ClawEngine", () => {
  it("builds a level with the configured toys and starts in ready", () => {
    const engine = make(1);
    const def = levelDef(1);
    expect(engine.phase).toBe("ready");
    expect(engine.toys).toHaveLength(def.toyCount);
    expect(engine.goal).toBe(def.goal);
    expect(engine.toys.every((t) => def.pool.includes(t.prizeId))).toBe(true);
  });

  it("moves the claw while a direction is held and stays inside the rails", () => {
    const engine = make();
    engine.start();
    const x0 = engine.claw.x;
    engine.move("right", true);
    runUntil(engine, () => false, 0.5);
    expect(engine.claw.x).toBeGreaterThan(x0);
    engine.move("right", false);
    const stopped = engine.claw.x;
    runUntil(engine, () => false, 0.2);
    expect(engine.claw.x).toBe(stopped);
    engine.move("left", true);
    runUntil(engine, () => false, 20);
    expect(engine.claw.x).toBe(RAIL_BOUNDS.minX);
  });

  it("moves to the back and front on every level, from level 1", () => {
    const engine = make(1);
    expect(engine.depthControl).toBe(true);
    engine.start();
    const z0 = engine.claw.z;
    engine.move("forward", true);
    expect(engine.stickZ).toBe(1);
    runUntil(engine, () => false, 0.3);
    expect(engine.claw.z).toBeGreaterThan(z0);
    engine.move("forward", false);
    expect(engine.stickZ).toBe(0);
    engine.move("back", true);
    expect(engine.stickZ).toBe(-1);
    runUntil(engine, () => false, 20);
    expect(engine.claw.z).toBe(RAIL_BOUNDS.minZ);
    expect(engine.stickZ).toBe(-1);
  });

  it("still supports a simple left/right machine when a level asks for one", () => {
    const engine = new ClawEngine({ ...levelDef(1), depthControl: false, seed: "planar" }, TOY_TEMPLATES);
    engine.start();
    const z = engine.claw.z;
    engine.move("forward", true);
    runUntil(engine, () => false, 0.3);
    expect(engine.claw.z).toBe(z);
    expect(engine.hud().depthControl).toBe(false);
  });

  it("delivers a toy to the chute and awards points when centred on level 1", () => {
    const engine = make(1, "sure");
    const events = record(engine);
    engine.start();
    // Level 1 tops out at a 98% chance, so allow the honest 2% miss a retry.
    const aim = () => {
      const t = exposedToy(engine);
      return grabAt(engine, t.x, t.z);
    };
    let result = aim();
    for (let attempt = 1; attempt < 3 && !result.caught; attempt++) result = aim();
    expect(result.caught).toBe(true);
    expect(result.endPhase).toBe("delivered");
    const delivered = events.find((e) => e.type === "prizeDelivered");
    expect(delivered).toBeDefined();
    expect(engine.successes).toBe(1);
    expect(engine.grabs).toBe(engine.misses + 1);
    expect(engine.points).toBeGreaterThan(0);
    expect(engine.prizes).toHaveLength(1);
    const toy = engine.toys.find((t) => t.status === "delivered")!;
    expect(toy.x).toBeCloseTo(CHUTE.x, 5);
    expect(toy.y).toBeLessThan(0);
    // The sequence of phases was walked in order.
    const types: string[] = events.map((e) => e.type);
    const order = ["grabStart", "descendStop", "jawClose", "grabResolved", "lifted", "released", "prizeDelivered"];
    let last = -1;
    for (const t of order) {
      const i = types.indexOf(t, last + 1);
      expect(i, `${t} after ${types[last]}`).toBeGreaterThan(last);
      last = i;
    }
  });

  it("misses when the claw is over empty floor, counts the miss and returns control", () => {
    const engine = make(1, "miss");
    engine.start();
    // Clear the pile so the claw is guaranteed to find nothing.
    for (const t of engine.toys) t.status = "delivered";
    const events = record(engine);
    const result = grabAt(engine, 0);
    expect(result.caught).toBe(false);
    expect(result.endPhase).toBe("positioning");
    expect(engine.misses).toBe(1);
    expect(engine.successes).toBe(0);
    expect(events.some((e) => e.type === "miss")).toBe(true);
    expect(events.some((e) => e.type === "prizeDelivered")).toBe(false);
  });

  it("never clears a level from misses alone", () => {
    const engine = make(1, "misses");
    engine.start();
    for (const t of engine.toys) t.status = "delivered";
    for (let i = 0; i < 6; i++) grabAt(engine, i % 2 ? 1 : -1);
    expect(engine.phase).toBe("positioning");
    expect(engine.summary().stars).toBe(0);
  });

  it("clears the level once the goal is met and pays stars", () => {
    const setup: LevelSetup = { ...levelDef(1), goal: 1, seed: "clear" };
    const engine = new ClawEngine(setup, TOY_TEMPLATES);
    const events = record(engine);
    engine.start();
    const target = exposedToy(engine);
    const r = grabAt(engine, target.x, target.z);
    expect(r.endPhase).toBe("delivered");
    engine.continue();
    expect(engine.phase).toBe("levelClear");
    const clear = events.find((e) => e.type === "levelClear");
    expect(clear).toMatchObject({ type: "levelClear", level: 1, stars: 3, grabs: 1 });
    expect(engine.summary()).toMatchObject({ successes: 1, goal: 1, stars: 3 });
    expect(engine.summary().prizes).toEqual([target.prizeId]);
  });

  it("keeps playing after a delivery when the goal is not met yet", () => {
    const setup: LevelSetup = { ...levelDef(1), goal: 2, seed: "two" };
    const engine = new ClawEngine(setup, TOY_TEMPLATES);
    engine.start();
    const target = exposedToy(engine);
    const r = grabAt(engine, target.x, target.z);
    expect(r.endPhase).toBe("delivered");
    engine.continue();
    expect(engine.phase).toBe("positioning");
  });

  it("pauses and resumes without losing state", () => {
    const engine = make();
    engine.start();
    engine.move("right", true);
    runUntil(engine, () => false, 0.3);
    const x = engine.claw.x;
    engine.pause();
    expect(engine.phase).toBe("paused");
    runUntil(engine, () => false, 1);
    expect(engine.claw.x).toBe(x);
    engine.resume();
    expect(engine.phase).toBe("positioning");
    // Pausing dropped the held direction.
    runUntil(engine, () => false, 0.2);
    expect(engine.claw.x).toBe(x);
  });

  it("ignores grab outside of positioning", () => {
    const engine = make();
    engine.grab();
    expect(engine.phase).toBe("ready");
    expect(engine.grabs).toBe(0);
    engine.start();
    engine.grab();
    expect(engine.phase).toBe("descending");
    engine.grab();
    expect(engine.grabs).toBe(1);
  });

  it("pushes HUD snapshots only when a shown value changes", () => {
    const engine = make();
    const snaps: HudSnapshot[] = [];
    engine.onHud((h) => snaps.push(h));
    expect(snaps).toHaveLength(1);
    runUntil(engine, () => false, 0.5);
    expect(snaps).toHaveLength(1);
    engine.start();
    expect(snaps).toHaveLength(2);
    expect(snaps[1]).toMatchObject({ phase: "positioning", canMove: true, canGrab: true });
  });

  it("offers assistance after repeated misses and clears it on a success", () => {
    const engine = make(1, "assist");
    const events = record(engine);
    engine.start();
    // Park every toy on the far right so grabs on the far left find nothing.
    for (const t of engine.toys) t.x = 1.6 + (t.x + 3) * 0.12;
    const left = RAIL_BOUNDS.minX + 0.2;
    grabAt(engine, left);
    expect(events.some((e) => e.type === "assist")).toBe(false);
    grabAt(engine, left);
    expect(events.some((e) => e.type === "assist")).toBe(true);
    const baseTol = levelDef(1).difficulty.alignTolerance;
    expect(engine.vars.alignTolerance).toBeGreaterThan(baseTol);
    expect(engine.hintToy).toBeNull();
    grabAt(engine, left);
    expect(engine.hintToy).not.toBeNull();
    expect(engine.hud().hint).toBe("right");
    const bumpedBefore = events.filter((e) => e.type === "toyBumped").length;
    grabAt(engine, left);
    // The fourth miss nudges an easy toy out of the pile towards the claw.
    expect(events.filter((e) => e.type === "toyBumped").length).toBeGreaterThan(bumpedBefore);
    expect(engine.missStreak).toBe(4);
    // Let the offered toy land, then catch it: assistance resets.
    runUntil(engine, () => engine.toys.every((t) => t.status !== "falling"), 5);
    const offered = engine.toys.find((t) => t.uid === engine.hintToy)!;
    const r = grabAt(engine, offered.x, offered.z);
    expect(r.caught).toBe(true);
    expect(engine.hintToy).toBeNull();
    expect(engine.hud().hint).toBeNull();
    expect(engine.vars.alignTolerance).toBe(baseTol);
    expect(engine.missStreak).toBe(0);
  });

  it("reset rebuilds the machine for another level", () => {
    const engine = make(1);
    engine.start();
    engine.reset({ ...levelDef(25), seed: "l25" });
    expect(engine.phase).toBe("ready");
    expect(engine.level).toBe(25);
    expect(engine.depthControl).toBe(true);
    expect(engine.toys).toHaveLength(levelDef(25).toyCount);
    engine.start();
    const z = engine.claw.z;
    engine.move("forward", true);
    runUntil(engine, () => false, 0.3);
    expect(engine.claw.z).toBeGreaterThan(z);
  });

  it("runs a mystery machine: the claw sweeps on its own and GRAB stops it", () => {
    const engine = new ClawEngine({ ...mysterySetup("toybox"), seed: "m" }, TOY_TEMPLATES);
    engine.start();
    expect(engine.toys).toHaveLength(1);
    expect(engine.hud().canMove).toBe(false);
    const x0 = engine.claw.x;
    runUntil(engine, () => false, 0.4);
    expect(engine.claw.x).not.toBe(x0);
    engine.move("left", true);
    const sweeping = engine.claw.x;
    runUntil(engine, () => false, 0.1);
    expect(engine.claw.x).not.toBe(sweeping);
    // Wait until the claw is over the pedestal, then grab: alignment wins.
    runUntil(engine, () => Math.abs(engine.claw.x) < 0.03, 10);
    let caught = false;
    engine.events.on((e) => {
      if (e.type === "grabResolved") caught = e.caught;
    });
    engine.grab();
    runUntil(engine, () => engine.phase === "delivered" || engine.phase === "positioning");
    expect(caught).toBe(true);
    expect(engine.phase).toBe("delivered");
  });
});
