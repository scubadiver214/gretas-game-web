"use client";

import { create } from "zustand";
import { ROUND_SECONDS, applyDelivery, applyObstacle, clampLane } from "./scoring";

export type DeliveryPhase = "intro" | "countdown" | "riding" | "finished";

export interface Feedback {
  id: number;
  text: string;
  tone: "good" | "bad" | "neutral";
}

interface DeliveryState {
  phase: DeliveryPhase;
  lane: number;
  score: number;
  combo: number;
  bestCombo: number;
  deliveries: number;
  hits: number;
  timeLeft: number;
  wobbling: boolean;
  feedback: Feedback | null;
  startedAt: number;
  begin: () => void;
  startRide: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  deliver: () => void;
  hit: () => void;
  reset: () => void;
}

let tick: ReturnType<typeof setInterval> | null = null;
let wobbleTimer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

function clearTimers() {
  if (tick) clearInterval(tick);
  if (wobbleTimer) clearTimeout(wobbleTimer);
  tick = null;
  wobbleTimer = null;
}

const initial = {
  phase: "intro" as DeliveryPhase,
  lane: 1,
  score: 0,
  combo: 0,
  bestCombo: 0,
  deliveries: 0,
  hits: 0,
  timeLeft: ROUND_SECONDS,
  wobbling: false,
  feedback: null as Feedback | null,
  startedAt: 0,
};

export const useDeliveryGame = create<DeliveryState>()((set, get) => ({
  ...initial,

  begin: () => {
    clearTimers();
    set({ ...initial, phase: "countdown" });
  },

  startRide: () => {
    clearTimers();
    const startedAt = Date.now();
    set({ phase: "riding", startedAt, timeLeft: ROUND_SECONDS });
    tick = setInterval(() => {
      const left = ROUND_SECONDS - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        clearTimers();
        set({ timeLeft: 0, phase: "finished" });
      } else {
        set({ timeLeft: left });
      }
    }, 100);
  },

  moveLeft: () => {
    if (get().phase !== "riding") return;
    set((s) => ({ lane: clampLane(s.lane - 1) }));
  },
  moveRight: () => {
    if (get().phase !== "riding") return;
    set((s) => ({ lane: clampLane(s.lane + 1) }));
  },

  deliver: () => {
    const s = get();
    if (s.phase !== "riding") return;
    const next = applyDelivery(s);
    set({
      score: next.score,
      combo: next.combo,
      bestCombo: Math.max(s.bestCombo, next.combo),
      deliveries: s.deliveries + 1,
      feedback: { id: ++seq, text: next.bonus ? "+35 Combo!" : "+20 Delivered!", tone: "good" },
    });
  },

  hit: () => {
    const s = get();
    if (s.phase !== "riding") return;
    const next = applyObstacle(s);
    if (wobbleTimer) clearTimeout(wobbleTimer);
    set({
      score: next.score,
      combo: 0,
      hits: s.hits + 1,
      wobbling: true,
      feedback: { id: ++seq, text: "-10 Whoa!", tone: "bad" },
    });
    wobbleTimer = setTimeout(() => set({ wobbling: false }), 550);
  },

  reset: () => {
    clearTimers();
    set({ ...initial });
  },
}));
