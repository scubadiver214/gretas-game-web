import { describe, expect, it } from "vitest";
import { BAKE, LAST_CALL_SECONDS, SCORING } from "../config";
import { INGREDIENT_BY_ID, STARTER_INGREDIENTS, type IngredientId } from "../content/ingredients";
import type { StationKind } from "../content/layout";
import { modsFor } from "../content/shop";
import { KitchenEngine } from "./KitchenEngine";
import { isSolid } from "./movement";
import type { KitchenEvent, Order, Station } from "./types";

const DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

/** Stand chef 0 on a floor tile next to the station, facing it. */
function stepUpTo(engine: KitchenEngine, st: Station, chef = 0): void {
  const s = engine.state;
  for (const [dx, dz] of DIRS) {
    const nx = st.tx + dx;
    const nz = st.tz + dz;
    if (isSolid(s, nx, nz)) continue;
    const c = s.chefs[chef];
    c.x = nx + 0.5;
    c.z = nz + 0.5;
    c.vx = 0;
    c.vz = 0;
    c.facing = Math.atan2(-dx, -dz);
    // Park the other chefs far away so they never block.
    s.chefs.forEach((o, i) => {
      if (i !== chef) {
        o.x = 1.5 + i;
        o.z = 6.5;
      }
    });
    engine.advance(1 / 60);
    expect(c.target).toBe(st.id);
    return;
  }
  throw new Error(`no floor next to station ${st.id}`);
}

function station(engine: KitchenEngine, kind: StationKind, pick: (s: Station) => boolean = () => true): Station {
  const st = engine.state.stations.find((s) => s.kind === kind && pick(s));
  if (!st) throw new Error(`no ${kind} station`);
  return st;
}

function press(engine: KitchenEngine, type: "interact" | "work", chef = 0): void {
  engine.command({ type, chef });
  engine.advance(1 / 60);
}

function run(engine: KitchenEngine, seconds: number): void {
  for (let t = 0; t < seconds; t += 0.1) engine.advance(0.1);
}

function record(engine: KitchenEngine): KitchenEvent[] {
  const events: KitchenEvent[] = [];
  engine.events.on((e) => events.push(e));
  return events;
}

/** Fetch an ingredient, prep it if needed, and leave it in chef 0's hands. */
function fetch(engine: KitchenEngine, id: IngredientId): void {
  stepUpTo(engine, station(engine, "pantry", (s) => s.ingredient === id));
  press(engine, "interact");
  const prep = INGREDIENT_BY_ID[id].prep;
  if (prep === "chop" || prep === "grate") {
    const board = station(engine, "chop", (s) => !s.item);
    stepUpTo(engine, board);
    press(engine, "interact");
    press(engine, "work");
    run(engine, 2);
    press(engine, "interact");
  }
}

/** Cook the order start to finish with chef 0 and serve it. */
function cook(engine: KitchenEngine, order: Order): void {
  fetch(engine, order.dough);
  const table = station(engine, "roll", (s) => !s.item);
  stepUpTo(engine, table);
  press(engine, "interact");
  press(engine, "work");
  run(engine, 2.5);
  expect(table.item?.kind).toBe("pizza");

  // Assemble on the dough table: carry each prepped ingredient over.
  for (const id of [order.sauce, order.cheese, ...order.toppings]) {
    if (!id) continue;
    fetch(engine, id);
    stepUpTo(engine, table);
    press(engine, "interact");
  }
  press(engine, "interact"); // pick the pizza up

  const oven = station(engine, "oven", (s) => !s.item);
  stepUpTo(engine, oven);
  press(engine, "interact");
  run(engine, engine.state.difficulty.bakeSeconds * 1.1);
  press(engine, "interact");
  expect(engine.state.chefs[0].holding?.kind).toBe("pizza");

  const slicer = station(engine, "slice");
  stepUpTo(engine, slicer);
  press(engine, "interact");
  press(engine, "work");
  run(engine, 1.5);
  press(engine, "interact");

  stepUpTo(engine, station(engine, "pass"));
  press(engine, "interact");
}

function freshShift(level = 1, seed = "test") {
  const engine = new KitchenEngine({ seed, level, unlocked: STARTER_INGREDIENTS });
  engine.start();
  engine.advance(1 / 60);
  return engine;
}

describe("KitchenEngine", () => {
  it("opens with a ticket on the rail", () => {
    const engine = freshShift();
    expect(engine.state.orders).toHaveLength(1);
    expect(engine.state.menu.length).toBeGreaterThan(0);
    expect(engine.state.stations.filter((s) => s.kind === "pantry").every((s) => s.ingredient)).toBe(true);
  });

  it("cooks, bakes, slices and serves a correct pizza", () => {
    const engine = freshShift();
    const events = record(engine);
    const order = engine.state.orders[0];
    cook(engine, order);

    const served = events.find((e) => e.type === "served");
    expect(served?.type === "served" && served.result.correct).toBe(true);
    expect(served?.type === "served" && served.result.bake).toBe("perfect");
    expect(engine.state.stats.correct).toBe(1);
    expect(engine.state.stats.perfectBakes).toBe(1);
    expect(engine.state.combo).toBe(1);
    expect(engine.state.score).toBeGreaterThan(order.value);
    expect(engine.state.orders.some((o) => o.id === order.id)).toBe(false);
    expect(events.some((e) => e.type === "added" && !e.wanted)).toBe(false);
  });

  it("builds a combo across correct pizzas", () => {
    const engine = freshShift();
    cook(engine, engine.state.orders[0]);
    const before = engine.state.score;
    if (engine.state.orders.length === 0) run(engine, 25);
    cook(engine, engine.state.orders[0]);
    expect(engine.state.combo).toBe(2);
    expect(engine.state.bestCombo).toBe(2);
    expect(engine.state.score - before).toBeGreaterThan(0);
  });

  it("flags a topping no ticket wants", () => {
    const engine = freshShift();
    const events = record(engine);
    const table = station(engine, "roll");
    fetch(engine, "classic");
    stepUpTo(engine, table);
    press(engine, "interact");
    press(engine, "work");
    run(engine, 2.5);
    const order = engine.state.orders[0];
    const unwanted = (["basil", "pepperoni", "mushroom"] as IngredientId[]).find((t) => engine.state.orders.every((o) => !o.toppings.includes(t)));
    expect(unwanted).toBeDefined();
    fetch(engine, unwanted!);
    stepUpTo(engine, table);
    press(engine, "interact");
    const added = events.find((e) => e.type === "added");
    expect(added).toMatchObject({ type: "added", ingredient: unwanted, wanted: false });
    expect(engine.state.stats.wrongToppings).toBe(1);
    expect(order).toBeDefined();
  });

  it("won't take raw ingredients or serve raw pizza", () => {
    const engine = freshShift();
    const events = record(engine);
    // Raw mozzarella onto a rolled base.
    const table = station(engine, "roll");
    fetch(engine, "classic");
    stepUpTo(engine, table);
    press(engine, "interact");
    press(engine, "work");
    run(engine, 2.5);
    stepUpTo(engine, station(engine, "pantry", (s) => s.ingredient === "mozzarella"));
    press(engine, "interact");
    stepUpTo(engine, table);
    press(engine, "interact");
    expect(events.some((e) => e.type === "rejected" && e.reason === "needsPrep")).toBe(true);

    // Bin the cheese, carry the bare base to the pass.
    stepUpTo(engine, station(engine, "bin"));
    press(engine, "interact");
    stepUpTo(engine, table);
    press(engine, "interact");
    stepUpTo(engine, station(engine, "pass"));
    press(engine, "interact");
    expect(events.some((e) => e.type === "rejected" && e.reason === "raw")).toBe(true);
    expect(engine.state.stats.served).toBe(0);
  });

  it("burns a forgotten pizza", () => {
    const engine = freshShift();
    const events = record(engine);
    const table = station(engine, "roll");
    fetch(engine, "classic");
    stepUpTo(engine, table);
    press(engine, "interact");
    press(engine, "work");
    run(engine, 2.5);
    press(engine, "interact");
    stepUpTo(engine, station(engine, "oven"));
    press(engine, "interact");
    run(engine, engine.state.difficulty.bakeSeconds * (BAKE.burnt + 0.1));
    const stages = events.filter((e) => e.type === "bakeStage").map((e) => (e.type === "bakeStage" ? e.stage : null));
    expect(stages).toEqual(["cooked", "warning", "burnt"]);
    expect(engine.state.stats.burnt).toBe(1);
  });

  it("customers walk out when they run out of patience", () => {
    const engine = freshShift();
    engine.state.score = 100;
    engine.state.combo = 3;
    const first = engine.state.orders[0];
    run(engine, first.maxPatience + 0.5);
    expect(engine.state.stats.walkouts).toBeGreaterThanOrEqual(1);
    expect(engine.state.combo).toBe(0);
    expect(engine.state.score).toBeLessThanOrEqual(100 - SCORING.walkoutPenalty);
  });

  it("never has more tickets than the level allows", () => {
    const engine = freshShift(5);
    for (let t = 0; t < 60; t += 0.5) {
      run(engine, 0.5);
      expect(engine.state.orders.length).toBeLessThanOrEqual(engine.state.difficulty.maxTickets);
    }
  });

  it("calls last orders and closes on time", () => {
    const engine = freshShift();
    const events = record(engine);
    run(engine, engine.state.difficulty.shiftSeconds + 1);
    expect(engine.state.phase).toBe("over");
    expect(events.filter((e) => e.type === "lastCall")).toHaveLength(1);
    expect(events.filter((e) => e.type === "rush")).toHaveLength(1);
    expect(events.at(-1)?.type).toBe("shiftOver");
    expect(engine.state.difficulty.shiftSeconds - LAST_CALL_SECONDS).toBeGreaterThan(0);
    const summary = engine.summary();
    expect(summary.durationSeconds).toBeGreaterThanOrEqual(engine.state.difficulty.shiftSeconds);
  });

  it("is deterministic for a seed", () => {
    const a = freshShift(4, "daily:2026-10-20");
    const b = freshShift(4, "daily:2026-10-20");
    run(a, 90);
    run(b, 90);
    expect(a.state.menu).toEqual(b.state.menu);
    expect(a.state.orders.map((o) => o.name)).toEqual(b.state.orders.map((o) => o.name));
  });

  it("stops the clock while paused", () => {
    const engine = freshShift();
    engine.pause();
    const t = engine.state.time;
    run(engine, 5);
    expect(engine.state.time).toBe(t);
    engine.resume();
    run(engine, 1);
    expect(engine.state.time).toBeGreaterThan(t);
  });

  it("keeps chefs out of the counters", () => {
    const engine = freshShift();
    engine.command({ type: "move", chef: 0, x: 0, z: -1 });
    run(engine, 3);
    const c = engine.state.chefs[0];
    expect(isSolid(engine.state, Math.floor(c.x), Math.floor(c.z))).toBe(false);
    expect(c.z).toBeGreaterThan(1);
  });

  it("adds the extra oven with the upgrade", () => {
    const plain = new KitchenEngine({ seed: "x" });
    const upgraded = new KitchenEngine({ seed: "x", mods: modsFor(["extra-oven"]) });
    const ovens = (e: KitchenEngine) => e.state.stations.filter((s) => s.kind === "oven").length;
    expect(ovens(upgraded)).toBe(ovens(plain) + 1);
  });
});
