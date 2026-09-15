"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameMode } from "@/features/player/types";
import { getPersonalBests, getTopScores, submitScore, type SubmitScoreRequest } from "./api";

export const scoreKeys = {
  top: (mode: GameMode, limit: number) => ["scores", "top", mode, limit] as const,
  best: (nickname: string) => ["scores", "best", nickname] as const,
};

export function useTopScores(mode: GameMode, limit = 20) {
  return useQuery({
    queryKey: scoreKeys.top(mode, limit),
    queryFn: () => getTopScores(mode, limit),
  });
}

export function usePersonalBests(nickname: string) {
  return useQuery({
    queryKey: scoreKeys.best(nickname),
    queryFn: () => getPersonalBests(nickname),
    enabled: nickname.length > 0,
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
