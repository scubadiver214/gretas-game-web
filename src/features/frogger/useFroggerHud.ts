"use client";

import { create } from "zustand";
import { LIVES } from "./config";
import { levelDef } from "./levelConfig";
import type { HudSnapshot } from "./types";

const initial: HudSnapshot = {
  phase: "ready",
  score: 0,
  lives: LIVES.start,
  level: 1,
  levelsCompleted: 0,
  timeLeft: levelDef(1).timerSeconds,
  timerSeconds: levelDef(1).timerSeconds,
  homes: [false, false, false, false, false],
};

/**
 * HUD values pushed by the engine only when one of them changes (about once a
 * second for the timer), so the React tree never re-renders per frame.
 */
export const useFroggerHud = create<HudSnapshot & { set: (hud: HudSnapshot) => void; clear: () => void }>()((set) => ({
  ...initial,
  set: (hud) => set(hud),
  clear: () => set(initial),
}));
