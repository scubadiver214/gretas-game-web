"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CameraDistance } from "./config";
import type { AssistLevel } from "./engine/difficulty";
import { TRACKS } from "./world";

interface RacingSettings {
  /** How much help the driver gets. Helper by default: kids first. */
  assist: AssistLevel;
  cameraDistance: CameraDistance;
  /** Hide the clock and minimap for the littlest drivers. */
  simpleHud: boolean;
  /** Which track the menu has picked. Anything unknown falls back to the first (see `trackById`). */
  trackId: string;
  setAssist: (a: AssistLevel) => void;
  setCameraDistance: (d: CameraDistance) => void;
  setSimpleHud: (v: boolean) => void;
  setTrackId: (id: string) => void;
}

const ASSISTS: readonly AssistLevel[] = ["off", "helper", "extra"];
const DISTANCES: readonly CameraDistance[] = ["close", "normal", "far"];

export const useRacingSettings = create<RacingSettings>()(
  persist(
    (set) => ({
      assist: "helper",
      cameraDistance: "normal",
      simpleHud: false,
      trackId: TRACKS[0].id,
      setAssist: (assist) => set({ assist }),
      setCameraDistance: (cameraDistance) => set({ cameraDistance }),
      setSimpleHud: (simpleHud) => set({ simpleHud }),
      setTrackId: (trackId) => set({ trackId }),
    }),
    {
      name: "gretas-game:racing-settings",
      version: 2,
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
        } as RacingSettings;
      },
    },
  ),
);
