"use client";

import { create } from "zustand";
import {
  BAKE_DURATION_MS,
  generateOrders,
  isOrderComplete,
  scoreBake,
  scoreTopping,
  type BakeOutcome,
  type Order,
  type ToppingId,
  type ToppingOutcome,
} from "./scoring";

export type KitchenPhase = "intro" | "countdown" | "topping" | "baking" | "served" | "finished";

export interface Feedback {
  id: number;
  text: string;
  tone: "good" | "bad" | "neutral";
}

interface KitchenStats {
  correct: number;
  wrong: number;
  perfectBakes: number;
  okBakes: number;
}

interface KitchenState {
  phase: KitchenPhase;
  orders: Order[];
  orderIndex: number;
  placed: ToppingId[];
  wrongPlaced: ToppingId[];
  score: number;
  bakeProgress: number;
  lastBake: BakeOutcome | null;
  feedback: Feedback | null;
  stats: KitchenStats;
  startedAt: number;
  begin: () => void;
  startRound: () => void;
  addTopping: (id: ToppingId) => void;
  startBaking: () => void;
  takeOut: () => void;
  reset: () => void;
}

let bakeTimer: ReturnType<typeof setInterval> | null = null;
let serveTimer: ReturnType<typeof setTimeout> | null = null;
let feedbackSeq = 0;

function clearTimers() {
  if (bakeTimer) clearInterval(bakeTimer);
  if (serveTimer) clearTimeout(serveTimer);
  bakeTimer = null;
  serveTimer = null;
}

const initial = {
  phase: "intro" as KitchenPhase,
  orders: [] as Order[],
  orderIndex: 0,
  placed: [] as ToppingId[],
  wrongPlaced: [] as ToppingId[],
  score: 0,
  bakeProgress: 0,
  lastBake: null as BakeOutcome | null,
  feedback: null as Feedback | null,
  stats: { correct: 0, wrong: 0, perfectBakes: 0, okBakes: 0 },
  startedAt: 0,
};

const TOPPING_MESSAGES: Record<ToppingOutcome, (label: string) => string> = {
  correct: (l) => `+10 ${l}!`,
  wrong: () => "-5 Oops, not on the order",
  duplicate: () => "Already added",
};

const BAKE_MESSAGES: Record<BakeOutcome, string> = {
  perfect: "+25 Perfect bake!",
  ok: "+10 Nice and toasty",
  raw: "Still doughy...",
  burnt: "Burnt! No bonus",
};

export const useKitchenGame = create<KitchenState>()((set, get) => ({
  ...initial,

  begin: () => {
    clearTimers();
    set({ ...initial, orders: generateOrders(), phase: "countdown" });
  },

  startRound: () => set({ phase: "topping", startedAt: Date.now() }),

  addTopping: (id) => {
    const s = get();
    if (s.phase !== "topping") return;
    const order = s.orders[s.orderIndex];
    const { delta, outcome } = scoreTopping(order, s.placed, id);
    const label = id.charAt(0).toUpperCase() + id.slice(1);
    set({
      placed: outcome === "duplicate" ? s.placed : [...s.placed, id],
      wrongPlaced: outcome === "wrong" ? [...s.wrongPlaced, id] : s.wrongPlaced,
      score: Math.max(0, s.score + delta),
      feedback: {
        id: ++feedbackSeq,
        text: TOPPING_MESSAGES[outcome](label),
        tone: outcome === "correct" ? "good" : outcome === "wrong" ? "bad" : "neutral",
      },
      stats: {
        ...s.stats,
        correct: s.stats.correct + (outcome === "correct" ? 1 : 0),
        wrong: s.stats.wrong + (outcome === "wrong" ? 1 : 0),
      },
    });
  },

  startBaking: () => {
    const s = get();
    if (s.phase !== "topping") return;
    if (!isOrderComplete(s.orders[s.orderIndex], s.placed)) return;
    clearTimers();
    const started = performance.now();
    set({ phase: "baking", bakeProgress: 0 });
    bakeTimer = setInterval(() => {
      const p = (performance.now() - started) / BAKE_DURATION_MS;
      if (p >= 1) {
        set({ bakeProgress: 1 });
        get().takeOut();
      } else {
        set({ bakeProgress: p });
      }
    }, 33);
  },

  takeOut: () => {
    const s = get();
    if (s.phase !== "baking") return;
    if (bakeTimer) clearInterval(bakeTimer);
    bakeTimer = null;
    const { delta, outcome } = scoreBake(s.bakeProgress);
    const isLast = s.orderIndex >= s.orders.length - 1;
    set({
      phase: "served",
      lastBake: outcome,
      score: s.score + delta,
      feedback: { id: ++feedbackSeq, text: BAKE_MESSAGES[outcome], tone: delta > 0 ? "good" : "bad" },
      stats: {
        ...s.stats,
        perfectBakes: s.stats.perfectBakes + (outcome === "perfect" ? 1 : 0),
        okBakes: s.stats.okBakes + (outcome === "ok" ? 1 : 0),
      },
    });
    serveTimer = setTimeout(() => {
      if (isLast) {
        set({ phase: "finished" });
      } else {
        set({
          phase: "topping",
          orderIndex: s.orderIndex + 1,
          placed: [],
          wrongPlaced: [],
          bakeProgress: 0,
          lastBake: null,
        });
      }
    }, 1400);
  },

  reset: () => {
    clearTimers();
    set({ ...initial });
  },
}));
