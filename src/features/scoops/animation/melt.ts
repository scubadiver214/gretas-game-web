import { MOTION } from "./motionConfig";

export type MeltStage = "fresh" | "soft" | "melting" | "super";

/**
 * Smooth melt amount from elapsed seconds since the first scoop.
 * 0 at the start, about 0.16 at 30s, 0.4 at 60s, 0.7 at 120s, and it
 * approaches {@link MOTION.meltCap} without ever reaching 1.
 */
export function meltAmount(elapsedSec: number): number {
  const t = Math.max(0, elapsedSec);
  const knots: readonly (readonly [number, number])[] = [
    [0, 0],
    [30, 0.16],
    [60, 0.4],
    [120, 0.7],
    [240, 0.88],
  ];
  let amount = knots[knots.length - 1][1];
  for (let i = 1; i < knots.length; i++) {
    const [t0, v0] = knots[i - 1];
    const [t1, v1] = knots[i];
    if (t <= t1) {
      const span = t1 - t0;
      const u = span === 0 ? 1 : (t - t0) / span;
      amount = v0 + (v1 - v0) * u;
      break;
    }
  }
  if (t > 240) {
    const creep = 1 - Math.exp(-(t - 240) / 180);
    amount = 0.88 + creep * (MOTION.meltCap - 0.88);
  }
  return Math.min(MOTION.meltCap, amount);
}

/** Stage labels follow the clock, not a rounded visual step. */
export function meltStage(elapsedSec: number): MeltStage {
  const t = Math.max(0, elapsedSec);
  if (t < 30) return "fresh";
  if (t < 60) return "soft";
  if (t < 120) return "melting";
  return "super";
}

export const MELT_STAGES: readonly { id: MeltStage; label: string }[] = [
  { id: "fresh", label: "🍦 Fresh" },
  { id: "soft", label: "☀️ Soft" },
  { id: "melting", label: "💧 Melting" },
  { id: "super", label: "🌊 Super Melty" },
];
