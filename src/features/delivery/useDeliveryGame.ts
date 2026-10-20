"use client";

import { create } from "zustand";
import { fx, useJuice } from "@/lib/fx";
import { seededRng, type Rng } from "@/lib/rng";
import {
  JUMP_SECONDS,
  LANE_X,
  POWER_UP_LABELS,
  POWER_UP_SECONDS,
  ROUND_SECONDS,
  TURBO_POINTS_MULTIPLIER,
  applyDelivery,
  applyObstacle,
  clampLane,
  deliveryDifficultyFor,
  type DeliveryDifficulty,
  type ItemKind,
  type PowerUpKind,
} from "./scoring";

export type DeliveryPhase = "intro" | "countdown" | "riding" | "finished";

/** How a round should be set up. `seed` makes the spawn sequence deterministic (daily challenge). */
export interface RoundConfig {
  level: number;
  seed?: string;
  challengeDate?: string;
}

export interface ActivePowerUp {
  kind: PowerUpKind;
  /** Date.now() when it expires (Infinity for the shield, which is consumed by a hit). */
  until: number;
}

interface DeliveryState {
  phase: DeliveryPhase;
  config: RoundConfig;
  difficulty: DeliveryDifficulty;
  /** Spawn RNG for this round; seeded for daily challenges. Not reactive. */
  rng: Rng;
  lane: number;
  /** Date.now() when the current jump started, 0 when grounded. */
  jumpStartedAt: number;
  /** Date.now() of the last lane change (drives the squash/stretch). */
  laneChangedAt: number;
  score: number;
  combo: number;
  bestCombo: number;
  deliveries: number;
  hits: number;
  jumps: number;
  powerUpsCollected: number;
  timeLeft: number;
  wobbling: boolean;
  powerUp: ActivePowerUp | null;
  shield: boolean;
  startedAt: number;
  begin: (config: RoundConfig) => void;
  startRide: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  jump: () => void;
  deliver: () => void;
  hit: (kind: ItemKind) => void;
  collectPowerUp: (kind: PowerUpKind) => void;
  reset: () => void;
}

let tick: ReturnType<typeof setInterval> | null = null;
let wobbleTimer: ReturnType<typeof setTimeout> | null = null;
let landTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (tick) clearInterval(tick);
  if (wobbleTimer) clearTimeout(wobbleTimer);
  if (landTimer) clearTimeout(landTimer);
  tick = null;
  wobbleTimer = null;
  landTimer = null;
}

const initial = {
  phase: "intro" as DeliveryPhase,
  config: { level: 1 } as RoundConfig,
  difficulty: deliveryDifficultyFor(1),
  rng: Math.random as Rng,
  lane: 1,
  jumpStartedAt: 0,
  laneChangedAt: 0,
  score: 0,
  combo: 0,
  bestCombo: 0,
  deliveries: 0,
  hits: 0,
  jumps: 0,
  powerUpsCollected: 0,
  timeLeft: ROUND_SECONDS,
  wobbling: false,
  powerUp: null as ActivePowerUp | null,
  shield: false,
  startedAt: 0,
};

/** Screen position of the bike for popups: lanes map to thirds of the width. */
function bikePoint(lane: number): { x: number; y: number } {
  return { x: 0.5 + (LANE_X[lane] / 7.2) * 0.75, y: 0.58 };
}

export function isTurbo(s: Pick<DeliveryState, "powerUp">): boolean {
  return s.powerUp?.kind === "turbo" && s.powerUp.until > Date.now();
}

export function isMagnet(s: Pick<DeliveryState, "powerUp">): boolean {
  return s.powerUp?.kind === "magnet" && s.powerUp.until > Date.now();
}

export const useDeliveryGame = create<DeliveryState>()((set, get) => ({
  ...initial,

  begin: (config) => {
    clearTimers();
    fx.unlock();
    useJuice.getState().clear();
    set({
      ...initial,
      config,
      difficulty: deliveryDifficultyFor(config.level),
      rng: config.seed ? seededRng(`${config.seed}:delivery`) : Math.random,
      phase: "countdown",
    });
  },

  startRide: () => {
    clearTimers();
    const startedAt = Date.now();
    set({ phase: "riding", startedAt, timeLeft: ROUND_SECONDS });
    tick = setInterval(() => {
      const now = Date.now();
      const left = ROUND_SECONDS - (now - startedAt) / 1000;
      const s = get();
      // Expire timed power-ups.
      const powerUp = s.powerUp && s.powerUp.until <= now ? null : s.powerUp;
      if (s.powerUp && !powerUp) fx.tap();
      if (left <= 0) {
        clearTimers();
        set({ timeLeft: 0, phase: "finished", powerUp: null });
      } else {
        set({ timeLeft: left, powerUp });
      }
    }, 100);
  },

  moveLeft: () => {
    const s = get();
    if (s.phase !== "riding") return;
    if (s.lane === 0) return;
    fx.bell();
    set({ lane: clampLane(s.lane - 1), laneChangedAt: Date.now() });
  },
  moveRight: () => {
    const s = get();
    if (s.phase !== "riding") return;
    if (s.lane === LANE_X.length - 1) return;
    fx.bell();
    set({ lane: clampLane(s.lane + 1), laneChangedAt: Date.now() });
  },

  jump: () => {
    const s = get();
    if (s.phase !== "riding") return;
    if (s.jumpStartedAt && Date.now() - s.jumpStartedAt < JUMP_SECONDS * 1000) return;
    fx.jump();
    set({ jumpStartedAt: Date.now(), jumps: s.jumps + 1 });
    if (landTimer) clearTimeout(landTimer);
    landTimer = setTimeout(() => {
      if (get().phase === "riding") fx.land();
      set({ jumpStartedAt: 0 });
    }, JUMP_SECONDS * 1000);
  },

  deliver: () => {
    const s = get();
    if (s.phase !== "riding") return;
    const turbo = isTurbo(s);
    const next = applyDelivery(s, turbo ? TURBO_POINTS_MULTIPLIER : 1);
    const juice = useJuice.getState();
    const at = bikePoint(s.lane);
    if (next.bonus) {
      fx.combo();
      juice.popup(`+${next.gained} Combo x${next.combo}!`, "great", at, true);
      juice.flashScreen("rgba(94,234,212,0.35)");
      juice.hitStop(60);
    } else {
      fx.good();
      juice.popup(`+${next.gained}${turbo ? " Turbo!" : ""}`, turbo ? "great" : "good", at);
    }
    set({
      score: next.score,
      combo: next.combo,
      bestCombo: Math.max(s.bestCombo, next.combo),
      deliveries: s.deliveries + 1,
    });
  },

  hit: (kind) => {
    const s = get();
    if (s.phase !== "riding") return;
    const juice = useJuice.getState();
    const at = bikePoint(s.lane);
    if (s.shield) {
      fx.shield();
      juice.popup("Shield saved you!", "neutral", at);
      juice.flashScreen("rgba(59,130,246,0.35)");
      set({ shield: false, powerUp: s.powerUp?.kind === "shield" ? null : s.powerUp });
      return;
    }
    const next = applyObstacle(s);
    if (kind === "puddle") fx.splash();
    else fx.crash();
    juice.popup(kind === "puddle" ? "-10 Splash!" : "-10 Whoa!", "bad", at);
    juice.shakeCamera(kind === "puddle" ? 0.12 : 0.22);
    juice.hitStop(kind === "puddle" ? 40 : 80);
    juice.flashScreen("rgba(242,84,45,0.3)");
    if (wobbleTimer) clearTimeout(wobbleTimer);
    set({
      score: next.score,
      combo: 0,
      hits: s.hits + 1,
      wobbling: true,
    });
    wobbleTimer = setTimeout(() => set({ wobbling: false }), 550);
  },

  collectPowerUp: (kind) => {
    const s = get();
    if (s.phase !== "riding") return;
    fx.powerup();
    const juice = useJuice.getState();
    juice.popup(POWER_UP_LABELS[kind], "great", bikePoint(s.lane), true);
    juice.flashScreen("rgba(253,230,138,0.45)");
    const seconds = POWER_UP_SECONDS[kind];
    set({
      powerUpsCollected: s.powerUpsCollected + 1,
      shield: kind === "shield" ? true : s.shield,
      powerUp: kind === "shield" ? (s.powerUp && s.powerUp.until > Date.now() ? s.powerUp : { kind, until: Infinity }) : { kind, until: Date.now() + seconds * 1000 },
    });
  },

  reset: () => {
    clearTimers();
    set({ ...initial });
  },
}));
