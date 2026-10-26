import { describe, expect, it } from "vitest";
import { RACE } from "../config";
import { RIVALS } from "../rivals";
import { neutralControls, type RaceEvent } from "../types";
import { loadWorld, TRACKS } from "../world";
import { DUSTY_DESERT_DASH } from "../world/tracks/desert";
import { RaceEngine, type RaceOptions } from "./RaceEngine";
import { autopilot, runFor } from "./testDriver";

const desert = loadWorld(DUSTY_DESERT_DASH);

function newRace(opts: RaceOptions = {}): RaceEngine {
  return new RaceEngine(desert.track, desert.content, { tier: 1, rivals: RIVALS, ...opts });
}

function goRacing(e: RaceEngine): void {
  e.start();
  runFor(e, RACE.countdownSeconds + 0.05, () => null);
  expect(e.phase).toBe("racing");
}

/** Runs until every car has crossed the line (or the guard runs out). */
function raceToTheEnd(e: RaceEngine, drive: (e: RaceEngine) => ReturnType<typeof autopilot>): void {
  let guard = 0;
  while (e.race.racers.some((r) => !r.finished) && guard++ < 60 * 400) {
    e.setControls(drive(e));
    e.advance(1 / 60);
  }
}

describe("the grid", () => {
  it("puts the player at the back and every rival in its own slot, none touching", () => {
    const e = newRace();
    expect(e.vehicles).toHaveLength(1 + RIVALS.length);
    expect(e.race.count).toBe(1 + RIVALS.length);
    expect(e.hud().racers).toBe(5);
    expect(e.hud().rank).toBe(5);
    for (let i = 0; i < e.vehicles.length; i++) {
      for (let j = i + 1; j < e.vehicles.length; j++) {
        const a = e.vehicles[i];
        const b = e.vehicles[j];
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(e.carParams[i].radius + e.carParams[j].radius + 1);
      }
    }
    // Every rival is ahead of the player on the road.
    for (let i = 1; i < e.vehicles.length; i++) expect(e.vehicles[i].query.s).toBeGreaterThan(e.player.query.s);
  });

  it("can put the player on pole instead", () => {
    const e = newRace({ playerSlot: 0 });
    for (let i = 1; i < e.vehicles.length; i++) expect(e.vehicles[i].query.s).toBeLessThan(e.player.query.s);
  });

  it("gives each rival its own handling and name", () => {
    const e = newRace();
    expect(e.names).toEqual(["", ...RIVALS.map((r) => r.name)]);
    expect(e.carParams.slice(1)).toEqual(RIVALS.map((r) => r.params));
    const radii = new Set(e.carParams.map((p) => p.radius));
    expect(radii.size).toBe(e.carParams.length);
  });

  it("switches between a time trial and a race between races", () => {
    const e = new RaceEngine(desert.track, desert.content, { tier: 1 });
    expect(e.vehicles).toHaveLength(1);
    expect(e.hud().racers).toBe(1);
    e.configure(1, "helper", RIVALS);
    e.reset();
    expect(e.vehicles).toHaveLength(5);
    expect(e.hud().racers).toBe(5);
    e.configure(1, "helper", []);
    e.reset();
    expect(e.vehicles).toHaveLength(1);
    expect(e.race.count).toBe(1);
    expect(e.summary().standings).toHaveLength(1);
  });

  it("holds the rivals on the grid until GO", () => {
    const e = newRace();
    e.start();
    runFor(e, RACE.countdownSeconds - 0.1, () => null);
    for (const v of e.vehicles) expect(v.speed).toBe(0);
    runFor(e, 2, () => null);
    for (let i = 1; i < e.vehicles.length; i++) expect(e.vehicles[i].speed).toBeGreaterThan(5);
  });
});

describe("racing the rivals", () => {
  it("is deterministic: the same inputs give the same race", () => {
    const run = () => {
      const e = newRace();
      goRacing(e);
      runFor(e, 25, (eng) => autopilot(eng));
      return e.vehicles.flatMap((v) => [v.x, v.z, v.heading]);
    };
    expect(run()).toEqual(run());
  });

  it("only the player collects pickups", () => {
    const e = newRace();
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    goRacing(e);
    runFor(e, 30, () => null);
    expect(e.coins).toBe(0);
    expect(events.filter((x) => x.type === "coin")).toHaveLength(0);
  });

  it("ranks the player against the rivals and reports the standings", () => {
    const e = newRace();
    goRacing(e);
    raceToTheEnd(e, (eng) => autopilot(eng));
    const s = e.summary();
    expect(s.racers).toBe(5);
    expect(s.standings.map((x) => x.racer).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(s.standings.every((x) => x.finished && x.time !== null)).toBe(true);
    const times = s.standings.map((x) => x.time!);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(s.standings.findIndex((x) => x.racer === 0) + 1).toBe(s.place);
    expect(s.standings.find((x) => x.racer === 0)!.name).toBe("");
  });

  it("keeps a flat-out driver in a fight on the easiest track", () => {
    const e = newRace({ assist: "helper" });
    goRacing(e);
    raceToTheEnd(e, () => ({ ...neutralControls(), throttle: 1 }));
    const s = e.summary();
    const winner = s.standings[0].time!;
    // Holding the gas, with steering help, finishes in the pack and off the win.
    expect(s.place).toBeGreaterThan(1);
    expect(s.timeSeconds - winner).toBeLessThan(8);
    const last = s.standings[s.standings.length - 1].time!;
    expect(last - winner).toBeLessThan(12);
  });

  it("does not let a flat-out driver drop the field on the opening sprint", () => {
    const e = newRace({ assist: "helper" });
    goRacing(e);
    runFor(e, 22, () => ({ ...neutralControls(), throttle: 1 }));
    expect(e.player.speed).toBeGreaterThan(25);
    expect(e.hud().rank).toBeGreaterThan(1);
  });
});

/** Every track has to be raceable by the rivals: they finish, in the corridor, without being rescued. */
describe.each(TRACKS)("rivals on $name", (def) => {
  it("all finish cleanly", () => {
    const w = loadWorld(def);
    const e = new RaceEngine(w.track, w.content, { tier: def.tier, assist: "off", rivals: RIVALS });
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    goRacing(e);
    let worst = 0;
    raceToTheEnd(e, (eng) => {
      for (let i = 1; i < eng.vehicles.length; i++) {
        const q = eng.vehicles[i].query;
        worst = Math.max(worst, Math.abs(q.lateral) - q.boundary);
      }
      return autopilot(eng);
    });
    expect(e.race.racers.every((r) => r.finished)).toBe(true);
    expect(worst).toBeLessThanOrEqual(0.01);
    expect(events.filter((x) => x.type === "respawn" && x.racer > 0)).toHaveLength(0);
    const places = e.race.racers.map((r) => r.place).sort();
    expect(places).toEqual([1, 2, 3, 4, 5]);
    const rivalTimes = e.race.racers.slice(1).map((r) => r.finishTime!);
    expect(Math.max(...rivalTimes) - Math.min(...rivalTimes)).toBeLessThan(18);
  });
});
