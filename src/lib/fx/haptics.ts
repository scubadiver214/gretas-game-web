"use client";

export type HapticId = "light" | "success" | "error" | "heavy";

const PATTERNS: Record<HapticId, number | number[]> = {
  light: 10,
  success: [12, 40, 18],
  error: [40, 30, 40],
  heavy: 60,
};

/** Vibrate where supported (Android Chrome; iOS Safari ignores it). */
export function vibrate(id: HapticId): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[id]);
  } catch {
    // ignore
  }
}
