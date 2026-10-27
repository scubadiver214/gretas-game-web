"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scoreKeys } from "@/features/scores/hooks";
import { completeSession, getHistory, getStats, type CompleteSessionRequest } from "./api";

export const froggerKeys = {
  all: ["frogger"] as const,
  stats: (nickname: string) => [...froggerKeys.all, "stats", nickname] as const,
  history: (nickname: string, limit: number) => [...froggerKeys.all, "history", nickname, limit] as const,
};

export function useFroggerStats(nickname: string) {
  return useQuery({
    queryKey: froggerKeys.stats(nickname),
    queryFn: () => getStats(nickname),
    enabled: nickname.length > 0,
    meta: { background: true },
  });
}

export function useFroggerHistory(nickname: string, limit = 20) {
  return useQuery({
    queryKey: froggerKeys.history(nickname, limit),
    queryFn: () => getHistory(nickname, limit),
    enabled: nickname.length > 0,
    meta: { background: true },
  });
}

export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, body }: { sessionId: string; body: CompleteSessionRequest }) => completeSession(sessionId, body),
    onSuccess: (_data, { body }) => {
      void qc.invalidateQueries({ queryKey: ["scores", "top", "frogger"] });
      void qc.invalidateQueries({ queryKey: scoreKeys.best(body.nickname) });
      void qc.invalidateQueries({ queryKey: [...froggerKeys.all] });
    },
  });
}
