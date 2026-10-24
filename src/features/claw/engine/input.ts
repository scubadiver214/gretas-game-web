import type { MoveDir } from "./types";

export type InputAction = { kind: "move"; dir: MoveDir; pressed: boolean } | { kind: "grab" } | { kind: "pause" };

const MOVE_KEYS: Record<string, MoveDir> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "back",
  w: "back",
  W: "back",
  ArrowDown: "forward",
  s: "forward",
  S: "forward",
};

const GRAB_KEYS = new Set([" ", "Enter"]);
const PAUSE_KEYS = new Set(["Escape", "p", "P"]);

/** Key down: directions are held, Space/Enter grab (no auto-repeat), Esc/P pause. */
export function actionForKeyDown(key: string, repeat: boolean): InputAction | null {
  const dir = MOVE_KEYS[key];
  if (dir) return repeat ? null : { kind: "move", dir, pressed: true };
  if (repeat) return null;
  if (GRAB_KEYS.has(key)) return { kind: "grab" };
  if (PAUSE_KEYS.has(key)) return { kind: "pause" };
  return null;
}

export function actionForKeyUp(key: string): InputAction | null {
  const dir = MOVE_KEYS[key];
  return dir ? { kind: "move", dir, pressed: false } : null;
}

export function isGameKey(key: string): boolean {
  return key in MOVE_KEYS || GRAB_KEYS.has(key) || PAUSE_KEYS.has(key);
}

/**
 * Thumb offset in pixels → claw stick axes. Screen right is +x (right glass),
 * screen down is +z (toward the player / the front glass).
 */
export function stickFromDrag(dx: number, dy: number, radius: number): { x: number; z: number } {
  if (radius <= 0) return { x: 0, z: 0 };
  let x = dx / radius;
  let z = dy / radius;
  const mag = Math.hypot(x, z);
  if (mag < 0.2) return { x: 0, z: 0 };
  if (mag > 1) {
    x /= mag;
    z /= mag;
  }
  return { x, z };
}

/**
 * Binds keyboard to the engine. Directions are held (keydown/keyup) so the
 * claw glides while the arrow is down; losing window focus releases every key.
 */
export function bindKeyboard(target: Window, onAction: (action: InputAction) => void): () => void {
  const held = new Set<MoveDir>();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isGameKey(e.key)) e.preventDefault();
    const action = actionForKeyDown(e.key, e.repeat);
    if (!action) return;
    if (action.kind === "move") held.add(action.dir);
    onAction(action);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const action = actionForKeyUp(e.key);
    if (!action) return;
    if (action.kind === "move") held.delete(action.dir);
    onAction(action);
  };
  const releaseAll = () => {
    for (const dir of held) onAction({ kind: "move", dir, pressed: false });
    held.clear();
  };
  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", releaseAll);
  return () => {
    releaseAll();
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
    target.removeEventListener("blur", releaseAll);
  };
}
