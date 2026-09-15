/** Deterministic PRNG helpers (mulberry32) so daily challenges are identical for every player. */

export type Rng = () => number;

export function hashString(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRng(seed: string): Rng {
  return mulberry32(hashString(seed));
}

/** Today's challenge key in UTC, e.g. "2026-09-15". Same for everyone worldwide. */
export function dailyKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
