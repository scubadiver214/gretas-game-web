"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { emptyProfile, type ClawProfile, type CompleteAttemptResponse, type RecordGrabResponse } from "./api";

/**
 * The last profile we saw from the server, kept on the device so the hub can
 * show the player's avatar instantly and the game can still gate levels when
 * the API is unreachable. The server stays the source of truth: every
 * successful response overwrites this.
 */
interface MirrorState {
  nickname: string;
  profile: ClawProfile | null;
  applyProfile: (nickname: string, profile: ClawProfile) => void;
  applyGrab: (nickname: string, level: number, response: RecordGrabResponse) => void;
  applyComplete: (nickname: string, level: number, grabs: number, response: CompleteAttemptResponse) => void;
  applyAvatar: (nickname: string, avatarId: string) => void;
  applyFavorite: (nickname: string, prizeId: string, favorite: boolean) => void;
}

function base(s: MirrorState, nickname: string): ClawProfile {
  return s.nickname === nickname && s.profile ? s.profile : emptyProfile(nickname);
}

export const useClawMirror = create<MirrorState>()(
  persist(
    (set) => ({
      nickname: "",
      profile: null,
      applyProfile: (nickname, profile) => set({ nickname, profile }),
      applyGrab: (nickname, _level, r) =>
        set((s) => {
          const p = base(s, nickname);
          if (!r.succeeded || !r.prizeId) return { nickname, profile: { ...p, totalGrabs: p.totalGrabs + 1 } };
          const now = new Date().toISOString();
          const prizes = p.prizes.some((x) => x.prizeId === r.prizeId)
            ? p.prizes.map((x) => (x.prizeId === r.prizeId ? { ...x, count: r.count, lastCollectedAt: now } : x))
            : [...p.prizes, { prizeId: r.prizeId, count: r.count, favorite: false, firstCollectedAt: now, lastCollectedAt: now }];
          const avatars = [...p.avatars, ...r.newAvatars.filter((id) => !p.avatars.some((a) => a.avatarId === id)).map((avatarId) => ({ avatarId, unlockedAt: now }))];
          return {
            nickname,
            profile: {
              ...p,
              points: r.totalPoints,
              totalGrabs: p.totalGrabs + 1,
              successfulGrabs: p.successfulGrabs + 1,
              prizes,
              avatars,
              selectedAvatar: p.selectedAvatar ?? r.newAvatars[0] ?? null,
            },
          };
        }),
      applyComplete: (nickname, level, grabs, r) =>
        set((s) => {
          const p = base(s, nickname);
          const now = new Date().toISOString();
          const existing = p.levels.find((l) => l.level === level);
          const levels = !r.cleared
            ? p.levels
            : existing
              ? p.levels.map((l) => (l.level === level ? { ...l, stars: Math.max(l.stars, r.stars), bestGrabs: Math.min(l.bestGrabs, grabs), clears: l.clears + 1, lastClearedAt: now } : l))
              : [...p.levels, { level, stars: r.stars, bestGrabs: grabs, clears: 1, lastClearedAt: now }].sort((a, b) => a.level - b.level);
          const avatars = [...p.avatars, ...r.newAvatars.filter((id) => !p.avatars.some((a) => a.avatarId === id)).map((avatarId) => ({ avatarId, unlockedAt: now }))];
          return { nickname, profile: { ...p, currentLevel: r.currentLevel, levels, avatars, selectedAvatar: p.selectedAvatar ?? r.newAvatars[0] ?? null } };
        }),
      applyAvatar: (nickname, avatarId) => set((s) => ({ nickname, profile: { ...base(s, nickname), selectedAvatar: avatarId } })),
      applyFavorite: (nickname, prizeId, favorite) =>
        set((s) => {
          const p = base(s, nickname);
          return { nickname, profile: { ...p, prizes: p.prizes.map((x) => (x.prizeId === prizeId ? { ...x, favorite } : x)) } };
        }),
    }),
    {
      name: "gretas-game:claw-mirror",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => ({ nickname: s.nickname, profile: s.profile }) as MirrorState,
    },
  ),
);
