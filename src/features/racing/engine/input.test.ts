import { describe, expect, it, vi } from "vitest";
import { neutralControls, type Controls } from "../types";
import { bindKeyboard, controlsFromKeys, mergeControls } from "./input";

describe("controlsFromKeys", () => {
  it("is neutral with nothing held", () => {
    expect(controlsFromKeys(new Set())).toEqual(neutralControls());
  });

  it("maps WASD and the arrow keys the same way", () => {
    expect(controlsFromKeys(new Set(["KeyW"])).throttle).toBe(1);
    expect(controlsFromKeys(new Set(["ArrowUp"])).throttle).toBe(1);
    expect(controlsFromKeys(new Set(["KeyS"])).brake).toBe(1);
    expect(controlsFromKeys(new Set(["ArrowDown"])).brake).toBe(1);
    expect(controlsFromKeys(new Set(["KeyD"])).steer).toBe(1);
    expect(controlsFromKeys(new Set(["ArrowRight"])).steer).toBe(1);
    expect(controlsFromKeys(new Set(["KeyA"])).steer).toBe(-1);
    expect(controlsFromKeys(new Set(["ArrowLeft"])).steer).toBe(-1);
  });

  it("maps Space to the handbrake and either Shift to boost", () => {
    expect(controlsFromKeys(new Set(["Space"])).handbrake).toBe(true);
    expect(controlsFromKeys(new Set(["ShiftLeft"])).boost).toBe(true);
    expect(controlsFromKeys(new Set(["ShiftRight"])).boost).toBe(true);
  });

  it("cancels opposite steering keys and combines unrelated ones", () => {
    expect(controlsFromKeys(new Set(["KeyA", "KeyD"])).steer).toBe(0);
    const c = controlsFromKeys(new Set(["KeyW", "KeyD", "Space", "ShiftLeft"]));
    expect(c).toEqual({ throttle: 1, brake: 0, steer: 1, handbrake: true, boost: true });
  });
});

describe("mergeControls", () => {
  it("takes the stronger pedal, sums and clamps steering, ORs the buttons", () => {
    const a: Controls = { throttle: 0.4, brake: 0, steer: 0.7, handbrake: false, boost: true };
    const b: Controls = { throttle: 1, brake: 0.5, steer: 0.7, handbrake: true, boost: false };
    expect(mergeControls(a, b)).toEqual({ throttle: 1, brake: 0.5, steer: 1, handbrake: true, boost: true });
    expect(mergeControls(neutralControls(), neutralControls())).toEqual(neutralControls());
  });
});

class FakeWindow {
  private handlers = new Map<string, Set<(e: never) => void>>();
  addEventListener(type: string, fn: (e: never) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: (e: never) => void): void {
    this.handlers.get(type)?.delete(fn);
  }
  fire(type: string, init: { code?: string; repeat?: boolean } = {}): { defaultPrevented: boolean } {
    const event = { code: init.code ?? "", repeat: init.repeat ?? false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const h of this.handlers.get(type) ?? []) h(event as never);
    return event;
  }
  count(type: string): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}

describe("bindKeyboard", () => {
  function setup() {
    const win = new FakeWindow();
    const onControls = vi.fn();
    const onPause = vi.fn();
    const onReset = vi.fn();
    const unbind = bindKeyboard(win as unknown as Window, { onControls, onPause, onReset });
    return { win, onControls, onPause, onReset, unbind };
  }

  it("publishes controls as keys go down and up", () => {
    const { win, onControls } = setup();
    win.fire("keydown", { code: "KeyW" });
    expect(onControls).toHaveBeenLastCalledWith(expect.objectContaining({ throttle: 1 }));
    win.fire("keydown", { code: "KeyA" });
    expect(onControls).toHaveBeenLastCalledWith(expect.objectContaining({ throttle: 1, steer: -1 }));
    win.fire("keyup", { code: "KeyW" });
    expect(onControls).toHaveBeenLastCalledWith(expect.objectContaining({ throttle: 0, steer: -1 }));
  });

  it("ignores key repeat and keys it does not know", () => {
    const { win, onControls } = setup();
    win.fire("keydown", { code: "KeyW" });
    onControls.mockClear();
    win.fire("keydown", { code: "KeyW", repeat: true });
    win.fire("keydown", { code: "KeyQ" });
    win.fire("keyup", { code: "KeyQ" });
    expect(onControls).not.toHaveBeenCalled();
  });

  it("sends Esc to pause and R to reset without treating them as held keys", () => {
    const { win, onPause, onReset, onControls } = setup();
    win.fire("keydown", { code: "Escape" });
    win.fire("keydown", { code: "KeyR" });
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onControls).not.toHaveBeenCalled();
  });

  it("stops the page scrolling when the game keys are pressed", () => {
    const { win } = setup();
    expect(win.fire("keydown", { code: "Space" }).defaultPrevented).toBe(true);
    expect(win.fire("keydown", { code: "ArrowDown" }).defaultPrevented).toBe(true);
    expect(win.fire("keydown", { code: "KeyQ" }).defaultPrevented).toBe(false);
  });

  it("lets go of everything when the window loses focus", () => {
    const { win, onControls } = setup();
    win.fire("keydown", { code: "KeyW" });
    win.fire("keydown", { code: "KeyD" });
    win.fire("blur");
    expect(onControls).toHaveBeenLastCalledWith(neutralControls());
    // Nothing to release: no spurious publish.
    onControls.mockClear();
    win.fire("blur");
    expect(onControls).not.toHaveBeenCalled();
  });

  it("unbinds cleanly and leaves the car with neutral controls", () => {
    const { win, onControls, unbind } = setup();
    win.fire("keydown", { code: "KeyW" });
    unbind();
    expect(onControls).toHaveBeenLastCalledWith(neutralControls());
    expect(win.count("keydown") + win.count("keyup") + win.count("blur")).toBe(0);
  });
});
