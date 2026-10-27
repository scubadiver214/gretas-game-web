import { describe, expect, it } from "vitest";
import { EYE, SHOTGUN, STEP } from "../config";
import { EXPLORE_LEVEL, LEVELS } from "../levels";
import type { HuntEvent } from "../types";
import { aimFromDir } from "./aim";
import { DIFFICULTIES, difficultyById } from "./difficulty";
import { isAirborne } from "./flight";
import { HuntEngine } from "./HuntEngine";
import { animalCenter } from "./wildlife";
import { sub } from "./vec";

const junior = difficultyById("junior");
const expert = difficultyById("expert");

function engineFor(levelIndex: number, difficulty = junior, seed = "test") {
  return new HuntEngine({ level: LEVELS[levelIndex], difficulty, seed, assist: false });
}

function run(e: HuntEngine, seconds: number, each?: () => void) {
  for (let t = 0; t < seconds; t += STEP) {
    e.advance(STEP);
    each?.();
  }
}

function playToGo(e: HuntEngine) {
  e.start();
  run(e, 2.6);
  expect(e.phase).toBe("playing");
}

function aimAtFirstDuck(e: HuntEngine): boolean {
  const d = e.ducks.find((x) => x.target && isAirborne(x) && x.phase !== "takeoff");
  if (!d) return false;
  e.aim = aimFromDir(sub(d.pos, EYE));
  return true;
}

function collect(e: HuntEngine): HuntEvent[] {
  const out: HuntEvent[] = [];
  e.events.on((ev) => out.push(ev));
  return out;
}

/** A tidy bot: when a duck is up and the gun is ready, aim straight at it and fire. */
function bot(e: HuntEngine) {
  return () => {
    if (e.phase !== "playing" || e.weapon !== "ready") return;
    if (aimAtFirstDuck(e)) e.fire();
  };
}

describe("HuntEngine", () => {
  it("counts down, then plays", () => {
    const e = engineFor(0);
    const events = collect(e);
    e.start();
    expect(e.phase).toBe("countdown");
    run(e, 2.6);
    expect(e.phase).toBe("playing");
    expect(events.filter((x) => x.type === "countdown").map((x) => (x as { n: number }).n)).toEqual([3, 2, 1]);
    expect(events.some((x) => x.type === "go")).toBe(true);
  });

  it("hits a duck the player aims at and scores it", () => {
    const e = engineFor(0);
    const events = collect(e);
    playToGo(e);
    run(e, 3);
    expect(aimAtFirstDuck(e)).toBe(true);
    e.fire();
    expect(e.hits).toBe(1);
    expect(e.score).toBeGreaterThan(0);
    expect(events.some((x) => x.type === "hit")).toBe(true);
    expect(e.mag).toBe(SHOTGUN.magazine - 1);
    expect(e.weapon).toBe("pumping");
  });

  it("pumps between shots, reloads one shell at a time, and lets a shot interrupt the reload", () => {
    const e = engineFor(1);
    playToGo(e);
    e.aim = { yaw: 0, pitch: -0.2 };
    e.fire();
    e.fire();
    expect(e.shots).toBe(1);
    run(e, SHOTGUN.pumpTime + 0.05);
    e.fire();
    expect(e.shots).toBe(2);
    run(e, SHOTGUN.pumpTime + 0.05);
    e.reload();
    expect(e.weapon).toBe("reloading");
    run(e, SHOTGUN.reloadStart + SHOTGUN.reloadPerShell + 0.02);
    expect(e.mag).toBe(SHOTGUN.magazine - 1);
    e.fire();
    expect(e.shots).toBe(3);
  });

  it("auto-reloads an empty gun when shells are unlimited", () => {
    const e = engineFor(0);
    playToGo(e);
    e.aim = { yaw: 0, pitch: -0.2 };
    for (let i = 0; i < SHOTGUN.magazine; i++) {
      e.fire();
      run(e, SHOTGUN.pumpTime + 0.02);
    }
    expect(e.mag).toBe(0);
    expect(e.weapon).toBe("reloading");
    run(e, 3);
    expect(e.mag).toBe(SHOTGUN.magazine);
  });

  it("ends a limited-ammo level when the shells run out", () => {
    const e = engineFor(3, expert);
    const events = collect(e);
    playToGo(e);
    e.aim = { yaw: 0, pitch: -0.2 };
    for (let i = 0; i < 80 && e.phase === "playing"; i++) {
      e.fire();
      run(e, 0.6);
    }
    expect(events.some((x) => x.type === "outOfAmmo")).toBe(true);
    expect(e.phase).toBe("done");
    expect(e.summary()?.outOfAmmo).toBe(true);
  });

  it.each(LEVELS.map((l, i) => [l.name, i] as const))("a steady player can clear %s on every difficulty", (_name, i) => {
    for (const d of DIFFICULTIES) {
      const e = engineFor(i, d, `bot-${i}-${d.id}`);
      playToGo(e);
      run(e, 400, bot(e));
      const s = e.summary();
      expect(s, `${d.id} finished`).not.toBeNull();
      expect(s!.success, `${d.id} objective`).toBe(true);
      expect(s!.stars).toBeGreaterThanOrEqual(1);
      // Every duck that took off was either hit or flew away before the level ended.
      expect(s!.hits + s!.escaped, `${d.id} duck accounting`).toBe(s!.ducks);
    }
  });

  it("fails kindly when the player never shoots", () => {
    const e = engineFor(0);
    playToGo(e);
    run(e, 400);
    const s = e.summary()!;
    expect(s.success).toBe(false);
    expect(s.stars).toBe(0);
    expect(s.escaped).toBeGreaterThan(0);
  });

  it("does not let the player shoot during the countdown or while paused", () => {
    const e = engineFor(0);
    e.start();
    e.fire();
    expect(e.shots).toBe(0);
    run(e, 2.6);
    e.pause();
    e.fire();
    const t = e.elapsed;
    run(e, 1);
    expect(e.shots).toBe(0);
    expect(e.elapsed).toBe(t);
    e.resume();
    expect(e.phase).toBe("playing");
  });

  it("warns about protected wildlife instead of scoring", () => {
    const e = engineFor(0, expert);
    const events = collect(e);
    playToGo(e);
    const heron = e.wildlife.find((a) => a.species === "heron")!;
    e.score = 500;
    e.aim = aimFromDir(sub(animalCenter(heron), EYE));
    e.fire();
    const warn = events.find((x) => x.type === "protected");
    expect(warn).toBeDefined();
    expect(e.score).toBe(500 - expert.protectedPenalty);
    expect(e.protectedHits).toBe(1);
  });

  it("swaps to the camera, photographs an animal and swaps back", () => {
    const e = engineFor(0);
    const events = collect(e);
    playToGo(e);
    e.swapTool();
    run(e, SHOTGUN.swapTime + 0.05);
    expect(e.tool).toBe("camera");
    const heron = e.wildlife.find((a) => a.species === "heron")!;
    e.aim = aimFromDir(sub(animalCenter(heron), EYE));
    e.setZoom(2);
    e.fire();
    const photo = events.find((x) => x.type === "photo");
    expect(photo && photo.type === "photo" && photo.result.species).toBe("heron");
    expect(e.shots).toBe(0);
    e.swapTool();
    run(e, SHOTGUN.swapTime + 0.05);
    expect(e.tool).toBe("shotgun");
  });

  it("runs Explorer mode with the camera only and no clock", () => {
    const e = new HuntEngine({ level: EXPLORE_LEVEL, difficulty: junior, seed: "explore" });
    e.start();
    expect(e.phase).toBe("playing");
    expect(e.tool).toBe("camera");
    expect(e.wildlife.some((a) => a.species === "woodDuck")).toBe(true);
    e.swapTool();
    run(e, 1);
    expect(e.tool).toBe("camera");
    run(e, 120);
    expect(e.phase).toBe("playing");
    e.finishExplore();
    expect(e.summary()?.activity).toBe("explore");
  });

  it("keeps the menu backdrop alive with non-target flocks", () => {
    const e = engineFor(0);
    run(e, 30);
    expect(e.phase).toBe("ready");
    expect(e.ducks.length).toBeGreaterThan(0);
    expect(e.ducks.every((d) => !d.target)).toBe(true);
  });
});
