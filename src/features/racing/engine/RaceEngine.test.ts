import { describe, expect, it } from "vitest";
import { BUGGY, RACE } from "../config";
import { neutralControls, type RaceEvent } from "../types";
import { WEATHER } from "../config";
import { buildTrackContent } from "../world/content";
import { loadWorld } from "../world";
import { Track, type TrackDefinition } from "../world/track";
import { BREEZY_BEACH_BLAST } from "../world/tracks/beach";
import { DUSTY_DESERT_DASH } from "../world/tracks/desert";
import { FROSTY_FLURRY_RUN } from "../world/tracks/winter";
import { RaceEngine } from "./RaceEngine";
import { autopilot, runFor } from "./testDriver";

const track = new Track(DUSTY_DESERT_DASH);
const content = buildTrackContent(track);

function newEngine(opts: ConstructorParameters<typeof RaceEngine>[2] = {}): RaceEngine {
  return new RaceEngine(track, content, opts);
}

function record(engine: RaceEngine): RaceEvent[] {
  const events: RaceEvent[] = [];
  engine.events.on((e) => events.push(e));
  return events;
}

/** Counts down and releases the cars. */
function goRacing(engine: RaceEngine): void {
  engine.start();
  runFor(engine, RACE.countdownSeconds + 0.05, () => null);
  expect(engine.phase).toBe("racing");
}

describe("RaceEngine setup", () => {
  it("starts ready, on the grid behind the finish line, at rest", () => {
    const e = newEngine();
    expect(e.phase).toBe("ready");
    expect(e.player.speed).toBe(0);
    // Behind the line means arc length close to the end of the loop.
    expect(e.player.query.s).toBeGreaterThan(track.length - 40);
    expect(e.race.racers[0].next).toBe(1);
    expect(e.race.racers[0].lap).toBe(1);
  });

  it("holds the car still through the countdown and releases it on GO", () => {
    const e = newEngine();
    const events = record(e);
    e.start();
    e.setControls({ ...neutralControls(), throttle: 1 });
    runFor(e, 2.9, () => null);
    expect(e.phase).toBe("countdown");
    expect(e.player.speed).toBe(0);
    runFor(e, 0.2, () => null);
    expect(e.phase).toBe("racing");
    const digits = events.filter((x) => x.type === "countdown").map((x) => (x as { n: number }).n);
    expect(digits).toEqual([3, 2, 1]);
    expect(events.some((x) => x.type === "go")).toBe(true);
    runFor(e, 1, () => null);
    expect(e.player.speed).toBeGreaterThan(10);
  });

  it("reports the countdown digit and GO banner through the HUD", () => {
    const e = newEngine();
    const seen: (number | null)[] = [];
    e.onHud((h) => seen.push(h.countdown));
    e.start();
    runFor(e, 3.5, () => null);
    // Counting down, then the GO banner for a moment...
    expect(seen).toEqual(expect.arrayContaining([null, 3, 2, 1, 0]));
    expect(e.hud().countdown).toBe(0);
    // ...then nothing.
    runFor(e, RACE.goBannerSeconds, () => null);
    expect(e.hud().countdown).toBeNull();
  });
});

describe("RaceEngine driving", () => {
  it("is deterministic: the same inputs give the same race", () => {
    const run = () => {
      const e = newEngine();
      goRacing(e);
      runFor(e, 20, (eng) => autopilot(eng));
      return [e.player.x, e.player.z, e.player.heading, e.time, e.coins];
    };
    expect(run()).toEqual(run());
  });

  it("simulates the same at any frame rate (fixed step)", () => {
    const at = (frame: number) => {
      const e = newEngine();
      goRacing(e);
      e.setControls({ ...neutralControls(), throttle: 1 });
      runFor(e, 4, () => null, frame);
      return e.player.speed;
    };
    expect(at(1 / 60)).toBeCloseTo(at(1 / 30), 6);
    expect(at(1 / 60)).toBeCloseTo(at(1 / 120), 1);
  });

  it("never leaves the corridor, however badly it is driven", () => {
    const e = newEngine({ assist: "off" });
    const events = record(e);
    goRacing(e);
    // Flat out with the wheel held hard right.
    e.setControls({ ...neutralControls(), throttle: 1, steer: 1 });
    let worst = 0;
    runFor(e, 25, () => {
      worst = Math.max(worst, Math.abs(e.player.query.lateral) - e.player.query.boundary);
      return null;
    });
    expect(worst).toBeLessThanOrEqual(0.01);
    expect(events.some((x) => x.type === "wall")).toBe(true);
  });

  it("jumps off the ramp and lands", () => {
    const e = newEngine();
    const events = record(e);
    goRacing(e);
    let maxY = 0;
    runFor(e, 14, (eng) => {
      maxY = Math.max(maxY, eng.player.y);
      return autopilot(eng);
    });
    expect(events.some((x) => x.type === "takeoff")).toBe(true);
    expect(events.some((x) => x.type === "land")).toBe(true);
    expect(maxY).toBeGreaterThan(1.5);
    expect(e.player.grounded).toBe(true);
  });

  it("follows the road for a player who only holds the gas (steering assist)", () => {
    const e = newEngine({ assist: "extra" });
    const events = record(e);
    goRacing(e);
    e.setControls({ ...neutralControls(), throttle: 1 });
    runFor(e, 30, () => null);
    const walls = events.filter((x) => x.type === "wall").length;
    expect(e.race.racers[0].passed).toBeGreaterThanOrEqual(2);
    expect(walls).toBeLessThanOrEqual(3);
  });
});

describe("RaceEngine racing", () => {
  it("completes every lap and finishes, in gate order", () => {
    const e = newEngine();
    const events = record(e);
    goRacing(e);
    let guard = 0;
    while (e.phase === "racing" && guard++ < 60 * 400) {
      e.setControls(autopilot(e));
      e.advance(1 / 60);
    }
    expect(e.phase).toBe("finished");
    const gates = events.filter((x) => x.type === "checkpoint").map((x) => (x as { index: number }).index);
    // Gates 1-5 once per lap, in order, twice.
    expect(gates).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    const laps = events.filter((x) => x.type === "lap");
    expect(laps).toHaveLength(track.def.laps);
    const s = e.summary();
    expect(s.finished).toBe(true);
    expect(s.place).toBe(1);
    expect(s.lapTimes).toHaveLength(track.def.laps);
    expect(s.timeSeconds).toBeCloseTo(s.lapTimes.reduce((a, b) => a + b, 0), 5);
    expect(s.bestLap).toBeCloseTo(Math.min(...s.lapTimes), 6);
    expect(s.timeSeconds).toBeGreaterThan(45);
    expect(s.timeSeconds).toBeLessThan(200);
    expect(s.coins).toBeGreaterThan(0);
  });

  it("lets a child who only holds the gas finish the race, on Helper steering", () => {
    const e = newEngine({ assist: "helper" });
    goRacing(e);
    e.setControls({ ...neutralControls(), throttle: 1 });
    let guard = 0;
    while (e.phase === "racing" && guard++ < 60 * 300) e.advance(1 / 60);
    expect(e.phase).toBe("finished");
    const s = e.summary();
    expect(s.finished).toBe(true);
    expect(s.lapTimes).toHaveLength(track.def.laps);
    expect(s.timeSeconds).toBeLessThan(150);
  });

  it("brings the results up after a beat, and freezes the finish time", () => {
    const e = newEngine();
    goRacing(e);
    let guard = 0;
    while (e.phase === "racing" && guard++ < 60 * 400) {
      e.setControls(autopilot(e));
      e.advance(1 / 60);
    }
    const t = e.playerTime;
    expect(e.hud().resultsReady).toBe(false);
    runFor(e, RACE.resultsDelaySeconds + 0.2, () => null);
    expect(e.hud().resultsReady).toBe(true);
    expect(e.playerTime).toBe(t);
    // The car rolls to a stop on its own.
    runFor(e, 6, () => null);
    expect(Math.abs(e.player.speed)).toBeLessThan(1);
  });

  it("collects coins and brings them back on the next lap", () => {
    const e = newEngine();
    const events = record(e);
    goRacing(e);
    let guard = 0;
    while (e.phase === "racing" && guard++ < 60 * 400) {
      e.setControls(autopilot(e));
      e.advance(1 / 60);
    }
    const coinEvents = events.filter((x) => x.type === "coin");
    expect(coinEvents.length).toBe(e.coins);
    expect(events.filter((x) => x.type === "coinsReset")).toHaveLength(track.def.laps - 1);
    // Picked up on both laps, so the total exceeds what one lap offers.
    const perLap = content.collectibles.filter((c) => c.kind === "coin").length;
    expect(e.coins).toBeLessThanOrEqual(perLap * track.def.laps);
  });

  it("charges the boost meter from coins and burns it when boosting", () => {
    const e = newEngine();
    goRacing(e);
    runFor(e, 14, (eng) => autopilot(eng));
    expect(e.coins).toBeGreaterThan(0);
    e.player.boost = 1;
    const before = e.player.speed;
    e.setControls({ ...neutralControls(), throttle: 1, boost: true });
    runFor(e, 1, () => null);
    expect(e.player.boost).toBeLessThan(1);
    expect(e.player.speed).toBeGreaterThan(before - 1);
  });
});

describe("RaceEngine pickups and ramps", () => {
  /** Puts the player on the road at arc length `s` heading along it at `speed`. */
  function placeAt(e: RaceEngine, s: number, speed = 0, lateral = 0): void {
    const p = track.sample(s);
    const v = e.player;
    v.x = p.x - p.tz * lateral;
    v.z = p.z + p.tx * lateral;
    v.heading = p.heading;
    v.y = 0;
    v.vy = 0;
    v.grounded = true;
    v.vx = p.tx * speed;
    v.vz = p.tz * speed;
    v.speed = speed;
    track.projectGlobal(v.x, v.z, v.query);
    e.race.teleport(0, v.query.s);
  }

  it("picks up a gem hidden on the shoulder, once", () => {
    const e = newEngine();
    const events = record(e);
    goRacing(e);
    const gem = content.collectibles.find((c) => c.kind === "gem")!;
    // Drive up to it from behind along the shoulder.
    const q = { ...e.player.query };
    track.projectGlobal(gem.x, gem.z, q);
    placeAt(e, q.s - 12, 20, gem.lateral);
    e.setControls({ ...neutralControls(), throttle: 0.4 });
    runFor(e, 1.5, () => null);
    expect(e.gems).toBe(1);
    expect(events.filter((x) => x.type === "gem")).toHaveLength(1);
    expect(e.collected[gem.id]).toBe(1);
    // Driving back over the spot does not pay twice.
    placeAt(e, q.s - 12, 20, gem.lateral);
    runFor(e, 1.5, () => null);
    expect(e.gems).toBe(1);
  });

  it("cannot grab a pickup from far above it", () => {
    const e = newEngine();
    goRacing(e);
    const coin = content.collectibles.find((c) => c.kind === "coin")!;
    placeAt(e, coin.s - 3, 0, coin.lateral);
    e.player.x = coin.x;
    e.player.z = coin.z;
    e.player.y = coin.y + 8;
    e.player.grounded = false;
    runFor(e, 1 / 60, () => null);
    expect(e.collected[coin.id]).toBe(0);
  });

  it("bounces off the back of a ramp instead of being lifted onto it", () => {
    const e = newEngine({ assist: "off" });
    goRacing(e);
    const ramp = track.ramps[0];
    // Just past the drop-off, backing toward the tall face.
    placeAt(e, ramp.s1 + 3, 0);
    e.setControls({ ...neutralControls(), brake: 1 });
    let highest = 0;
    runFor(e, 3, (eng) => {
      highest = Math.max(highest, eng.player.y);
      return null;
    });
    expect(highest).toBeLessThan(0.7);
    // Still on the far side of the ramp.
    expect(e.player.query.s).toBeGreaterThan(ramp.s1 - 0.5);
  });

  it("carries the speed through a jump and lands facing the way it went", () => {
    const e = newEngine();
    goRacing(e);
    const ramp = track.ramps[0];
    placeAt(e, ramp.s0 - 30, 30);
    e.setControls({ ...neutralControls(), throttle: 1 });
    let airtime = 0;
    runFor(e, 2.5, (eng) => {
      if (!eng.player.grounded) airtime += 1 / 60;
      return null;
    });
    expect(airtime).toBeGreaterThan(0.25);
    expect(airtime).toBeLessThan(1.2);
    expect(e.player.speed).toBeGreaterThan(20);
    expect(Math.abs(e.player.query.lateral)).toBeLessThan(e.player.query.halfWidth);
  });

  it("Super helper drives itself, and braking still overrides it", () => {
    const e = newEngine({ assist: "extra" });
    goRacing(e);
    // No input at all: the gas is on by itself.
    runFor(e, 3, () => null);
    expect(e.player.speed).toBeGreaterThan(15);
    // Holding the brake wins over the automatic gas and brings it to a stop.
    e.setControls({ ...neutralControls(), brake: 1 });
    runFor(e, 3, () => null);
    expect(e.player.speed).toBeLessThan(8);
    // Pro has no such help: no input, no movement.
    const pro = newEngine({ assist: "off" });
    goRacing(pro);
    runFor(pro, 3, () => null);
    expect(pro.player.speed).toBe(0);
  });

  it("applies a new assist level from the next race", () => {
    const e = newEngine({ assist: "off" });
    expect(e.tuning.autoRecover).toBe(false);
    e.configure(1, "extra");
    expect(e.tuning.autoAccelerate).toBe(true);
    expect(e.assist).toBe("extra");
  });

  it("describes an unfinished race honestly", () => {
    const e = newEngine();
    goRacing(e);
    runFor(e, 5, (eng) => autopilot(eng));
    const s = e.summary();
    expect(s.finished).toBe(false);
    expect(s.trackId).toBe("desert-dash");
    expect(s.laps).toBe(2);
    expect(s.lapTimes).toEqual([]);
    expect(s.timeSeconds).toBeCloseTo(e.time, 6);
  });
});

describe("RaceEngine pause, reset and recovery", () => {
  it("freezes everything while paused", () => {
    const e = newEngine();
    goRacing(e);
    runFor(e, 3, (eng) => autopilot(eng));
    e.pause();
    expect(e.phase).toBe("paused");
    const snap = [e.time, e.player.x, e.player.z, e.player.speed];
    runFor(e, 2, () => null);
    expect([e.time, e.player.x, e.player.z, e.player.speed]).toEqual(snap);
    e.resume();
    expect(e.phase).toBe("racing");
    runFor(e, 0.5, (eng) => autopilot(eng));
    expect(e.time).toBeGreaterThan(snap[0]);
  });

  it("can pause during the countdown and resume it", () => {
    const e = newEngine();
    e.start();
    runFor(e, 1.2, () => null);
    e.pause();
    runFor(e, 5, () => null);
    expect(e.phase).toBe("paused");
    e.resume();
    expect(e.phase).toBe("countdown");
    runFor(e, 2, () => null);
    expect(e.phase).toBe("racing");
  });

  it("resets all temporary race state", () => {
    const e = newEngine();
    goRacing(e);
    runFor(e, 25, (eng) => autopilot(eng));
    expect(e.coins).toBeGreaterThan(0);
    e.reset();
    expect(e.phase).toBe("ready");
    expect(e.coins).toBe(0);
    expect(e.gems).toBe(0);
    expect(e.time).toBe(0);
    expect(e.player.boost).toBe(0);
    expect(e.player.speed).toBe(0);
    expect(Array.from(e.collected).every((c) => c === 0)).toBe(true);
    expect(e.race.racers[0].passed).toBe(0);
    expect(e.race.racers[0].lapTimes).toEqual([]);
    expect(e.hud().resultsReady).toBe(false);
  });

  it("respawns at the last gate passed without awarding progress", () => {
    const e = newEngine();
    const events = record(e);
    goRacing(e);
    runFor(e, 24, (eng) => autopilot(eng));
    const r = e.race.racers[0];
    expect(r.lastCheckpoint).toBeGreaterThanOrEqual(1);
    const passed = r.passed;
    e.respawn();
    expect(events.some((x) => x.type === "respawn")).toBe(true);
    const gate = track.checkpoints[r.lastCheckpoint];
    expect(Math.hypot(e.player.x - gate.x, e.player.z - gate.z)).toBeLessThan(0.5);
    expect(e.player.speed).toBe(0);
    expect(e.player.grace).toBeGreaterThan(0);
    // Driving off again must not re-count the gate it was put on.
    runFor(e, 3, (eng) => autopilot(eng));
    expect(r.passed).toBe(passed);
  });

  it("rescues a car that is stuck when auto-recover is on, and only warns when it is off", () => {
    const stuckParams = { ...BUGGY, accel: 0 };
    const helped = newEngine({ params: stuckParams, assist: "helper" });
    const helpedEvents = record(helped);
    goRacing(helped);
    helped.setControls({ ...neutralControls(), throttle: 1 });
    runFor(helped, RACE.stuckSeconds + 1, () => null);
    expect(helpedEvents.some((x) => x.type === "respawn" && x.auto)).toBe(true);

    const pro = newEngine({ params: stuckParams, assist: "off" });
    const proEvents = record(pro);
    goRacing(pro);
    pro.setControls({ ...neutralControls(), throttle: 1 });
    runFor(pro, RACE.stuckSeconds + 1, () => null);
    expect(proEvents.some((x) => x.type === "respawn")).toBe(false);
    expect(pro.hud().stuck).toBe(true);
  });

  it("warns when driving the wrong way, and not otherwise", () => {
    const e = newEngine({ assist: "off" });
    goRacing(e);
    runFor(e, 3, (eng) => autopilot(eng));
    expect(e.hud().wrongWay).toBe(false);
    // Spin the car around and floor it.
    e.player.heading += Math.PI;
    e.player.vx = -e.player.vx;
    e.player.vz = -e.player.vz;
    e.setControls({ ...neutralControls(), throttle: 1 });
    runFor(e, 3, () => null);
    expect(e.hud().wrongWay).toBe(true);
  });

  it("pushes the HUD only when something displayed changes", () => {
    const e = newEngine();
    let pushes = 0;
    e.onHud(() => pushes++);
    pushes = 0;
    goRacing(e);
    const frames = 60 * 5;
    for (let i = 0; i < frames; i++) {
      e.setControls(autopilot(e));
      e.advance(1 / 60);
    }
    expect(pushes).toBeLessThan(frames / 10);
  });
});

describe("RaceEngine weather", () => {
  it("is clear on the desert", () => {
    const e = newEngine();
    goRacing(e);
    runFor(e, 40, (eng) => autopilot(eng));
    expect(e.weather.kind).toBe("none");
    expect(e.weather.intensity).toBe(0);
    expect(e.weather.gripScale).toBe(1);
  });

  it("storms on Frosty Flurry Run and Breezy Beach Blast, and stays deterministic", () => {
    const winter = load(FROSTY_FLURRY_RUN);
    const beach = load(BREEZY_BEACH_BLAST);
    goRacing(winter);
    goRacing(beach);
    let winterPeak = 0;
    let beachPeak = 0;
    runFor(winter, 90, (eng) => {
      winterPeak = Math.max(winterPeak, eng.weather.intensity);
      return autopilot(eng);
    });
    runFor(beach, 90, (eng) => {
      beachPeak = Math.max(beachPeak, eng.weather.intensity);
      return autopilot(eng);
    });
    expect(winter.weather.kind).toBe("snow");
    expect(beach.weather.kind).toBe("rain");
    expect(winterPeak).toBe(1);
    expect(beachPeak).toBe(1);

    const again = load(FROSTY_FLURRY_RUN);
    goRacing(again);
    runFor(again, 90, (eng) => autopilot(eng));
    expect(again.weather.intensity).toBeCloseTo(winter.weather.intensity, 8);
    expect(again.weather.gripScale).toBeCloseTo(winter.weather.gripScale, 8);
  });

  it("emits a weather banner when a storm becomes heavy", () => {
    const e = load(FROSTY_FLURRY_RUN);
    const events = record(e);
    goRacing(e);
    runFor(e, 60, (eng) => autopilot(eng));
    const storms = events.filter((x) => x.type === "weather");
    expect(storms.length).toBeGreaterThan(0);
    expect(storms[0]).toEqual({ type: "weather", kind: "snow", heavy: true });
  });

  it("cuts grip at the peak of a storm", () => {
    const e = load(FROSTY_FLURRY_RUN);
    goRacing(e);
    let peakGrip = 1;
    let peakYaw = 1;
    runFor(e, 90, (eng) => {
      peakGrip = Math.min(peakGrip, eng.weather.gripScale);
      peakYaw = Math.min(peakYaw, eng.weather.yawScale);
      return autopilot(eng);
    });
    expect(peakGrip).toBeCloseTo(WEATHER.gripAtPeak, 5);
    expect(peakYaw).toBeCloseTo(WEATHER.yawAtPeak, 5);
  });
});

function load(def: TrackDefinition): RaceEngine {
  const world = loadWorld(def);
  return new RaceEngine(world.track, world.content);
}

describe("RaceEngine interpolation", () => {
  it("renders between steps and does not smear a respawn", () => {
    const e = newEngine();
    goRacing(e);
    e.setControls({ ...neutralControls(), throttle: 1 });
    runFor(e, 1, () => null);
    e.advance(0.5 / 60);
    const pose = { x: 0, y: 0, z: 0, heading: 0, steer: 0, wheelSpin: 0 };
    e.pose(0, pose);
    const v = e.player;
    const lo = Math.min(v.prev.x, v.x) - 1e-9;
    const hi = Math.max(v.prev.x, v.x) + 1e-9;
    expect(pose.x).toBeGreaterThanOrEqual(lo);
    expect(pose.x).toBeLessThanOrEqual(hi);
    e.respawn();
    e.pose(0, pose);
    expect(pose.x).toBeCloseTo(v.x, 6);
    expect(pose.z).toBeCloseTo(v.z, 6);
  });
});
