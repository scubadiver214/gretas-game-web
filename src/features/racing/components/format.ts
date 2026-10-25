import type { RaceEngine } from "../engine/RaceEngine";

/** The race clock the way the reference shows it: `00 : 11:088`. */
export function formatClock(seconds: number): string {
  // Whole milliseconds first: `11.088 % 1` is 0.0879999..., which would show 087.
  const totalMs = Math.floor(Math.max(0, seconds) * 1000 + 1e-6);
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 60000);
  return `${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}:${String(ms).padStart(3, "0")}`;
}

/** A plain time for the results card: `1:07.42`. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// Stable readers for LiveText.
export const readClock = (e: RaceEngine): string => formatClock(e.playerTime);
export const readSpeed = (e: RaceEngine): string => `${e.speedMph} MPH`;
