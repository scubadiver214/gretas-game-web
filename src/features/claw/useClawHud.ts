"use client";

import { create } from "zustand";
import type { HudSnapshot } from "./engine/types";

const initial: HudSnapshot = {
  phase: "ready",
  level: 1,
  goal: 1,
  successes: 0,
  grabs: 0,
  misses: 0,
  points: 0,
  hint: null,
  depthControl: false,
  canMove: false,
  canGrab: false,
};

/**
 * HUD values pushed by the engine only when one of them changes, so the
 * React tree never re-renders per frame while the claw glides.
 */
export const useClawHud = create<HudSnapshot & { set: (hud: HudSnapshot) => void; clear: () => void }>()((set) => ({
  ...initial,
  set: (hud) => set(hud),
  clear: () => set(initial),
}));
