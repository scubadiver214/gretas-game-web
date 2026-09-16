"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SettingsState {
  soundOn: boolean;
  musicOn: boolean;
  hapticsOn: boolean;
  /** 0..1 */
  sfxVolume: number;
  /** 0..1 */
  musicVolume: number;
  /** Turns off camera shake, hit-stop and flashes (accessibility). */
  reducedMotion: boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;
  toggleReducedMotion: () => void;
  setSfxVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundOn: true,
      musicOn: true,
      hapticsOn: true,
      sfxVolume: 1,
      musicVolume: 0.6,
      reducedMotion: false,
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
      toggleHaptics: () => set((s) => ({ hapticsOn: !s.hapticsOn })),
      toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
      setSfxVolume: (v) => set({ sfxVolume: Math.max(0, Math.min(1, v)) }),
      setMusicVolume: (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),
    }),
    {
      name: "gretas-game:settings",
      version: 2,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...p,
          musicOn: p.musicOn ?? true,
          sfxVolume: p.sfxVolume ?? 1,
          musicVolume: p.musicVolume ?? 0.6,
          reducedMotion: p.reducedMotion ?? false,
        };
      },
    },
  ),
);
