"use client";

import type confettiFn from "canvas-confetti";
import { useSettingsStore } from "@/features/settings/store";
import { playSound, unlockAudio, type SoundId } from "./audio";
import { vibrate, type HapticId } from "./haptics";

function fire(sound: SoundId, haptic?: HapticId) {
  const { soundOn, hapticsOn } = useSettingsStore.getState();
  if (soundOn) playSound(sound);
  if (hapticsOn && haptic) vibrate(haptic);
}

/** Game feedback: one call per gameplay event, respects the player's settings. */
export const fx = {
  tap: () => fire("tap", "light"),
  good: () => fire("good", "light"),
  great: () => fire("great", "success"),
  bad: () => fire("bad", "error"),
  whoosh: () => fire("whoosh"),
  tick: () => fire("tick"),
  go: () => fire("go", "heavy"),
  fanfare: () => fire("fanfare", "success"),
  /** Call from a user gesture (e.g. the Start button) so iOS allows audio. */
  unlock: () => unlockAudio(),
};

let confettiPromise: Promise<typeof confettiFn> | null = null;

/** Fire a celebratory confetti burst; bigger when `big` is set (new personal best). */
export async function celebrate(big = false): Promise<void> {
  if (typeof window === "undefined") return;
  confettiPromise ??= import("canvas-confetti").then((m) => m.default);
  const confetti = await confettiPromise;
  const colors = ["#F2542D", "#FDE68A", "#3FA34D", "#0E9594", "#E85D9A", "#3B82F6"];
  confetti({ particleCount: big ? 160 : 90, spread: 75, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  if (big) {
    setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400);
  }
}
