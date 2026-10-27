"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { newBadges } from "./badges";
import type { DifficultyId, HuntSummary, PhotoResult, SpeciesId } from "./types";

export interface LevelRecord {
  stars: number;
  bestScore: number;
  plays: number;
  /** Failed attempts since the level was last passed; drives the adaptive help. */
  fails: number;
  lastStars: number;
  bestAccuracy: number;
}

export interface JournalEntry {
  firstAt: string;
  photos: number;
  bestStars: number;
  /** Small JPEG data URL of the best photo. */
  thumb: string | null;
}

export interface ProgressData {
  difficulty: DifficultyId;
  /** Look sensitivity multiplier, 0.4..2. */
  sensitivity: number;
  assist: boolean;
  invertY: boolean;
  hints: boolean;
  levels: Record<string, LevelRecord>;
  journal: Partial<Record<SpeciesId, JournalEntry>>;
  badges: Record<string, string>;
  totals: { hits: number; shots: number; photos: number; rounds: number };
}

export const DEFAULT_PROGRESS: ProgressData = {
  difficulty: "junior",
  sensitivity: 1,
  assist: true,
  invertY: false,
  hints: true,
  levels: {},
  journal: {},
  badges: {},
  totals: { hits: 0, shots: 0, photos: 0, rounds: 0 },
};

const EMPTY_LEVEL: LevelRecord = { stars: 0, bestScore: 0, plays: 0, fails: 0, lastStars: 0, bestAccuracy: 0 };

/** Fold a finished round into the saved progress (pure). */
export function applyRound(p: ProgressData, s: HuntSummary): ProgressData {
  const totals = { ...p.totals, hits: p.totals.hits + s.hits, shots: p.totals.shots + s.shots, rounds: p.totals.rounds + 1 };
  if (s.activity === "explore") return { ...p, totals };
  const prev = p.levels[s.levelId] ?? EMPTY_LEVEL;
  const rec: LevelRecord = {
    stars: Math.max(prev.stars, s.stars),
    bestScore: Math.max(prev.bestScore, s.score),
    plays: prev.plays + 1,
    fails: s.success ? 0 : prev.fails + 1,
    lastStars: s.stars,
    bestAccuracy: Math.max(prev.bestAccuracy, s.shots > 0 ? s.accuracy : 0),
  };
  return { ...p, totals, levels: { ...p.levels, [s.levelId]: rec } };
}

/** Add a photo to the journal (pure). The thumbnail is kept when it is the best shot so far. */
export function applyPhoto(p: ProgressData, r: PhotoResult, thumb: string | null, now: string): { data: ProgressData; isNew: boolean; improved: boolean } {
  const totals = { ...p.totals, photos: p.totals.photos + 1 };
  if (!r.species) return { data: { ...p, totals }, isNew: false, improved: false };
  const prev = p.journal[r.species];
  const improved = !prev || r.stars > prev.bestStars;
  const entry: JournalEntry = {
    firstAt: prev?.firstAt ?? now,
    photos: (prev?.photos ?? 0) + 1,
    bestStars: Math.max(prev?.bestStars ?? 0, r.stars),
    thumb: improved && thumb ? thumb : prev?.thumb ?? thumb,
  };
  return { data: { ...p, totals, journal: { ...p.journal, [r.species]: entry } }, isNew: !prev, improved };
}

export function withBadges(p: ProgressData, last: HuntSummary | null, now: string): { data: ProgressData; earned: string[] } {
  const earned = newBadges(p, last);
  if (earned.length === 0) return { data: p, earned };
  const badges = { ...p.badges };
  for (const id of earned) badges[id] = now;
  return { data: { ...p, badges }, earned };
}

export function starsByLevel(p: Pick<ProgressData, "levels">): Record<string, number> {
  return Object.fromEntries(Object.entries(p.levels).map(([id, r]) => [id, r.stars]));
}

const DIFFICULTY_IDS: readonly DifficultyId[] = ["junior", "adventure", "expert"];

interface ProgressStore extends ProgressData {
  setDifficulty: (d: DifficultyId) => void;
  setSensitivity: (v: number) => void;
  setAssist: (v: boolean) => void;
  setInvertY: (v: boolean) => void;
  setHints: (v: boolean) => void;
  /** Returns badge ids earned by this round. */
  recordRound: (s: HuntSummary) => string[];
  /** Returns whether the species is new and which badges the photo earned. */
  recordPhoto: (r: PhotoResult, thumb: string | null) => { isNew: boolean; earned: string[] };
}

const dataOf = (s: ProgressStore): ProgressData => ({
  difficulty: s.difficulty,
  sensitivity: s.sensitivity,
  assist: s.assist,
  invertY: s.invertY,
  hints: s.hints,
  levels: s.levels,
  journal: s.journal,
  badges: s.badges,
  totals: s.totals,
});

export const useHuntProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PROGRESS,
      setDifficulty: (difficulty) => set({ difficulty }),
      setSensitivity: (v) => set({ sensitivity: Math.max(0.4, Math.min(2, v)) }),
      setAssist: (assist) => set({ assist }),
      setInvertY: (invertY) => set({ invertY }),
      setHints: (hints) => set({ hints }),
      recordRound: (s) => {
        const now = new Date().toISOString();
        const { data, earned } = withBadges(applyRound(dataOf(get()), s), s, now);
        set(data);
        return earned;
      },
      recordPhoto: (r, thumb) => {
        const now = new Date().toISOString();
        const photo = applyPhoto(dataOf(get()), r, thumb, now);
        const { data, earned } = withBadges(photo.data, null, now);
        set(data);
        return { isNew: photo.isNew, earned };
      },
    }),
    {
      name: "gretas-game:hunting",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } : window.localStorage,
      ),
      partialize: (s) => dataOf(s),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressData>;
        return {
          ...current,
          ...p,
          difficulty: DIFFICULTY_IDS.includes(p.difficulty as DifficultyId) ? (p.difficulty as DifficultyId) : current.difficulty,
          totals: { ...DEFAULT_PROGRESS.totals, ...p.totals },
          levels: p.levels ?? {},
          journal: p.journal ?? {},
          badges: p.badges ?? {},
        };
      },
    },
  ),
);
