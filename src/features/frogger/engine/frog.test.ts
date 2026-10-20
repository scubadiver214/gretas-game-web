import { describe, expect, it } from "vitest";
import { COLS, HOP_SECONDS, START_ROW, START_X } from "../config";
import { advanceHop, createFrog, frogY, hopTarget, requestMove } from "./frog";
import { actionForKey, swipeDirection } from "./input";

describe("frog movement", () => {
  it("moves exactly one tile per hop in each direction", () => {
    const frog = { x: 7.5, row: 9 };
    expect(hopTarget(frog, "up")).toEqual({ x: 7.5, row: 8 });
    expect(hopTarget(frog, "down")).toEqual({ x: 7.5, row: 10 });
    expect(hopTarget(frog, "left")).toEqual({ x: 6.5, row: 9 });
    expect(hopTarget(frog, "right")).toEqual({ x: 8.5, row: 9 });
  });

  it("cannot leave the board", () => {
    expect(hopTarget({ x: START_X, row: START_ROW }, "down")).toBeNull();
    expect(hopTarget({ x: 0.5, row: 9 }, "left")).toBeNull();
    expect(hopTarget({ x: COLS - 0.5, row: 9 }, "right")).toBeNull();
    expect(hopTarget({ x: 7.5, row: 0 }, "up")).toBeNull();
  });

  it("clamps sideways hops near the edge on the river and snaps to columns off it", () => {
    expect(hopTarget({ x: 0.9, row: 3 }, "left")).toEqual({ x: 0.5, row: 3 });
    // Leaving the river onto the median lands on a column centre.
    expect(hopTarget({ x: 7.83, row: 5 }, "down")).toEqual({ x: 7.5, row: 6 });
    // Hopping between river lanes keeps the carried x.
    expect(hopTarget({ x: 7.83, row: 5 }, "up")).toEqual({ x: 7.83, row: 4 });
  });

  it("lands after HOP_SECONDS and tweens position in between", () => {
    const frog = createFrog();
    expect(requestMove(frog, "up")).toBe("started");
    expect(advanceHop(frog, HOP_SECONDS / 2)).toBe(false);
    expect(frogY(frog)).toBeCloseTo(START_ROW - 0.5);
    expect(advanceHop(frog, HOP_SECONDS / 2 + 1e-9)).toBe(true);
    expect(frog.row).toBe(START_ROW - 1);
    expect(frog.hop).toBeNull();
  });

  it("buffers one move during a hop (latest wins)", () => {
    const frog = createFrog();
    requestMove(frog, "up");
    expect(requestMove(frog, "left")).toBe("queued");
    expect(requestMove(frog, "right")).toBe("queued");
    expect(frog.queued).toBe("right");
  });
});

describe("input mapping", () => {
  it("maps arrows, WASD and pause keys", () => {
    expect(actionForKey("ArrowUp", false)).toBe("up");
    expect(actionForKey("s", false)).toBe("down");
    expect(actionForKey("A", false)).toBe("left");
    expect(actionForKey("ArrowRight", false)).toBe("right");
    expect(actionForKey(" ", false)).toBe("pause");
    expect(actionForKey("Escape", false)).toBe("pause");
    expect(actionForKey("q", false)).toBeNull();
  });

  it("ignores held-key auto-repeat so one press is one hop", () => {
    expect(actionForKey("ArrowUp", true)).toBeNull();
  });

  it("turns swipes into directions and taps into a forward hop", () => {
    expect(swipeDirection(2, -3)).toBe("up");
    expect(swipeDirection(-40, 5)).toBe("left");
    expect(swipeDirection(40, 5)).toBe("right");
    expect(swipeDirection(5, 50)).toBe("down");
    expect(swipeDirection(14, 12)).toBeNull();
  });
});
