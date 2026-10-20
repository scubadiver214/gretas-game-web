import type { Dir } from "../types";

export type InputAction = Dir | "pause";

const KEYS: Record<string, InputAction> = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  " ": "pause",
  Escape: "pause",
};

/** Held keys auto-repeat; a frog should hop once per press, so repeats map to nothing. */
export function actionForKey(key: string, repeat: boolean): InputAction | null {
  if (repeat) return null;
  return KEYS[key] ?? null;
}

export function bindKeyboard(target: Window, onAction: (action: InputAction) => void): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // Swallow repeats of our keys too, so held arrows don't scroll the page.
    if (KEYS[e.key]) e.preventDefault();
    const action = actionForKey(e.key, e.repeat);
    if (action) onAction(action);
  };
  target.addEventListener("keydown", onKeyDown);
  return () => target.removeEventListener("keydown", onKeyDown);
}

const SWIPE_PX = 24;
const TAP_PX = 10;

/** Direction of a swipe, or "up" for a tap (the natural "hop forward" gesture). */
export function swipeDirection(dx: number, dy: number): Dir | null {
  if (Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX) return "up";
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

export function bindSwipe(el: HTMLElement, onDir: (dir: Dir) => void): () => void {
  let start: { x: number; y: number; id: number } | null = null;
  const down = (e: PointerEvent) => {
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const up = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    const dir = swipeDirection(e.clientX - start.x, e.clientY - start.y);
    start = null;
    if (dir) onDir(dir);
  };
  const cancel = () => (start = null);
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", cancel);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", cancel);
  };
}
