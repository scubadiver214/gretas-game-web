"use client";

/**
 * "Game feel" state shared between the DOM HUD and the three.js scenes:
 * floating score popups, camera shake, hit-stop and screen flashes. Scenes
 * read the non-reactive parts inside useFrame via useJuice.getState().
 */

import { create } from "zustand";
import { useSettingsStore } from "@/features/settings/store";

export type PopupTone = "good" | "great" | "bad" | "neutral";

export interface Popup {
  id: number;
  text: string;
  tone: PopupTone;
  /** Screen position as fractions of the viewport (0..1). */
  x: number;
  y: number;
  /** Bigger text for big moments. */
  big?: boolean;
}

interface JuiceState {
  popups: Popup[];
  /** Current shake amplitude (world units), decays every frame in the scene. */
  shake: number;
  /** performance.now() until which the simulation should freeze. */
  frozenUntil: number;
  flash: { id: number; color: string } | null;
  popup: (text: string, tone: PopupTone, at?: { x: number; y: number }, big?: boolean) => void;
  shakeCamera: (amount: number) => void;
  hitStop: (ms: number) => void;
  flashScreen: (color: string) => void;
  /** Called by the scene each frame to decay the shake. */
  decayShake: (dt: number) => void;
  clear: () => void;
}

let seq = 0;
const POPUP_LIFETIME_MS = 950;
const MAX_POPUPS = 8;

export const useJuice = create<JuiceState>()((set, get) => ({
  popups: [],
  shake: 0,
  frozenUntil: 0,
  flash: null,

  popup: (text, tone, at, big) => {
    const id = ++seq;
    const jitter = () => (Math.random() - 0.5) * 0.06;
    const p: Popup = { id, text, tone, x: (at?.x ?? 0.5) + jitter(), y: (at?.y ?? 0.4) + jitter(), big };
    set((s) => ({ popups: [...s.popups.slice(-(MAX_POPUPS - 1)), p] }));
    setTimeout(() => set((s) => ({ popups: s.popups.filter((q) => q.id !== id) })), POPUP_LIFETIME_MS);
  },

  shakeCamera: (amount) => {
    if (useSettingsStore.getState().reducedMotion) return;
    set((s) => ({ shake: Math.min(0.6, Math.max(s.shake, amount)) }));
  },

  hitStop: (ms) => {
    if (useSettingsStore.getState().reducedMotion) return;
    set({ frozenUntil: Math.max(get().frozenUntil, performance.now() + ms) });
  },

  flashScreen: (color) => {
    if (useSettingsStore.getState().reducedMotion) return;
    set({ flash: { id: ++seq, color } });
  },

  decayShake: (dt) => {
    const s = get().shake;
    if (s <= 0) return;
    const next = s * Math.pow(0.02, dt);
    set({ shake: next < 0.004 ? 0 : next });
  },

  clear: () => set({ popups: [], shake: 0, frozenUntil: 0, flash: null }),
}));

/** True while a hit-stop freeze is active (call inside useFrame). */
export function isFrozen(): boolean {
  return performance.now() < useJuice.getState().frozenUntil;
}

/** Random offset for the camera this frame, scaled by the current shake amplitude. */
export function shakeOffset(): [number, number] {
  const a = useJuice.getState().shake;
  if (a <= 0) return [0, 0];
  return [(Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a * 0.6];
}
