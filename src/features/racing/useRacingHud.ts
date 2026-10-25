"use client";

import { create } from "zustand";
import type { HudSnapshot } from "./types";

export type BannerTone = "gold" | "blue" | "pink" | "green" | "red";

export interface Banner {
  id: number;
  text: string;
  tone: BannerTone;
}

const initial: HudSnapshot = {
  phase: "ready",
  countdown: null,
  lap: 1,
  laps: 1,
  rank: 1,
  racers: 1,
  coins: 0,
  gems: 0,
  boost: 0,
  boosting: false,
  wrongWay: false,
  stuck: false,
  finishedPlace: null,
  resultsReady: false,
};

interface HudStore extends HudSnapshot {
  banner: Banner | null;
  set: (hud: HudSnapshot) => void;
  /** Flash a short message in the middle of the screen. */
  flash: (text: string, tone?: BannerTone) => void;
  clear: () => void;
}

let bannerId = 0;

/**
 * HUD values pushed by the engine only when one of them changes, so the React tree
 * never re-renders per frame. The ticking numbers (time, speed) are not here at all:
 * they are written straight into the DOM by components/LiveText.
 */
export const useRacingHud = create<HudStore>()((set) => ({
  ...initial,
  banner: null,
  set: (hud) => set(hud),
  flash: (text, tone = "gold") => set({ banner: { id: ++bannerId, text, tone } }),
  clear: () => set({ ...initial, banner: null }),
}));
