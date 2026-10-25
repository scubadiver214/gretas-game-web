import { describe, expect, it } from "vitest";
import { RACE } from "../config";
import { Track } from "../world/track";
import { DUSTY_DESERT_DASH } from "../world/tracks/desert";
import { RaceManager, type ProgressEvent } from "./race";

const track = new Track(DUSTY_DESERT_DASH);
const L = track.length;
const GATES = track.checkpoints.length;
const GATE_SCALE = 1.6;

function newRace(racers = 1, laps = 2): { race: RaceManager; events: ProgressEvent[]; clock: { t: number } } {
  const race = new RaceManager(track, racers, laps);
  race.reset(Array.from({ length: racers }, () => L - 8));
  return { race, events: [], clock: { t: 0 } };
}

/** Drive a racer along the loop from `from` to `to` (arc length, may exceed L) in small steps. */
function drive(ctx: ReturnType<typeof newRace>, id: number, from: number, to: number, opts: { lateral?: number; step?: number; dt?: number } = {}): void {
  const step = opts.step ?? 0.8;
  for (let s = from; s <= to + 1e-9; s += step) {
    ctx.clock.t += opts.dt ?? 0.03;
    ctx.race.update(id, ((s % L) + L) % L, opts.lateral ?? 0, ctx.clock.t, GATE_SCALE, (e) => ctx.events.push(e));
  }
}

const types = (events: ProgressEvent[]) => events.map((e) => e.type);

describe("RaceManager laps and gates", () => {
  it("starts on lap 1 expecting gate 1; crossing the line at the start does nothing", () => {
    const ctx = newRace();
    drive(ctx, 0, L - 8, L + 12);
    expect(ctx.events).toEqual([]);
    expect(ctx.race.racers[0].next).toBe(1);
    expect(ctx.race.racers[0].lap).toBe(1);
  });

  it("counts gates in order", () => {
    const ctx = newRace();
    drive(ctx, 0, L - 8, L + track.checkpoints[3].s + 5);
    const passed = ctx.events.filter((e) => e.type === "checkpoint").map((e) => (e as { index: number }).index);
    expect(passed).toEqual([1, 2, 3]);
    expect(ctx.race.racers[0].next).toBe(4);
    expect(ctx.race.racers[0].lastCheckpoint).toBe(3);
  });

  it("completes a lap only after every gate, with the lap time", () => {
    const ctx = newRace();
    drive(ctx, 0, L - 8, L + L + 5);
    expect(types(ctx.events)).toEqual(["checkpoint", "checkpoint", "checkpoint", "checkpoint", "checkpoint", "lap"]);
    const lap = ctx.events[5] as Extract<ProgressEvent, { type: "lap" }>;
    expect(lap.lap).toBe(1);
    expect(lap.best).toBe(true);
    expect(lap.lapTime).toBeGreaterThan(0);
    const r = ctx.race.racers[0];
    expect(r.lap).toBe(2);
    expect(r.finished).toBe(false);
    expect(r.next).toBe(1);
  });

  it("finishes after the last lap, with a place and a time", () => {
    const ctx = newRace(1, 2);
    drive(ctx, 0, L - 8, L * 3 + 5);
    const finish = ctx.events.filter((e) => e.type === "finish");
    expect(finish).toHaveLength(1);
    const r = ctx.race.racers[0];
    expect(r.finished).toBe(true);
    expect(r.place).toBe(1);
    expect(r.lapTimes).toHaveLength(2);
    expect(r.finishTime).toBeCloseTo(r.lapTimes[0] + r.lapTimes[1], 6);
    // A lap event precedes the finish event for the last lap.
    expect(types(ctx.events).slice(-2)).toEqual(["lap", "finish"]);
  });

  it("tracks the best lap across laps", () => {
    const ctx = newRace(1, 3);
    // The first crossing of the line (at L) is the start; laps finish at 2L, 3L and 4L.
    drive(ctx, 0, L - 8, L * 3 + 5, { dt: 0.04 });
    drive(ctx, 0, L * 3 + 5, L * 4 + 5, { dt: 0.02 });
    const r = ctx.race.racers[0];
    expect(r.lapTimes).toHaveLength(3);
    expect(r.bestLap).toBe(Math.min(...r.lapTimes));
    expect(r.bestLap).toBe(r.lapTimes[2]);
  });

  it("supports a single-lap race", () => {
    const ctx = newRace(1, 1);
    drive(ctx, 0, L - 8, L * 2 + 5);
    expect(ctx.race.racers[0].finished).toBe(true);
    expect(ctx.race.racers[0].lapTimes).toHaveLength(1);
  });

  it("stops counting once finished", () => {
    const ctx = newRace(1, 1);
    drive(ctx, 0, L - 8, L * 4);
    expect(ctx.events.filter((e) => e.type === "finish")).toHaveLength(1);
    expect(ctx.race.racers[0].lapTimes).toHaveLength(1);
  });
});

describe("RaceManager shortcut and cheat prevention", () => {
  it("ignores a gate that is not the next one", () => {
    const ctx = newRace();
    // Teleport-free but skipping gate 1: start just after it and drive over gate 2.
    ctx.race.teleport(0, track.checkpoints[1].s + 10);
    drive(ctx, 0, track.checkpoints[1].s + 10, track.checkpoints[3].s + 5);
    expect(ctx.events.filter((e) => e.type === "checkpoint")).toEqual([]);
    expect(ctx.race.racers[0].next).toBe(1);
  });

  it("cannot award a lap by driving the finish line over and over", () => {
    const ctx = newRace();
    for (let i = 0; i < 20; i++) {
      drive(ctx, 0, L - 6, L + 6);
      drive(ctx, 0, L + 6, L - 6, { step: -0.8 });
    }
    expect(ctx.events).toEqual([]);
    expect(ctx.race.racers[0].lap).toBe(1);
  });

  it("does not count a gate crossed backwards, and counts it once when crossed forwards afterwards", () => {
    const ctx = newRace();
    const g1 = track.checkpoints[1].s;
    ctx.race.teleport(0, g1 + 6);
    drive(ctx, 0, g1 + 6, g1 - 6, { step: -0.8 });
    expect(ctx.events).toEqual([]);
    drive(ctx, 0, g1 - 6, g1 + 6);
    expect(ctx.events.filter((e) => e.type === "checkpoint")).toHaveLength(1);
  });

  it("ignores a jump in position (a teleport is not a crossing)", () => {
    const ctx = newRace();
    ctx.clock.t = 1;
    ctx.race.update(0, track.checkpoints[1].s - 40, 0, 1, GATE_SCALE, (e) => ctx.events.push(e));
    ctx.race.update(0, track.checkpoints[1].s + 40, 0, 1.05, GATE_SCALE, (e) => ctx.events.push(e));
    expect(ctx.events).toEqual([]);
    expect(RACE.maxCrossingStep).toBeLessThan(80);
  });

  it("respawning (teleport) never counts as passing a gate", () => {
    const ctx = newRace();
    drive(ctx, 0, L - 8, L + track.checkpoints[2].s + 5);
    const passed = ctx.race.racers[0].passed;
    ctx.race.teleport(0, track.checkpoints[2].s - 1);
    drive(ctx, 0, track.checkpoints[2].s - 1, track.checkpoints[2].s + 3);
    expect(ctx.race.racers[0].passed).toBe(passed);
  });

  it("only counts gates crossed inside their width", () => {
    const tight = newRace();
    const half = track.checkpoints[1].halfWidth;
    // Well outside the gate (further than half-width * scale): no count.
    drive(tight, 0, L - 8, L + track.checkpoints[1].s + 5, { lateral: half * GATE_SCALE + 3 });
    expect(tight.events).toEqual([]);
    const ok = newRace();
    drive(ok, 0, L - 8, L + track.checkpoints[1].s + 5, { lateral: half * GATE_SCALE - 1 });
    expect(ok.events.filter((e) => e.type === "checkpoint")).toHaveLength(1);
  });
});

describe("RaceManager ranking", () => {
  it("ranks by laps, then gates passed, then distance along the segment", () => {
    const { race } = newRace(4, 3);
    const [a, b, c, d] = race.racers;
    a.lap = 2; a.passed = 6; a.fraction = 0.1;
    b.lap = 1; b.passed = 5; b.fraction = 0.9; // more gates this lap but a lap behind
    c.lap = 2; c.passed = 7; c.fraction = 0.05; // same lap as a, one more gate
    d.lap = 2; d.passed = 6; d.fraction = 0.6; // same gates as a, further along
    expect(race.rank()).toEqual([2, 3, 0, 1]);
    expect(race.positionOf(2)).toBe(1);
    expect(race.positionOf(1)).toBe(4);
  });

  it("does not rank by straight-line distance to the finish", () => {
    // Two racers equally far from the line as the crow flies, but one has passed more gates.
    const { race } = newRace(2, 2);
    race.racers[0].passed = 1;
    race.racers[0].fraction = 0.1;
    race.racers[1].passed = 3;
    race.racers[1].fraction = 0.0;
    expect(race.rank()).toEqual([1, 0]);
  });

  it("puts finished racers first, in the order they finished", () => {
    const ctx = newRace(3, 1);
    // Racer 2 finishes, then racer 0; racer 1 is still on track.
    drive(ctx, 2, L - 8, L * 2 + 5);
    drive(ctx, 0, L - 8, L * 2 + 5);
    drive(ctx, 1, L - 8, L + 400);
    expect(ctx.race.racers[2].place).toBe(1);
    expect(ctx.race.racers[0].place).toBe(2);
    expect(ctx.race.rank()).toEqual([2, 0, 1]);
  });

  it("updates the live ranking as racers pass each other", () => {
    const ctx = newRace(2, 2);
    drive(ctx, 0, L - 8, L + 300);
    drive(ctx, 1, L - 8, L + 100);
    expect(ctx.race.rank()).toEqual([0, 1]);
    drive(ctx, 1, L + 100, L + 600);
    expect(ctx.race.rank()).toEqual([1, 0]);
  });

  it("measures progress within a segment, 0 at the last gate to 1 at the next", () => {
    const ctx = newRace();
    const g = track.checkpoints;
    drive(ctx, 0, L - 8, L + g[1].s + 1);
    const r = ctx.race.racers[0];
    expect(r.lastCheckpoint).toBe(1);
    expect(r.fraction).toBeLessThan(0.05);
    drive(ctx, 0, L + g[1].s + 1, L + (g[1].s + g[2].s) / 2);
    expect(r.fraction).toBeGreaterThan(0.4);
    expect(r.fraction).toBeLessThan(0.6);
  });

  it("is negative-safe before the line: a racer on the grid has progress 0", () => {
    const { race } = newRace();
    expect(race.racers[0].fraction).toBe(0);
  });

  it("has the gate count the track defines", () => {
    expect(GATES).toBe(6);
  });
});
