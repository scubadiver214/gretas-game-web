"use client";

import { create } from "zustand";
import { fx, useJuice } from "@/lib/fx";
import { seededRng } from "@/lib/rng";
import {
  BAKE_ZONES,
  generateOrders,
  isOrderComplete,
  kitchenDifficultyFor,
  scoreBake,
  scoreTopping,
  speedyBonus,
  type BakeOutcome,
  type KitchenDifficulty,
  type Order,
  type ToppingId,
} from "./scoring";

export type KitchenPhase = "intro" | "countdown" | "topping" | "baking" | "served" | "finished";

export interface KitchenStats {
  correct: number;
  wrong: number;
  perfectBakes: number;
  okBakes: number;
  speedy: number;
  abandoned: number;
  rushPerfect: number;
}

/** How a round should be set up. `seed` makes the orders deterministic (daily challenge). */
export interface RoundConfig {
  level: number;
  seed?: string;
  challengeDate?: string;
}

/** Screen position (viewport fractions) for a score popup. */
export interface ScreenPoint {
  x: number;
  y: number;
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
  /** Fraction of the customer's patience left for the current order (1 when no timer). */
  patience: number;
  lastBake: BakeOutcome | null;
  /** Set for one frame-ish when a perfect bake happens (scene sparkles). */
  perfectAt: number;
  stats: KitchenStats;
  startedAt: number;
  begin: (config: RoundConfig) => void;
  startRound: () => void;
  addTopping: (id: ToppingId, at?: ScreenPoint) => void;
  startBaking: () => void;
  takeOut: () => void;
  reset: () => void;
}

let bakeTimer: ReturnType<typeof setInterval> | null = null;
let serveTimer: ReturnType<typeof setTimeout> | null = null;
let patienceTimer: ReturnType<typeof setInterval> | null = null;
let hurried = false;
let dinged = false;

function clearTimers() {
  if (bakeTimer) clearInterval(bakeTimer);
  if (serveTimer) clearTimeout(serveTimer);
  if (patienceTimer) clearInterval(patienceTimer);
  bakeTimer = null;
  serveTimer = null;
  patienceTimer = null;
}

const initialStats: KitchenStats = { correct: 0, wrong: 0, perfectBakes: 0, okBakes: 0, speedy: 0, abandoned: 0, rushPerfect: 0 };

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
  patience: 1,
  lastBake: null as BakeOutcome | null,
  perfectAt: 0,
  stats: initialStats,
  startedAt: 0,
};

const BAKE_MESSAGES: Record<BakeOutcome, string> = {
  perfect: "Perfect bake!",
  ok: "Nice and toasty",
  raw: "Still doughy...",
  burnt: "Burnt!",
};

/** Where popups appear when the player uses the DOM topping grid (above the tray). */
const TRAY_POINT: ScreenPoint = { x: 0.5, y: 0.5 };
const OVEN_POINT: ScreenPoint = { x: 0.7, y: 0.42 };

export const useKitchenGame = create<KitchenState>()((set, get) => ({
  ...initial,

  begin: (config) => {
    clearTimers();
    fx.unlock();
    useJuice.getState().clear();
    const difficulty = kitchenDifficultyFor(config.level);
    const rng = config.seed ? seededRng(`${config.seed}:kitchen`) : Math.random;
    set({ ...initial, config, difficulty, orders: generateOrders(difficulty, rng), phase: "countdown" });
  },

  startRound: () => {
    set({ phase: "topping", startedAt: Date.now() });
    startPatience(set, get);
  },

  addTopping: (id, at) => {
    const s = get();
    if (s.phase !== "topping") return;
    const order = s.orders[s.orderIndex];
    const { delta, outcome } = scoreTopping(order, s.placed, id);
    const label = id.charAt(0).toUpperCase() + id.slice(1);
    const juice = useJuice.getState();
    const point = at ?? TRAY_POINT;
    if (outcome === "correct") {
      fx.pop();
      juice.popup(`+${delta} ${label}`, "good", point);
    } else if (outcome === "wrong") {
      fx.bad();
      juice.popup(`${delta} not on the order`, "bad", point);
      juice.shakeCamera(0.08);
    } else {
      fx.tap();
      juice.popup("Already added", "neutral", point);
    }
    const placed = outcome === "duplicate" ? s.placed : [...s.placed, id];
    set({
      placed,
      wrongPlaced: outcome === "wrong" ? [...s.wrongPlaced, id] : s.wrongPlaced,
      score: Math.max(0, s.score + delta),
      stats: {
        ...s.stats,
        correct: s.stats.correct + (outcome === "correct" ? 1 : 0),
        wrong: s.stats.wrong + (outcome === "wrong" ? 1 : 0),
      },
    });
    if (outcome === "correct" && isOrderComplete(order, placed)) fx.ding();
  },

  startBaking: () => {
    const s = get();
    if (s.phase !== "topping") return;
    const order = s.orders[s.orderIndex];
    if (!isOrderComplete(order, s.placed)) return;
    clearTimers();
    hurried = false;
    dinged = false;
    fx.whoosh();
    setTimeout(() => get().phase === "baking" && fx.sizzle(), 350);
    // Speedy bonus for finishing the toppings with patience to spare.
    const bonus = speedyBonus(order, s.patience);
    if (bonus > 0) {
      fx.good();
      useJuice.getState().popup(`+${bonus} Speedy!`, "great", { x: 0.5, y: 0.3 });
    }
    const started = performance.now();
    const duration = s.difficulty.bakeDurationMs;
    set({ phase: "baking", bakeProgress: 0, score: s.score + bonus, stats: { ...s.stats, speedy: s.stats.speedy + (bonus > 0 ? 1 : 0) } });
    bakeTimer = setInterval(() => {
      const p = (performance.now() - started) / duration;
      if (!dinged && p >= BAKE_ZONES.perfectStart) {
        dinged = true;
        fx.ding();
      }
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
    const order = s.orders[s.orderIndex];
    const { delta, outcome } = scoreBake(s.bakeProgress, order);
    const juice = useJuice.getState();
    if (outcome === "perfect") {
      fx.great();
      juice.popup(`+${delta} ${BAKE_MESSAGES.perfect}`, "great", OVEN_POINT, true);
      juice.flashScreen("rgba(255,244,200,0.7)");
      juice.hitStop(90);
    } else if (outcome === "ok") {
      fx.good();
      juice.popup(`+${delta} ${BAKE_MESSAGES.ok}`, "good", OVEN_POINT);
    } else {
      fx.bad();
      juice.popup(BAKE_MESSAGES[outcome], "bad", OVEN_POINT);
      juice.shakeCamera(outcome === "burnt" ? 0.12 : 0.05);
    }
    set({
      phase: "served",
      lastBake: outcome,
      perfectAt: outcome === "perfect" ? performance.now() : s.perfectAt,
      score: s.score + delta,
      stats: {
        ...s.stats,
        perfectBakes: s.stats.perfectBakes + (outcome === "perfect" ? 1 : 0),
        okBakes: s.stats.okBakes + (outcome === "ok" ? 1 : 0),
        rushPerfect: s.stats.rushPerfect + (outcome === "perfect" && order.rush ? 1 : 0),
      },
    });
    advance(set, get, 1400);
  },

  reset: () => {
    clearTimers();
    set({ ...initial });
  },
}));

type Set = (partial: Partial<KitchenState>) => void;
type Get = () => KitchenState;

/** Move to the next order (or finish) after a short pause. */
function advance(set: Set, get: Get, delayMs: number) {
  if (serveTimer) clearTimeout(serveTimer);
  serveTimer = setTimeout(() => {
    const s = get();
    const isLast = s.orderIndex >= s.orders.length - 1;
    if (isLast) {
      clearTimers();
      set({ phase: "finished" });
    } else {
      set({
        phase: "topping",
        orderIndex: s.orderIndex + 1,
        placed: [],
        wrongPlaced: [],
        bakeProgress: 0,
        patience: 1,
        lastBake: null,
      });
      startPatience(set, get);
    }
  }, delayMs);
}

/** Customer patience countdown for the topping step. */
function startPatience(set: Set, get: Get) {
  if (patienceTimer) clearInterval(patienceTimer);
  patienceTimer = null;
  hurried = false;
  const s = get();
  const order = s.orders[s.orderIndex];
  if (!order || order.patienceMs <= 0) {
    set({ patience: 1 });
    return;
  }
  const started = performance.now();
  set({ patience: 1 });
  patienceTimer = setInterval(() => {
    const cur = get();
    if (cur.phase !== "topping") {
      if (patienceTimer) clearInterval(patienceTimer);
      patienceTimer = null;
      return;
    }
    const left = 1 - (performance.now() - started) / order.patienceMs;
    if (left <= 0.3 && !hurried) {
      hurried = true;
      fx.hurry();
    }
    if (left <= 0) {
      if (patienceTimer) clearInterval(patienceTimer);
      patienceTimer = null;
      // Customer walked out: no bake, no bonus, on to the next order.
      fx.bad();
      const juice = useJuice.getState();
      juice.popup("Customer left! 😢", "bad", { x: 0.5, y: 0.35 }, true);
      juice.shakeCamera(0.1);
      set({ phase: "served", patience: 0, lastBake: null, stats: { ...cur.stats, abandoned: cur.stats.abandoned + 1 } });
      advance(set, get, 1200);
    } else {
      set({ patience: left });
    }
  }, 50);
}
