import { neutralControls, type Controls } from "../types";
import { clamp } from "./math";

/** Pure mapping from the set of held keys (KeyboardEvent.code) to controls. */
export function controlsFromKeys(pressed: ReadonlySet<string>): Controls {
  const has = (...codes: string[]) => codes.some((c) => pressed.has(c));
  return {
    throttle: has("KeyW", "ArrowUp") ? 1 : 0,
    brake: has("KeyS", "ArrowDown") ? 1 : 0,
    steer: (has("KeyD", "ArrowRight") ? 1 : 0) - (has("KeyA", "ArrowLeft") ? 1 : 0),
    handbrake: has("Space"),
    boost: has("ShiftLeft", "ShiftRight"),
  };
}

/** Combines two input sources (keyboard + touch): the stronger pedal, summed steering, either button. */
export function mergeControls(a: Controls, b: Controls): Controls {
  return {
    throttle: Math.max(a.throttle, b.throttle),
    brake: Math.max(a.brake, b.brake),
    steer: clamp(a.steer + b.steer, -1, 1),
    handbrake: a.handbrake || b.handbrake,
    boost: a.boost || b.boost,
  };
}

const GAME_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight", "Escape", "KeyR"]);

export interface KeyboardHandlers {
  onControls: (c: Controls) => void;
  onPause: () => void;
  onReset: () => void;
}

/**
 * Listens for the driving keys on `target`. Esc pauses, R resets to the last
 * gate. Losing focus releases every key so a car never drives itself away.
 * Returns the unbind function.
 */
export function bindKeyboard(target: Window, h: KeyboardHandlers): () => void {
  const pressed = new Set<string>();
  const publish = () => h.onControls(controlsFromKeys(pressed));
  const down = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Escape") return h.onPause();
    if (e.code === "KeyR") return h.onReset();
    pressed.add(e.code);
    publish();
  };
  const up = (e: KeyboardEvent) => {
    if (!pressed.delete(e.code)) return;
    publish();
  };
  const release = () => {
    if (pressed.size === 0) return;
    pressed.clear();
    publish();
  };
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  target.addEventListener("blur", release);
  return () => {
    target.removeEventListener("keydown", down);
    target.removeEventListener("keyup", up);
    target.removeEventListener("blur", release);
    h.onControls(neutralControls());
  };
}
