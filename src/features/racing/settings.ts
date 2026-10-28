"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CameraDistance } from "./config";
import type { AssistLevel } from "./engine/difficulty";
import { TRACKS } from "./world";

/** How hard a blast shoves the camera. Calm view still turns it off entirely. */
export type ScreenShake = "full" | "soft" | "off";

/** Race the rival cars, or drive alone against the clock. */
export type RaceMode = "rivals" | "timeTrial";

interface RacingSettings {
  /** How much help the driver gets. Helper by default: kids first. */
  assist: AssistLevel;
  cameraDistance: CameraDistance;
  /** Hide the clock and minimap for the littlest drivers. */
  simpleHud: boolean;
  /** Which track the menu has picked. Anything unknown falls back to the first (see `trackById`). */
  trackId: string;
  mode: RaceMode;
  /** Rival races started on this browser. The field gets faster as this grows. */
  racesEntered: number;
  /** Earthquake when a car blows up. */
  screenShake: ScreenShake;
  setAssist: (a: AssistLevel) => void;
  setCameraDistance: (d: CameraDistance) => void;
  setSimpleHud: (v: boolean) => void;
  setTrackId: (id: string) => void;
  setMode: (m: RaceMode) => void;
  /** Count one rival race the player has started. */
  noteRace: () => void;
  setScreenShake: (s: ScreenShake) => void;
}

const ASSISTS: readonly AssistLevel[] = ["off", "helper", "extra"];
const DISTANCES: readonly CameraDistance[] = ["close", "normal", "far"];
const MODES: readonly RaceMode[] = ["rivals", "timeTrial"];
const SHAKES: readonly ScreenShake[] = ["full", "soft", "off"];

export const useRacingSettings = create<RacingSettings>()(
  persist(
    (set) => ({
      assist: "helper",
      cameraDistance: "normal",
      simpleHud: false,
      trackId: TRACKS[0].id,
      mode: "rivals",
      racesEntered: 0,
      screenShake: "full",
      setAssist: (assist) => set({ assist }),
      setCameraDistance: (cameraDistance) => set({ cameraDistance }),
      setSimpleHud: (simpleHud) => set({ simpleHud }),
      setTrackId: (trackId) => set({ trackId }),
      setMode: (mode) => set({ mode }),
      noteRace: () => set((s) => ({ racesEntered: s.racesEntered + 1 })),
      setScreenShake: (screenShake) => set({ screenShake }),
    }),
    {
      name: "gretas-game:racing-settings",
      version: 5,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } : window.localStorage,
      ),
      // Anything unexpected in storage falls back to the defaults.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<RacingSettings>;
        return {
          assist: ASSISTS.includes(p.assist as AssistLevel) ? (p.assist as AssistLevel) : "helper",
          cameraDistance: DISTANCES.includes(p.cameraDistance as CameraDistance) ? (p.cameraDistance as CameraDistance) : "normal",
          simpleHud: p.simpleHud === true,
          trackId: TRACKS.some((t) => t.id === p.trackId) ? (p.trackId as string) : TRACKS[0].id,
          mode: MODES.includes(p.mode as RaceMode) ? (p.mode as RaceMode) : "rivals",
          racesEntered: typeof p.racesEntered === "number" && p.racesEntered >= 0 && Number.isFinite(p.racesEntered) ? Math.floor(p.racesEntered) : 0,
          screenShake: SHAKES.includes(p.screenShake as ScreenShake) ? (p.screenShake as ScreenShake) : "full",
        } as RacingSettings;
      },
    },
  ),
);
