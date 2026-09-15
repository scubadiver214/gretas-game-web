"use client";

import { create } from "zustand";
import { fx } from "@/lib/fx";
import { seededRng } from "@/lib/rng";
import {
  generateOrders,
  isOrderComplete,
  kitchenDifficultyFor,
  scoreBake,
  scoreTopping,
  type BakeOutcome,
  type KitchenDifficulty,
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

/** How a round should be set up. `seed` makes the orders deterministic (daily challenge). */
export interface RoundConfig {
  level: number;
  seed?: string;
  challengeDate?: string;
}

interface KitchenState {
  phase: KitchenPhase;
  config: RoundConfig;
  difficulty: KitchenDifficulty;
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
  begin: (config: RoundConfig) => void;
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
  config: { level: 1 } as RoundConfig,
  difficulty: kitchenDifficultyFor(1),
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

  begin: (config) => {
    clearTimers();
    fx.unlock();
    const difficulty = kitchenDifficultyFor(config.level);
    const rng = config.seed ? seededRng(`${config.seed}:kitchen`) : Math.random;
    set({ ...initial, config, difficulty, orders: generateOrders(difficulty, rng), phase: "countdown" });
  },

  startRound: () => set({ phase: "topping", startedAt: Date.now() }),

  addTopping: (id) => {
    const s = get();
    if (s.phase !== "topping") return;
    const order = s.orders[s.orderIndex];
    const { delta, outcome } = scoreTopping(order, s.placed, id);
    const label = id.charAt(0).toUpperCase() + id.slice(1);
    if (outcome === "correct") fx.good();
    else if (outcome === "wrong") fx.bad();
    else fx.tap();
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
    fx.whoosh();
    const started = performance.now();
    const duration = s.difficulty.bakeDurationMs;
    set({ phase: "baking", bakeProgress: 0 });
    bakeTimer = setInterval(() => {
      const p = (performance.now() - started) / duration;
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
    if (outcome === "perfect") fx.great();
    else if (outcome === "ok") fx.good();
    else fx.bad();
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
