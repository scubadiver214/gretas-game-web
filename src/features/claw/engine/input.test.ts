import { describe, expect, it } from "vitest";
import { actionForKeyDown, actionForKeyUp, isGameKey, stickFromDrag } from "./input";

describe("keyboard mapping", () => {
  it("holds directions on arrows and WASD", () => {
    expect(actionForKeyDown("ArrowLeft", false)).toEqual({ kind: "move", dir: "left", pressed: true });
    expect(actionForKeyDown("d", false)).toEqual({ kind: "move", dir: "right", pressed: true });
    expect(actionForKeyDown("ArrowUp", false)).toEqual({ kind: "move", dir: "back", pressed: true });
    expect(actionForKeyDown("s", false)).toEqual({ kind: "move", dir: "forward", pressed: true });
    expect(actionForKeyUp("ArrowLeft")).toEqual({ kind: "move", dir: "left", pressed: false });
  });

  it("grabs on Space or Enter, pauses on Escape or P, and ignores auto-repeat", () => {
    expect(actionForKeyDown(" ", false)).toEqual({ kind: "grab" });
    expect(actionForKeyDown("Enter", false)).toEqual({ kind: "grab" });
    expect(actionForKeyDown("Escape", false)).toEqual({ kind: "pause" });
    expect(actionForKeyDown(" ", true)).toBeNull();
    expect(actionForKeyDown("ArrowLeft", true)).toBeNull();
    expect(actionForKeyDown("x", false)).toBeNull();
    expect(actionForKeyUp("x")).toBeNull();
  });

  it("knows which keys to swallow so the page does not scroll", () => {
    expect(isGameKey(" ")).toBe(true);
    expect(isGameKey("ArrowDown")).toBe(true);
    expect(isGameKey("q")).toBe(false);
  });
});

describe("stickFromDrag", () => {
  it("maps a left drag to the left glass and a down drag toward the player (the front glass)", () => {
    expect(stickFromDrag(-40, 0, 40)).toEqual({ x: -1, z: 0 });
    expect(stickFromDrag(40, 0, 40)).toEqual({ x: 1, z: 0 });
    expect(stickFromDrag(0, 40, 40)).toEqual({ x: 0, z: 1 });
    expect(stickFromDrag(0, -40, 40)).toEqual({ x: 0, z: -1 });
  });

  it("reaches the front-left glass with a down-left drag", () => {
    const stick = stickFromDrag(-40, 40, 40);
    expect(stick.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(stick.z).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("ignores tiny thumb noise inside the dead zone", () => {
    expect(stickFromDrag(4, 3, 40)).toEqual({ x: 0, z: 0 });
  });
});
