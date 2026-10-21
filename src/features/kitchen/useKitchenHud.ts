"use client";

import { create } from "zustand";
import type { HudSnapshot } from "./engine/types";

const initial: HudSnapshot = {
  phase: "ready",
  score: 0,
  combo: 0,
  timeLeft: 0,
  shiftSeconds: 0,
  orders: [],
  focus: [],
  starTargets: [0, 0, 0],
  rush: false,
};

/** HUD values pushed by the engine only when something shown changes. */
export const useKitchenHud = create<HudSnapshot & { set: (hud: HudSnapshot) => void; clear: () => void }>()((set) => ({
  ...initial,
  set: (hud) => set(hud),
  clear: () => set(initial),
}));
