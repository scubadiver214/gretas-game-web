"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CharacterId, GameResult } from "./types";

interface PlayerState {
  nickname: string;
  character: CharacterId | null;
  lastResult: GameResult | null;
  /** roundIds that have already been sent to the API. */
  submittedRounds: string[];
  /** True once localStorage has been read on the client. */
  hydrated: boolean;
  setNickname: (nickname: string) => void;
  setCharacter: (character: CharacterId) => void;
  setLastResult: (result: GameResult) => void;
  markSubmitted: (roundId: string) => void;
  setHydrated: () => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      nickname: "",
      character: null,
      lastResult: null,
      submittedRounds: [],
      hydrated: false,
      setNickname: (nickname) => set({ nickname }),
      setCharacter: (character) => set({ character }),
      setLastResult: (lastResult) => set({ lastResult }),
      markSubmitted: (roundId) =>
        set((s) => ({ submittedRounds: [...s.submittedRounds.slice(-20), roundId] })),
      setHydrated: () => set({ hydrated: true }),
      reset: () => set({ nickname: "", character: null, lastResult: null }),
    }),
    {
      name: "gretas-game:player",
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
        lastResult: s.lastResult,
        submittedRounds: s.submittedRounds,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

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
