import { describe, expect, it } from "vitest";
import { BUGGY, CRASH, RACE } from "../config";
import { neutralControls, type RaceEvent } from "../types";
import { loadWorld } from "../world";
import { DUSTY_DESERT_DASH } from "../world/tracks/desert";
import { JUNGLE_ROAR_RALLY } from "../world/tracks/jungle";
import { RaceEngine, type RivalSetup } from "./RaceEngine";
import { headingOf, wrapLoop } from "./math";
import { runFor } from "./testDriver";
import { placeVehicle, snapshot } from "./vehicle";

const desert = loadWorld(DUSTY_DESERT_DASH);

function racing(assist: "off" | "helper" | "extra" = "off"): RaceEngine {
  const e = new RaceEngine(desert.track, desert.content, { tier: 1, assist, rivals: [] });
  e.start();
  runFor(e, RACE.countdownSeconds + 0.05, () => null);
  expect(e.phase).toBe("racing");
  return e;
}

/** Puts car `i` on the ground, moving along `heading` at `speed`, without counting it as a gate pass. */
function plant(e: RaceEngine, i: number, x: number, z: number, heading: number, speed: number): void {
  const v = e.vehicles[i];
  placeVehicle(v, x, z, heading);
  v.vx = Math.sin(heading) * speed;
  v.vz = Math.cos(heading) * speed;
  v.speed = speed;
  e.track.projectGlobal(v.x, v.z, v.query);
  v.y = e.track.heightAt(v.query.s);
  snapshot(v);
  e.race.teleport(i, v.query.s);
}

function along(e: RaceEngine, a: number, b: number): number {
  return Math.abs(wrapLoop(a - b, e.track.length));
}

describe("crashes", () => {
  it("wrecks a fast car on a roadside obstacle and restarts it there", () => {
    const e = racing();
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    const o = e.content.obstacles.find((ob) => ob.kind === "hay" || ob.kind === "boulder" || ob.kind === "tires");
    expect(o).toBeTruthy();
    e.track.projectGlobal(o!.x, o!.z, e.player.query);
    const p = e.track.sample(e.player.query.s);
    const dx = o!.x - p.x;
    const dz = o!.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d;
    const nz = dz / d;
    const gap = o!.r + e.params.radius + 0.2;
    const heading = headingOf(nx, nz);
    plant(e, 0, o!.x - nx * gap, o!.z - nz * gap, heading, 28);
    const hitS = e.player.query.s;
    e.advance(1 / 60);

    expect(events.some((x) => x.type === "crash" && x.racer === 0 && x.boom === false)).toBe(true);
    expect(events.some((x) => x.type === "explosion")).toBe(false);
    expect(events.some((x) => x.type === "respawn")).toBe(false);
    expect(e.player.speed).toBe(0);
    expect(e.player.wrecked).toBeGreaterThan(0);
    expect(e.hud().crashed).toBe(true);
    expect(along(e, e.player.query.s, hitS)).toBeLessThan(CRASH.settleBack + 8);
    expect(Math.abs(e.player.query.lateral)).toBeLessThan(e.player.query.halfWidth);

    runFor(e, CRASH.recoverSeconds + 0.35, () => ({ ...neutralControls(), throttle: 1 }));
    expect(e.player.wrecked).toBe(0);
    expect(e.hud().crashed).toBe(false);
    expect(e.player.speed).toBeGreaterThan(3);
    expect(along(e, e.player.query.s, hitS)).toBeLessThan(CRASH.settleBack + 20);
  });

  it("lets a slow nudge past an obstacle stay a nudge", () => {
    const e = racing();
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    const o = e.content.obstacles[0];
    e.track.projectGlobal(o.x, o.z, e.player.query);
    const p = e.track.sample(e.player.query.s);
    const dx = o.x - p.x;
    const dz = o.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const gap = o.r + e.params.radius + 0.15;
    plant(e, 0, o.x - (dx / d) * gap, o.z - (dz / d) * gap, headingOf(dx, dz), 4);
    e.advance(1 / 60);
    expect(events.some((x) => x.type === "crash")).toBe(false);
    expect(e.player.wrecked).toBe(0);
  });

  it("does not wreck a car for hitting the boundary wall", () => {
    const e = racing();
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    const p = e.track.sample(80);
    const lat = p.halfWidth + e.track.def.shoulder - e.params.radius - 0.3;
    const heading = headingOf(-p.tz, p.tx);
    plant(e, 0, p.x - p.tz * lat, p.z + p.tx * lat, heading, 26);
    runFor(e, 0.4, () => ({ ...neutralControls(), throttle: 1 }));
    expect(events.some((x) => x.type === "crash")).toBe(false);
    expect(events.some((x) => x.type === "explosion")).toBe(false);
    expect(events.some((x) => x.type === "wall")).toBe(true);
    expect(e.player.wrecked).toBe(0);
  });

  it("wrecks both cars on a head-on hit and neither on a small closing speed", () => {
    const bumper: RivalSetup = {
      name: "Bumper",
      params: { ...BUGGY, radius: 1.6 },
      personality: { pace: 1, cornering: 0, lane: 0, weave: 0, mistakes: 0, aggression: 0 },
    };
    const e = new RaceEngine(desert.track, desert.content, { tier: 1, assist: "off", rivals: [bumper] });
    e.start();
    runFor(e, RACE.countdownSeconds + 0.05, () => null);
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));

    const soft = e.track.sample(220);
    plant(e, 0, soft.x, soft.z, soft.heading, 20);
    plant(e, 1, soft.x + soft.tx * 3, soft.z + soft.tz * 3, soft.heading, 18);
    e.advance(1 / 60);
    expect(events.filter((x) => x.type === "crash")).toHaveLength(0);
    expect(events.some((x) => x.type === "explosion")).toBe(false);

    events.length = 0;
    const p = e.track.sample(480);
    plant(e, 0, p.x, p.z, p.heading, 18);
    const back = p.heading + Math.PI;
    plant(e, 1, p.x + p.tx * 2.6, p.z + p.tz * 2.6, back, 18);
    const s0 = e.vehicles[0].query.s;
    const s1 = e.vehicles[1].query.s;
    e.advance(1 / 60);
    const crashed = events.filter((x) => x.type === "crash").map((x) => (x.type === "crash" ? x.racer : -1));
    expect(crashed.sort()).toEqual([0, 1]);
    expect(events.filter((x) => x.type === "explosion" && x.kind === "collision")).toHaveLength(2);
    expect(events.filter((x) => x.type === "crash" && x.boom)).toHaveLength(2);
    expect(e.vehicles[0].speed).toBe(0);
    expect(e.vehicles[1].speed).toBe(0);
    expect(along(e, e.vehicles[0].query.s, s0)).toBeLessThan(CRASH.settleBack + 8);
    expect(along(e, e.vehicles[1].query.s, s1)).toBeLessThan(CRASH.settleBack + 8);
    expect(events.some((x) => x.type === "respawn")).toBe(false);
  });

  it("wrecks a car that hits an animal hard", () => {
    const jungle = loadWorld(JUNGLE_ROAR_RALLY);
    const e = new RaceEngine(jungle.track, jungle.content, { tier: 3, assist: "off" });
    e.start();
    runFor(e, RACE.countdownSeconds + 0.05, () => null);
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    const a = e.animals[0];
    const road = e.track.sample(a.spec.s);
    a.phase = "cross";
    a.x = a.body.x = road.x;
    a.z = a.body.z = road.z;
    const gap = a.spec.r + e.params.radius + 0.2;
    plant(e, 0, road.x - road.tx * gap, road.z - road.tz * gap, road.heading, 24);
    const hitS = e.player.query.s;
    e.advance(1 / 60);
    expect(events.some((x) => x.type === "crash" && x.racer === 0 && x.boom === false)).toBe(true);
    expect(events.some((x) => x.type === "explosion")).toBe(false);
    expect(e.player.speed).toBe(0);
    expect(along(e, e.player.query.s, hitS)).toBeLessThan(CRASH.settleBack + 8);
  });

  it("treats a crash while the car is still sliding as an oil blast", () => {
    const e = racing();
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    const o = e.content.obstacles.find((ob) => ob.kind === "hay" || ob.kind === "boulder" || ob.kind === "tires");
    expect(o).toBeTruthy();
    e.track.projectGlobal(o!.x, o!.z, e.player.query);
    const p = e.track.sample(e.player.query.s);
    const dx = o!.x - p.x;
    const dz = o!.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const gap = o!.r + e.params.radius + 0.2;
    plant(e, 0, o!.x - (dx / d) * gap, o!.z - (dz / d) * gap, headingOf(dx, dz), 28);
    e.player.oiled = 1.2;
    e.advance(1 / 60);
    const boom = events.find((x) => x.type === "explosion");
    expect(boom && boom.type === "explosion" && boom.kind === "oil" && boom.racer === 0).toBe(true);
    expect(events.some((x) => x.type === "crash" && x.racer === 0 && x.boom)).toBe(true);
  });
});
