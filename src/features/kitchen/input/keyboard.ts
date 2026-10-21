/**
 * Keyboard -> per-player stick + buttons. Each local player is a "slot";
 * the game decides which chef a slot steers. Co-op bindings stay here for later.
 * Uses KeyboardEvent.code so bindings follow key positions, not layouts.
 */

export type PadAction = "interact" | "work" | "dash" | "swap";

export interface KeyBindings {
  up: readonly string[];
  down: readonly string[];
  left: readonly string[];
  right: readonly string[];
  interact: readonly string[];
  work: readonly string[];
  dash: readonly string[];
  swap?: readonly string[];
}

export const SOLO_KEYS: KeyBindings = {
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  interact: ["Space", "KeyJ"],
  work: ["KeyE", "KeyK"],
  dash: ["ShiftLeft", "ShiftRight", "KeyL"],
  swap: ["KeyQ", "Tab"],
};

export const COOP_KEYS: readonly KeyBindings[] = [
  { up: ["KeyW"], down: ["KeyS"], left: ["KeyA"], right: ["KeyD"], interact: ["Space"], work: ["KeyE"], dash: ["ShiftLeft"] },
  { up: ["ArrowUp"], down: ["ArrowDown"], left: ["ArrowLeft"], right: ["ArrowRight"], interact: ["Enter"], work: ["Slash"], dash: ["Period"] },
];

export const PAUSE_KEYS = ["Escape", "KeyP"];

/** Readable key names for the controls card. */
export const KEY_LABELS: Record<string, string> = {
  Space: "Space",
  KeyE: "E",
  KeyQ: "Q",
  Tab: "Tab",
  ShiftLeft: "Shift",
  Enter: "Enter",
  Slash: "/",
  Period: ".",
};

export interface PadListener {
  move: (slot: number, x: number, z: number) => void;
  action: (slot: number, action: PadAction) => void;
  pause: () => void;
}

/** Stick vector for a set of held keys (screen up = -z, into the kitchen). */
export function stickFor(b: KeyBindings, held: ReadonlySet<string>): { x: number; z: number } {
  const on = (codes: readonly string[]) => codes.some((c) => held.has(c));
  let x = (on(b.right) ? 1 : 0) - (on(b.left) ? 1 : 0);
  let z = (on(b.down) ? 1 : 0) - (on(b.up) ? 1 : 0);
  if (x && z) {
    x *= Math.SQRT1_2;
    z *= Math.SQRT1_2;
  }
  return { x, z };
}

export class KeyboardPads {
  private held = new Set<string>();
  private sticks: { x: number; z: number }[];

  constructor(
    private bindings: readonly KeyBindings[],
    private listener: PadListener,
  ) {
    this.sticks = bindings.map(() => ({ x: 0, z: 0 }));
  }

  /** Current stick for a slot (resend after a pause or chef swap). */
  stick(slot: number): { x: number; z: number } {
    return this.sticks[slot] ?? { x: 0, z: 0 };
  }

  bind(target: Window): () => void {
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (PAUSE_KEYS.includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) this.listener.pause();
        return;
      }
      if (!this.owns(e.code)) return;
      e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.bindings.forEach((b, slot) => {
        if (b.interact.includes(e.code)) this.listener.action(slot, "interact");
        if (b.work.includes(e.code)) this.listener.action(slot, "work");
        if (b.dash.includes(e.code)) this.listener.action(slot, "dash");
        if (b.swap?.includes(e.code)) this.listener.action(slot, "swap");
      });
      this.update();
    };
    const up = (e: KeyboardEvent) => {
      if (!this.held.delete(e.code)) return;
      this.update();
    };
    const clear = () => {
      this.held.clear();
      this.update();
    };
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    target.addEventListener("blur", clear);
    return () => {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      target.removeEventListener("blur", clear);
    };
  }

  private owns(code: string): boolean {
    return this.bindings.some((b) => [b.up, b.down, b.left, b.right, b.interact, b.work, b.dash, b.swap ?? []].some((list) => list.includes(code)));
  }

  private update(): void {
    this.bindings.forEach((b, slot) => {
      const next = stickFor(b, this.held);
      const prev = this.sticks[slot];
      if (next.x === prev.x && next.z === prev.z) return;
      this.sticks[slot] = next;
      this.listener.move(slot, next.x, next.z);
    });
  }
}
