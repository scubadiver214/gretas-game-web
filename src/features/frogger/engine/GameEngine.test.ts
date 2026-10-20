import { describe, expect, it } from "vitest";
import { DEATH_SECONDS, HOP_SECONDS, LEVEL_CLEAR_SECONDS, LIVES, SCORING, START_ROW } from "../config";
import type { FroggerEvent } from "../types";
import { GameEngine } from "./GameEngine";
import { testLane } from "./testLanes";

/** A started engine with no traffic or platforms unless the test adds some. */
function emptyGame(): GameEngine {
  const e = new GameEngine({ seed: "test" });
  e.lanes = [];
  e.start();
  return e;
}

function run(e: GameEngine, seconds: number, fps = 60): void {
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i++) e.advance(1 / fps);
}

function record(e: GameEngine): FroggerEvent[] {
  const events: FroggerEvent[] = [];
  e.events.on((ev) => events.push(ev));
  return events;
}

describe("GameEngine state machine", () => {
  it("starts in ready, plays, pauses and resumes", () => {
    const e = new GameEngine({ seed: "s" });
    expect(e.phase).toBe("ready");
    e.input("up");
    expect(e.frog.hop).toBeNull(); // no moving before the game starts
    e.lanes = [];
    e.start();
    expect(e.phase).toBe("playing");

    e.pause();
    expect(e.phase).toBe("paused");
    const timeLeft = e.timeLeft;
    run(e, 5);
    expect(e.timeLeft).toBe(timeLeft);
    e.input("up");
    expect(e.frog.hop).toBeNull();

    e.togglePause();
    expect(e.phase).toBe("playing");
    run(e, 1);
    expect(e.timeLeft).toBeLessThan(timeLeft);
  });

  it("pays 10 points only for new highest rows on a trip", () => {
    const e = emptyGame();
    e.input("up");
    run(e, 0.3);
    expect(e.score).toBe(SCORING.forwardStep);
    e.input("down");
    run(e, 0.3);
    e.input("up");
    run(e, 0.3);
    expect(e.score).toBe(SCORING.forwardStep);
    e.input("up");
    run(e, 0.3);
    expect(e.score).toBe(2 * SCORING.forwardStep);
  });

  it("runs a buffered move right after landing", () => {
    const e = emptyGame();
    e.input("up");
    e.input("left");
    run(e, 0.4);
    expect(e.frog.row).toBe(START_ROW - 1);
    expect(e.frog.x).toBe(6.5);
  });

  it("loses a life to a vehicle and respawns after a short delay", () => {
    const e = emptyGame();
    const events = record(e);
    // Car on the start row rolling right toward the frog at x=7.5.
    e.lanes = [testLane(START_ROW, "road", [{ offset: 0 }], { speed: 2, trackStart: -4 })];
    run(e, 6);
    const death = events.find((ev) => ev.type === "death");
    expect(death).toMatchObject({ type: "death", cause: "vehicle" });
    expect(e.lives).toBe(LIVES.start - 1);
    run(e, DEATH_SECONDS + 0.1);
    expect(events.some((ev) => ev.type === "respawn")).toBe(true);
  });

  it("detects the same vehicle hit at 30 fps and 144 fps", () => {
    const deathTime = (fps: number) => {
      const e = emptyGame();
      e.lanes = [testLane(START_ROW, "road", [{ offset: 0 }], { speed: 2, trackStart: -4 })];
      let at = -1;
      e.events.on((ev) => {
        if (ev.type === "death" && at < 0) at = e.laneTime;
      });
      run(e, 5, fps);
      expect(e.phase).toBe("playing");
      run(e, 0.5, fps);
      return at;
    };
    const slow = deathTime(30);
    const fast = deathTime(144);
    expect(slow).toBeGreaterThan(5);
    expect(Math.abs(slow - fast)).toBeLessThan(1 / 60);
  });

  it("drowns a frog resting on open water", () => {
    const e = emptyGame();
    e.frog.row = 5;
    run(e, 0.05);
    expect(e.phase).toBe("dying");
    expect(e.deathCause).toBe("water");
  });

  it("carries the frog on a log and kills it when carried off the board", () => {
    const e = emptyGame();
    // Log covering x 6..10 at t=0, drifting right at 2 tiles/s.
    e.lanes = [testLane(5, "log", [{ offset: 16, length: 4 }], { speed: 2 })];
    e.frog.row = 5;
    run(e, 1);
    expect(e.phase).toBe("playing");
    expect(e.frog.x).toBeCloseTo(9.5, 1);
    run(e, 3);
    expect(e.phase).toBe("dying");
    expect(e.deathCause).toBe("offscreen");
  });

  it("drops the frog when its turtle group dives", () => {
    const e = emptyGame();
    e.lanes = [testLane(5, "turtle", [{ offset: 15, length: 3, dives: true, divePhase: 0 }], { diveCycle: 10 })];
    e.frog.row = 5;
    run(e, 6.9);
    expect(e.phase).toBe("playing");
    run(e, 0.3);
    expect(e.phase).toBe("dying");
    expect(e.deathCause).toBe("water");
  });

  it("fills an empty home bay, scores it with the time bonus and respawns", () => {
    const e = emptyGame();
    e.frog.row = 1;
    e.frog.x = 4.5; // bay 1
    e.input("up");
    run(e, 0.2);
    expect(e.homes).toEqual([false, true, false, false, false]);
    const timeBonus = (Math.floor(e.timerSeconds - HOP_SECONDS) * SCORING.timeBonusPerSecond);
    expect(e.score).toBe(SCORING.forwardStep + SCORING.home + timeBonus);
    expect(e.frog.row).toBe(START_ROW);
    expect(e.timeLeft).toBeGreaterThan(e.timerSeconds - 0.2);
  });

  it("kills the frog on a filled bay or the hedge", () => {
    const occupied = emptyGame();
    occupied.homes[1] = true;
    occupied.frog.row = 1;
    occupied.frog.x = 4.5;
    occupied.input("up");
    run(occupied, 0.2);
    expect(occupied.deathCause).toBe("occupied");

    const hedge = emptyGame();
    hedge.frog.row = 1;
    hedge.frog.x = 2.5;
    hedge.input("up");
    run(hedge, 0.2);
    expect(hedge.deathCause).toBe("hedge");
  });

  it("completes a level when the fifth bay fills, then builds a harder level", () => {
    const e = emptyGame();
    const events = record(e);
    e.homes = [true, true, true, true, false];
    e.frog.row = 1;
    e.frog.x = 13.5;
    e.input("up");
    run(e, 0.2);
    expect(e.phase).toBe("levelClear");
    expect(e.levelsCompleted).toBe(1);
    expect(e.score).toBeGreaterThanOrEqual(SCORING.levelComplete);
    const firstTimer = e.timerSeconds;
    run(e, LEVEL_CLEAR_SECONDS + 0.1);
    expect(e.level).toBe(2);
    expect(e.phase).toBe("playing");
    expect(e.homes.every((h) => !h)).toBe(true);
    expect(e.lanes.length).toBeGreaterThan(0);
    expect(e.timerSeconds).toBeLessThan(firstTimer);
    expect(events.some((ev) => ev.type === "levelBuilt" && ev.level === 2)).toBe(true);
  });

  it("gives an extra life when the score passes 10,000", () => {
    const e = emptyGame();
    e.score = 9_990;
    e.frog.row = 1;
    e.frog.x = 1.5;
    e.input("up");
    run(e, 0.2);
    expect(e.lives).toBe(LIVES.start + 1);
  });

  it("times out, and ends the game when the last life is lost", () => {
    const e = emptyGame();
    const events = record(e);
    for (let i = 0; i < LIVES.start; i++) {
      e.timeLeft = 0.01;
      run(e, 0.05);
      expect(e.deathCause).toBe("timeout");
      run(e, DEATH_SECONDS + 0.1);
    }
    expect(e.phase).toBe("gameOver");
    expect(events.filter((ev) => ev.type === "gameOver")).toHaveLength(1);
    expect(e.summary()).toMatchObject({ livesLost: LIVES.start, highestLevel: 1, levelsCompleted: 0 });
  });

  it("reset() returns to a fresh ready game", () => {
    const e = emptyGame();
    e.input("up");
    run(e, 0.3);
    e.reset({ seed: "again" });
    expect(e.phase).toBe("ready");
    expect(e.score).toBe(0);
    expect(e.lives).toBe(LIVES.start);
    expect(e.frog.row).toBe(START_ROW);
  });

  it("pushes HUD snapshots only when a value changes", () => {
    const e = emptyGame();
    const snapshots: number[] = [];
    e.onHud((h) => snapshots.push(h.timeLeft));
    run(e, 0.5);
    run(e, 0.6);
    // Initial push + whole-second ticks only, not one per frame.
    expect(snapshots.length).toBeLessThanOrEqual(3);
  });
});
