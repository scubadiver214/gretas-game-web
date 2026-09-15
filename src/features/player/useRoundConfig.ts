"use client";

import { useSearchParams } from "next/navigation";
import { dailyKey } from "@/lib/rng";
import { DAILY_LEVEL, levelForRounds } from "./progress";
import { useRoundsPlayed } from "./store";
import type { GameMode } from "./types";

export interface RoundSetup {
  level: number;
  /** Deterministic seed for daily challenges, undefined for normal play. */
  seed?: string;
  challengeDate?: string;
  isDaily: boolean;
}

/** Route `/play/<mode>?daily=1` runs today's seeded challenge at a fixed level. */
export function useRoundSetup(mode: GameMode): RoundSetup {
  const params = useSearchParams();
  const rounds = useRoundsPlayed(mode);
  const isDaily = params.get("daily") === "1";
  if (isDaily) {
    const key = dailyKey();
    return { level: DAILY_LEVEL, seed: `daily:${key}`, challengeDate: key, isDaily: true };
  }
  return { level: levelForRounds(rounds), isDaily: false };
}
