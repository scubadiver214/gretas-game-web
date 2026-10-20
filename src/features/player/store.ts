"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { dailyKey } from "@/lib/rng";
import { evaluateAchievements } from "./achievements";
import { EMPTY_ROUNDS, EMPTY_STARS, STARS_PER_LEVEL, dailyStreak, levelForStars, type RoundsPlayed, type StarsEarned } from "./progress";
import {
  BIKE_SKIN_BY_ID,
  DEFAULT_COLOR,
  DEFAULT_HAIR_COLOR,
  type BikeSkinId,
  type CharacterId,
  type GameMode,
  type GameResult,
  type RoundRecord,
} from "./types";

const HISTORY_LIMIT = 200;
const STORE_VERSION = 5;

interface PlayerState {
  nickname: string;
  character: CharacterId | null;
  /** Outfit / avatar colour (hex). */
  color: string;
  /** Hair colour (hex). */
  hairColor: string;
  bikeSkin: BikeSkinId;
  lastResult: GameResult | null;
  /** Achievements unlocked by the last finished round (shown on the results screen). */
  lastUnlocked: string[];
  /** roundIds that have already been sent to the API. */
  submittedRounds: string[];
  /** Finished rounds per mode on this device. */
  roundsPlayed: RoundsPlayed;
  /** Stars earned per mode on this device; drives the difficulty level. */
  stars: StarsEarned;
  /** achievement id -> ISO date unlocked. */
  achievements: Record<string, string>;
  /** Per-device round history, newest first. */
  history: RoundRecord[];
  /** True once localStorage has been read on the client. */
  hydrated: boolean;
  setNickname: (nickname: string) => void;
  setCharacter: (character: CharacterId) => void;
  setColor: (color: string) => void;
  setHairColor: (hairColor: string) => void;
  setBikeSkin: (skin: BikeSkinId) => void;
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
      hairColor: DEFAULT_HAIR_COLOR.girl,
      bikeSkin: "classic",
      lastResult: null,
      lastUnlocked: [],
      submittedRounds: [],
      roundsPlayed: EMPTY_ROUNDS,
      stars: EMPTY_STARS,
      achievements: {},
      history: [],
      hydrated: false,
      setNickname: (nickname) => set({ nickname }),
      setCharacter: (character) =>
        set((s) => ({
          character,
          // Keep a custom colour, otherwise follow the character's default.
          color: s.character === null || s.color === DEFAULT_COLOR[s.character] ? DEFAULT_COLOR[character] : s.color,
          hairColor:
            s.character === null || s.hairColor === DEFAULT_HAIR_COLOR[s.character]
              ? DEFAULT_HAIR_COLOR[character]
              : s.hairColor,
        })),
      setColor: (color) => set({ color }),
      setHairColor: (hairColor) => set({ hairColor }),
      setBikeSkin: (bikeSkin) => set({ bikeSkin }),
      finishRound: (result) =>
        set((s) => {
          if (s.history.some((h) => h.roundId === result.roundId)) return { lastResult: result };
          const record: RoundRecord = {
            roundId: result.roundId,
            mode: result.mode,
            score: result.score,
            level: result.level,
            stars: result.stars,
            playedAt: new Date().toISOString(),
            challengeDate: result.challengeDate,
          };
          const history = [record, ...s.history].slice(0, HISTORY_LIMIT);
          // Daily challenges are played at a fixed level, so they don't move the level.
          const stars = result.challengeDate ? s.stars : { ...s.stars, [result.mode]: (s.stars[result.mode] ?? 0) + result.stars };
          const streak = dailyStreak(
            history.map((h) => h.challengeDate),
            dailyKey(),
          );
          const unlockedNow = evaluateAchievements(
            { result, history, levelAfter: levelForStars(stars[result.mode]), streak },
            s.achievements,
          );
          const now = new Date().toISOString();
          const achievements = { ...s.achievements };
          for (const id of unlockedNow) achievements[id] = now;
          return {
            lastResult: result,
            lastUnlocked: unlockedNow,
            history,
            stars,
            achievements,
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
      reset: () => set({ nickname: "", character: null, lastResult: null, lastUnlocked: [] }),
    }),
    {
      name: "gretas-game:player",
      version: STORE_VERSION,
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
        hairColor: s.hairColor,
        bikeSkin: s.bikeSkin,
        lastResult: s.lastResult,
        lastUnlocked: s.lastUnlocked,
        submittedRounds: s.submittedRounds,
        roundsPlayed: s.roundsPlayed,
        stars: s.stars,
        achievements: s.achievements,
        history: s.history,
      }),
      migrate: (persisted, version) => migratePlayerState(persisted, version) as PlayerState,
      onRehydrateStorage: () => (state) => {
        // Persist rehydrates synchronously while `create()` is still running, so
        // `usePlayerStore` is in the temporal dead zone here. Use the snapshot
        // persist already passed in; fall back to a microtask if rehydration
        // failed and that snapshot is missing.
        if (state) {
          state.setHydrated();
          return;
        }
        queueMicrotask(() => usePlayerStore.getState().setHydrated());
      },
    },
  ),
);

/** Upgrades persisted player state from any older version to STORE_VERSION. */
export function migratePlayerState(persisted: unknown, version: number): Partial<PlayerState> {
  let p = (persisted ?? {}) as Partial<PlayerState>;
  if (version < 2) {
    p = {
      ...p,
      color: p.color ?? (p.character ? DEFAULT_COLOR[p.character] : DEFAULT_COLOR.girl),
      roundsPlayed: p.roundsPlayed ?? EMPTY_ROUNDS,
      history: p.history ?? [],
    };
  }
  if (version < 3) {
    // Levels used to unlock every 2 rounds; grant the equivalent stars so
    // nobody loses a level they had already reached.
    const rounds = p.roundsPlayed ?? EMPTY_ROUNDS;
    const perRound = STARS_PER_LEVEL / 2;
    p = {
      ...p,
      stars: { ...EMPTY_STARS, kitchen: (rounds.kitchen ?? 0) * perRound, delivery: (rounds.delivery ?? 0) * perRound, wordle: 0 },
      achievements: {},
      bikeSkin: "classic",
      lastUnlocked: [],
    };
  }
  if (version < 4) {
    // New "wordle" mode and hair colour: backfill defaults for existing players.
    const char = p.character ?? "girl";
    p = {
      ...p,
      hairColor: p.hairColor ?? DEFAULT_HAIR_COLOR[char],
      roundsPlayed: { ...EMPTY_ROUNDS, ...p.roundsPlayed },
      stars: { ...EMPTY_STARS, ...p.stars },
    };
  }
  if (version < 5) {
    // New "frogger" mode: give existing players zeroed frogger counters.
    p = {
      ...p,
      roundsPlayed: { ...EMPTY_ROUNDS, ...p.roundsPlayed },
      stars: { ...EMPTY_STARS, ...p.stars },
    };
  }
  return p;
}

/** Stars earned in a mode on this device. */
export function useStars(mode: GameMode): number {
  return usePlayerStore((s) => s.stars[mode] ?? 0);
}

/** Current level for a mode. */
export function useLevel(mode: GameMode): number {
  return usePlayerStore((s) => levelForStars(s.stars[mode] ?? 0));
}

/** True if the bike skin is available to this player. */
export function isBikeSkinUnlocked(skin: BikeSkinId, achievements: Readonly<Record<string, string>>): boolean {
  const req = BIKE_SKIN_BY_ID[skin].unlockedBy;
  return !req || !!achievements[req];
}

/**
 * True only after the component has mounted on the client AND the persisted
 * store has been read. Gating on mount avoids SSR/CSR markup mismatches.
 */
export function usePlayerHydrated(): boolean {
  const hydrated = usePlayerStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted && hydrated;
}
