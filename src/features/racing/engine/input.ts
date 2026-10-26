import { neutralControls, type Controls, type WeaponAction } from "../types";
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

/** Q/E cycle, 1/2/3 pick a weapon, F uses it. */
const WEAPON_KEYS: Record<string, WeaponAction> = {
  KeyQ: "prev",
  KeyE: "next",
  Digit1: "gun",
  Digit2: "mine",
  Digit3: "oil",
  KeyF: "fire",
};

export interface KeyboardHandlers {
  onControls: (c: Controls) => void;
  onPause: () => void;
  onReset: () => void;
  onWeapon: (action: WeaponAction) => void;
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
    const weapon = WEAPON_KEYS[e.code];
    if (weapon) {
      e.preventDefault();
      if (!e.repeat) h.onWeapon(weapon);
      return;
    }
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
