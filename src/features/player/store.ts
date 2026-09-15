"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { EMPTY_ROUNDS, type RoundsPlayed } from "./progress";
import { DEFAULT_COLOR, type CharacterId, type GameMode, type GameResult, type RoundRecord } from "./types";

const HISTORY_LIMIT = 200;

interface PlayerState {
  nickname: string;
  character: CharacterId | null;
  /** Outfit / avatar colour (hex). */
  color: string;
  lastResult: GameResult | null;
  /** roundIds that have already been sent to the API. */
  submittedRounds: string[];
  /** Finished rounds per mode on this device; drives the difficulty level. */
  roundsPlayed: RoundsPlayed;
  /** Per-device round history, newest first. */
  history: RoundRecord[];
  /** True once localStorage has been read on the client. */
  hydrated: boolean;
  setNickname: (nickname: string) => void;
  setCharacter: (character: CharacterId) => void;
  setColor: (color: string) => void;
  /** Store the round result and record it in the history / progress counters. */
  finishRound: (result: GameResult) => void;
  markSubmitted: (roundId: string, outcome?: { rank: number; personalBest: boolean }) => void;
  setHydrated: () => void;
  clearHistory: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      nickname: "",
      character: null,
      color: DEFAULT_COLOR.girl,
      lastResult: null,
      submittedRounds: [],
      roundsPlayed: EMPTY_ROUNDS,
      history: [],
      hydrated: false,
      setNickname: (nickname) => set({ nickname }),
      setCharacter: (character) =>
        set((s) => ({
          character,
          // Keep a custom colour, otherwise follow the character's default.
          color: s.character === null || s.color === DEFAULT_COLOR[s.character] ? DEFAULT_COLOR[character] : s.color,
        })),
      setColor: (color) => set({ color }),
      finishRound: (result) =>
        set((s) => {
          if (s.history.some((h) => h.roundId === result.roundId)) return { lastResult: result };
          const record: RoundRecord = {
            roundId: result.roundId,
            mode: result.mode,
            score: result.score,
            level: result.level,
            playedAt: new Date().toISOString(),
            challengeDate: result.challengeDate,
          };
          return {
            lastResult: result,
            history: [record, ...s.history].slice(0, HISTORY_LIMIT),
            roundsPlayed: { ...s.roundsPlayed, [result.mode]: (s.roundsPlayed[result.mode] ?? 0) + 1 },
          };
        }),
      markSubmitted: (roundId, outcome) =>
        set((s) => ({
          submittedRounds: [...s.submittedRounds.slice(-20), roundId],
          history: outcome
            ? s.history.map((h) => (h.roundId === roundId ? { ...h, rank: outcome.rank, personalBest: outcome.personalBest } : h))
            : s.history,
        })),
      setHydrated: () => set({ hydrated: true }),
      clearHistory: () => set({ history: [] }),
      reset: () => set({ nickname: "", character: null, lastResult: null }),
    }),
    {
      name: "gretas-game:player",
      version: 2,
      // Only touch window.localStorage in the browser (Node 26 exposes an
      // experimental global localStorage that warns when accessed on the server).
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => ({
        nickname: s.nickname,
        character: s.character,
        color: s.color,
        lastResult: s.lastResult,
        submittedRounds: s.submittedRounds,
        roundsPlayed: s.roundsPlayed,
        history: s.history,
      }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<PlayerState>;
        if (version < 2) {
          return {
            ...p,
            color: p.color ?? (p.character ? DEFAULT_COLOR[p.character] : DEFAULT_COLOR.girl),
            roundsPlayed: p.roundsPlayed ?? EMPTY_ROUNDS,
            history: p.history ?? [],
          };
        }
        return p;
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Finished rounds for a mode on this device. */
export function useRoundsPlayed(mode: GameMode): number {
  return usePlayerStore((s) => s.roundsPlayed[mode] ?? 0);
}

/**
 * True only after the component has mounted on the client AND the persisted
 * store has been read. Gating on mount avoids SSR/CSR markup mismatches.
 */
const noopSubscribe = () => () => {};
export function usePlayerHydrated(): boolean {
  const hydrated = usePlayerStore((s) => s.hydrated);
  // false during SSR and the hydration render, true afterwards.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return mounted && hydrated;
}
