import { describe, expect, it } from "vitest";
import { BUGGY, RACE, WEAPONS } from "../config";
import { neutralControls, type RaceEvent } from "../types";
import { loadWorld } from "../world";
import { DUSTY_DESERT_DASH } from "../world/tracks/desert";
import { RaceEngine, type RivalSetup } from "./RaceEngine";
import { runFor } from "./testDriver";
import { placeVehicle, snapshot } from "./vehicle";

const desert = loadWorld(DUSTY_DESERT_DASH);

const bumper: RivalSetup = {
  name: "Bumper",
  params: { ...BUGGY, radius: 1.6 },
  personality: { pace: 0, cornering: 0, lane: 0, weave: 0, mistakes: 0, aggression: 0 },
};

function racing(rivals: readonly RivalSetup[] = []): RaceEngine {
  const e = new RaceEngine(desert.track, desert.content, { tier: 1, assist: "off", rivals });
  e.start();
  runFor(e, RACE.countdownSeconds + 0.05, () => null);
  expect(e.phase).toBe("racing");
  return e;
}

/** Drops a car on the ground at a track sample and forgets its speed. */
function park(e: RaceEngine, i: number, s: number): void {
  const p = e.track.sample(s);
  const v = e.vehicles[i];
  placeVehicle(v, p.x, p.z, p.heading, e.track.heightAt(s));
  e.track.projectGlobal(v.x, v.z, v.query);
  snapshot(v);
  e.race.teleport(i, v.query.s);
}

/** Puts a car on the road at a world point and refreshes its track query, so the wall solver does not fling it. */
function put(e: RaceEngine, i: number, x: number, z: number): void {
  const v = e.vehicles[i];
  placeVehicle(v, x, z, 0);
  e.track.projectGlobal(v.x, v.z, v.query);
  v.y = e.track.heightAt(v.query.s);
  v.heading = v.query.heading;
  snapshot(v);
  e.race.teleport(i, v.query.s);
}

describe("weapons", () => {
  it("grants a charge and selects the icon you drive over", () => {
    const e = racing();
    const crate = e.content.weapons[0];
    expect(crate).toBeTruthy();
    placeVehicle(e.player, crate.x, crate.z, 0, e.track.heightAt(crate.s));
    e.track.projectGlobal(e.player.x, e.player.z, e.player.query);
    snapshot(e.player);
    e.advance(1 / 60);
    expect(e.ammo[crate.kind]).toBe(1);
    expect(e.weapon).toBe(crate.kind);
    expect(e.hud()[crate.kind]).toBe(1);
  });

  it("cycles with Q and E, picks with 1-3, and an empty fire does nothing", () => {
    const e = racing();
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    e.weaponAction("next");
    expect(e.weapon).toBe("mine");
    e.weaponAction("prev");
    expect(e.weapon).toBe("gun");
    e.weaponAction("oil");
    expect(e.weapon).toBe("oil");
    e.weaponAction("fire");
    expect(events.some((x) => x.type === "weaponEmpty" && x.kind === "oil")).toBe(true);
    expect(e.slicks).toHaveLength(0);
    expect(e.ammo.oil).toBe(0);
  });

  it("a blaster bolt wrecks the car ahead and does not wreck the shooter", () => {
    const e = racing([bumper]);
    park(e, 0, 400);
    park(e, 1, 404);
    e.ammo.gun = 1;
    e.weapon = "gun";
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    e.weaponAction("fire");
    expect(e.ammo.gun).toBe(0);
    expect(e.gunBurstLeft).toBe(WEAPONS.gunBurst);
    expect(e.hud().gunSeconds).toBe(WEAPONS.gunBurst);
    e.advance(1 / 60);
    expect(events.some((x) => x.type === "weaponHit" && x.kind === "gun" && x.target === 1)).toBe(true);
    const boom = events.find((x) => x.type === "explosion" && x.kind === "gun" && x.racer === 1);
    expect(boom && boom.type === "explosion").toBeTruthy();
    expect(events.some((x) => x.type === "crash" && x.racer === 1 && x.boom)).toBe(true);
    expect(e.vehicles[1].wrecked).toBeGreaterThan(0);
    expect(e.player.wrecked).toBe(0);
    const before = e.shots.length;
    runFor(e, WEAPONS.gunInterval + 0.05, () => neutralControls());
    expect(e.shots.length).toBeGreaterThan(before);
    expect(e.gunBurstLeft).toBeLessThan(WEAPONS.gunBurst);
    expect(e.gunBurstLeft).toBeGreaterThan(WEAPONS.gunBurst - 1);
  });

  it("a second gun pickup adds another 10 seconds, and the burst stops when the time is gone", () => {
    const e = racing();
    e.ammo.gun = 2;
    e.weapon = "gun";
    e.weaponAction("fire");
    e.weaponAction("fire");
    expect(e.ammo.gun).toBe(0);
    expect(e.gunBurstLeft).toBe(WEAPONS.gunBurst * 2);
    runFor(e, WEAPONS.gunBurst * 2 + 0.1, () => neutralControls());
    expect(e.gunBurstLeft).toBe(0);
    const flying = e.shots.length;
    runFor(e, WEAPONS.gunInterval + 0.05, () => neutralControls());
    expect(e.shots.length).toBeLessThanOrEqual(flying);
    e.weaponAction("fire");
    expect(e.gunBurstLeft).toBe(0);
  });

  it("a mine stays safe until it is armed, then wrecks whoever drives over it", () => {
    const e = racing([bumper]);
    park(e, 0, 500);
    e.ammo.mine = 1;
    e.weapon = "mine";
    e.weaponAction("fire");
    const mine = e.mines[0];
    expect(mine.arm).toBeCloseTo(WEAPONS.mineArm, 2);
    runFor(e, 0.2, () => neutralControls());
    const v = e.vehicles[1];
    put(e, 1, mine.x, mine.z);
    e.advance(1 / 60);
    expect(v.wrecked).toBe(0);

    put(e, 1, mine.x + 30, mine.z);
    runFor(e, WEAPONS.mineArm, () => neutralControls());
    expect(e.mines).toHaveLength(1);
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    put(e, 1, mine.x, mine.z);
    const hitX = v.x;
    const hitZ = v.z;
    e.advance(1 / 60);
    expect(v.wrecked).toBeGreaterThan(0);
    expect(e.mines).toHaveLength(0);
    const boom = events.find((x) => x.type === "explosion");
    expect(boom && boom.type === "explosion" && boom.kind === "mine" && boom.racer === 1).toBe(true);
    if (boom && boom.type === "explosion") expect(Math.hypot(boom.x - hitX, boom.z - hitZ)).toBeLessThan(2);
  });

  it("oil makes the car that drives through it slide", () => {
    const e = racing();
    park(e, 0, 600);
    e.ammo.oil = 1;
    e.weapon = "oil";
    e.weaponAction("fire");
    const slick = e.slicks[0];
    placeVehicle(e.player, slick.x, slick.z, 0, 0);
    e.player.y = slick.y;
    snapshot(e.player);
    e.advance(1 / 60);
    expect(e.player.oiled).toBeGreaterThan(0);
    expect(e.player.wrecked).toBe(0);
  });

  it("oil on another car counts as a hit and does not wreck them", () => {
    const e = racing([bumper]);
    park(e, 0, 700);
    e.ammo.oil = 1;
    e.weapon = "oil";
    e.weaponAction("fire");
    const slick = e.slicks[0];
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    put(e, 1, slick.x, slick.z);
    e.advance(1 / 60);
    expect(e.vehicles[1].oiled).toBeGreaterThan(0);
    expect(e.vehicles[1].wrecked).toBe(0);
    expect(events.some((x) => x.type === "weaponHit" && x.kind === "oil" && x.target === 1)).toBe(true);
  });
});
