"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameMode } from "@/features/player/types";
import { getPersonalBests, getTopScores, submitScore, type SubmitScoreRequest } from "./api";

export const scoreKeys = {
  top: (mode: GameMode, limit: number, date?: string) => ["scores", "top", mode, date ?? "all", limit] as const,
  best: (nickname: string) => ["scores", "best", nickname] as const,
};

/** Top scores for a mode; pass a UTC date key for that day's daily-challenge board. */
export function useTopScores(mode: GameMode, limit = 20, date?: string) {
  return useQuery({
    queryKey: scoreKeys.top(mode, limit, date),
    queryFn: () => getTopScores(mode, limit, date),
    meta: { background: true },
  });
}

export function usePersonalBests(nickname: string) {
  return useQuery({
    queryKey: scoreKeys.best(nickname),
    queryFn: () => getPersonalBests(nickname),
    enabled: nickname.length > 0,
    meta: { background: true },
  });
}

export function useSubmitScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitScoreRequest) => submitScore(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["scores", "top", vars.mode] });
      void qc.invalidateQueries({ queryKey: scoreKeys.best(vars.nickname) });
    },
  });
}
