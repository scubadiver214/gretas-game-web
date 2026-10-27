"use client";

import { create } from "zustand";
import type { HudSnapshot, PhotoResult } from "./types";

export type Tone = "gold" | "green" | "blue" | "pink" | "red";

export interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  sub?: string;
  tone: Tone;
}

export interface Banner {
  id: number;
  text: string;
  tone: Tone;
  /** Long messages (protected wildlife, tips) stay up longer and wrap. */
  long?: boolean;
}

export interface PhotoCard {
  id: number;
  result: PhotoResult;
  thumb: string | null;
  isNew: boolean;
}

interface HudStore {
  hud: HudSnapshot | null;
  popups: Popup[];
  banner: Banner | null;
  photo: PhotoCard | null;
  /** Badge ids waiting to be shown as toasts. */
  badges: string[];
  set: (h: HudSnapshot) => void;
  popup: (p: Omit<Popup, "id">) => void;
  flash: (text: string, tone?: Tone, long?: boolean) => void;
  showPhoto: (p: Omit<PhotoCard, "id">) => void;
  toastBadges: (ids: string[]) => void;
  shiftBadge: () => void;
  clear: () => void;
}

let nextId = 1;
const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (ms: number, fn: () => void) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
};

/** Everything the DOM HUD shows. The engine pushes snapshots; effects push popups and banners. */
export const useHuntHud = create<HudStore>()((set, get) => ({
  hud: null,
  popups: [],
  banner: null,
  photo: null,
  badges: [],
  set: (hud) => set({ hud }),
  popup: (p) => {
    const id = nextId++;
    set((s) => ({ popups: [...s.popups.slice(-7), { ...p, id }] }));
    later(1100, () => set((s) => ({ popups: s.popups.filter((x) => x.id !== id) })));
  },
  flash: (text, tone = "gold", long = false) => {
    const id = nextId++;
    set({ banner: { id, text, tone, long } });
    later(long ? 3600 : 1500, () => {
      if (get().banner?.id === id) set({ banner: null });
    });
  },
  showPhoto: (p) => {
    const id = nextId++;
    set({ photo: { ...p, id } });
    later(p.isNew ? 5200 : 3200, () => {
      if (get().photo?.id === id) set({ photo: null });
    });
  },
  toastBadges: (ids) => set((s) => ({ badges: [...s.badges, ...ids] })),
  shiftBadge: () => set((s) => ({ badges: s.badges.slice(1) })),
  clear: () => {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    set({ hud: null, popups: [], banner: null, photo: null, badges: [] });
  },
}));
