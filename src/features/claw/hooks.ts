"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CharacterId } from "@/features/player/types";
import { emptyProfile, getProfile, selectAvatar, setFavorite, type ClawProfile } from "./api";
import { useClawMirror } from "./mirror";
import { flushClawOutbox, useClawOutbox } from "./outbox";

export const clawKeys = {
  all: ["claw"] as const,
  profile: (nickname: string) => [...clawKeys.all, "profile", nickname] as const,
};

/**
 * The player's claw profile: the server copy when reachable, otherwise the
 * last copy mirrored on this device. `offline` is true when neither the
 * network nor the mirror could answer.
 */
export function useClawProfile(nickname: string): { profile: ClawProfile; loading: boolean; offline: boolean; refetch: () => void } {
  const mirrored = useClawMirror((s) => (s.nickname === nickname ? s.profile : null));
  const applyProfile = useClawMirror((s) => s.applyProfile);
  const query = useQuery({
    queryKey: clawKeys.profile(nickname),
    queryFn: () => getProfile(nickname),
    enabled: nickname.length > 0,
    staleTime: 10_000,
  });
  useEffect(() => {
    if (query.data) applyProfile(nickname, query.data);
  }, [query.data, nickname, applyProfile]);
  const profile = query.data ?? mirrored ?? emptyProfile(nickname);
  return { profile, loading: query.isPending && !mirrored, offline: query.isError && !query.data, refetch: () => void query.refetch() };
}

export function useSelectAvatar(nickname: string) {
  const qc = useQueryClient();
  const applyAvatar = useClawMirror((s) => s.applyAvatar);
  return useMutation({
    mutationFn: (body: { character: CharacterId; color?: string; avatarId: string }) => selectAvatar(nickname, body),
    onMutate: ({ avatarId }) => applyAvatar(nickname, avatarId),
    onSuccess: (profile) => qc.setQueryData(clawKeys.profile(nickname), profile),
    onError: () => void qc.invalidateQueries({ queryKey: clawKeys.profile(nickname) }),
  });
}

export function useSetFavorite(nickname: string) {
  const qc = useQueryClient();
  const applyFavorite = useClawMirror((s) => s.applyFavorite);
  return useMutation({
    mutationFn: ({ prizeId, favorite }: { prizeId: string; favorite: boolean }) => setFavorite(nickname, prizeId, favorite),
    onMutate: ({ prizeId, favorite }) => {
      applyFavorite(nickname, prizeId, favorite);
      qc.setQueryData<ClawProfile>(clawKeys.profile(nickname), (p) => (p ? { ...p, prizes: p.prizes.map((x) => (x.prizeId === prizeId ? { ...x, favorite } : x)) } : p));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: clawKeys.profile(nickname) }),
  });
}

/**
 * Keeps the outbox draining: on mount, whenever the browser comes back
 * online, and every 20 seconds while anything is queued. Returns the count.
 */
export function useClawOutboxFlusher(nickname: string): number {
  const qc = useQueryClient();
  const pending = useClawOutbox((s) => s.items.length);
  const hasPending = pending > 0;
  useEffect(() => {
    let cancelled = false;
    const flush = async () => {
      const before = useClawOutbox.getState().items.length;
      if (before === 0) return;
      const out = await flushClawOutbox();
      if (!cancelled && out.sent.length > 0) void qc.invalidateQueries({ queryKey: clawKeys.profile(nickname) });
    };
    void flush();
    window.addEventListener("online", flush);
    const timer = window.setInterval(flush, 20_000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
      window.clearInterval(timer);
    };
  }, [qc, nickname, hasPending]);
  return pending;
}
