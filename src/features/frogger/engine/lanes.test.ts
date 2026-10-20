import { describe, expect, it } from "vitest";
import { entityLeft, isTurtleSafe, platformUnder, turtleCycle, turtleDepth, turtleState } from "./lanes";
import { testLane } from "./testLanes";

describe("lane motion", () => {
  it("moves entities analytically and wraps around the track", () => {
    const lane = testLane(4, "log", [{ offset: 0, length: 3 }], { dir: 1, speed: 2, trackStart: -5, trackLength: 30 });
    const e = lane.entities[0];
    expect(entityLeft(lane, e, 0)).toBe(-5);
    expect(entityLeft(lane, e, 5)).toBe(5);
    // 15 s * 2 tiles/s = 30 tiles = one full loop.
    expect(entityLeft(lane, e, 15)).toBeCloseTo(-5);
  });

  it("moves left-bound lanes the other way", () => {
    const lane = testLane(9, "road", [{ offset: 10 }], { dir: -1, speed: 1, trackStart: 0, trackLength: 20 });
    expect(entityLeft(lane, lane.entities[0], 4)).toBe(6);
  });
});

describe("river platforms", () => {
  it("finds the log under the frog, with a little grace at the ends", () => {
    const lane = testLane(4, "log", [{ offset: 15, length: 4 }]); // left edge at x=5
    expect(platformUnder(lane, 7, 0)).not.toBeNull();
    expect(platformUnder(lane, 4.95, 0)).not.toBeNull();
    expect(platformUnder(lane, 4.5, 0)).toBeNull();
    expect(platformUnder(lane, 9.5, 0)).toBeNull();
  });

  it("cycles turtles through surfaced, warning, submerged and rising", () => {
    expect(turtleState(0.2)).toBe("surfaced");
    expect(turtleState(0.6)).toBe("warning");
    expect(turtleState(0.8)).toBe("submerged");
    expect(turtleState(0.93)).toBe("rising");
    expect(turtleDepth(0.6)).toBe(0);
    expect(turtleDepth(0.8)).toBe(1);
    expect(isTurtleSafe(0.6)).toBe(true);
    expect(isTurtleSafe(0.8)).toBe(false);
    expect(isTurtleSafe(0.97)).toBe(true);
  });

  it("does not hold the frog on a submerged turtle group", () => {
    const lane = testLane(5, "turtle", [{ offset: 15, length: 3, dives: true, divePhase: 0 }], { diveCycle: 10 });
    expect(turtleCycle(lane, lane.entities[0], 8)).toBeCloseTo(0.8);
    expect(platformUnder(lane, 6, 2)).not.toBeNull();
    expect(platformUnder(lane, 6, 8)).toBeNull();
  });

  it("never sinks turtle groups that don't dive", () => {
    const lane = testLane(5, "turtle", [{ offset: 15, length: 3 }], { diveCycle: 10 });
    expect(platformUnder(lane, 6, 8)).not.toBeNull();
  });
});
