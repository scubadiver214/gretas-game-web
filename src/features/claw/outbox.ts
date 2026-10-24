"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ApiError } from "@/features/scores/api";
import { completeAttempt, recordGrab, type CompleteAttemptResponse, type RecordGrabResponse } from "./api";

/**
 * Pending claw writes. Every grab and level completion is queued here first
 * and sent in order; the server treats repeats as no-ops, so a flaky network
 * or a closed tab never loses a toy. Items that the server rejects outright
 * (bad request, someone else's attempt, expired) are dropped - retrying them
 * would never succeed.
 */

export type OutboxItem =
  | { id: string; kind: "grab"; attemptId: string; nickname: string; seq: number; prizeId: string | null; succeeded: boolean; elapsedSeconds: number }
  | { id: string; kind: "complete"; attemptId: string; nickname: string; durationSeconds: number };

export type OutboxResult = { kind: "grab"; item: Extract<OutboxItem, { kind: "grab" }>; response: RecordGrabResponse } | { kind: "complete"; item: Extract<OutboxItem, { kind: "complete" }>; response: CompleteAttemptResponse };

/** Rejections that will never succeed on retry. Network errors, 429 and 5xx keep the item. */
export function shouldDrop(status: number | null): boolean {
  return status !== null && status >= 400 && status < 500 && status !== 429 && status !== 408;
}

export function statusOf(err: unknown): number | null {
  return err instanceof ApiError ? err.status : null;
}

export interface Sender {
  grab(item: Extract<OutboxItem, { kind: "grab" }>): Promise<RecordGrabResponse>;
  complete(item: Extract<OutboxItem, { kind: "complete" }>): Promise<CompleteAttemptResponse>;
}

export interface FlushOutcome {
  sent: OutboxResult[];
  dropped: OutboxItem[];
  /** True when sending stopped on a retryable failure; the rest stays queued. */
  blocked: boolean;
}

/**
 * Sends items in order. Stops at the first retryable failure so later items
 * (which depend on earlier grab numbers) are never sent out of sequence.
 */
export async function flushItems(items: readonly OutboxItem[], sender: Sender): Promise<FlushOutcome> {
  const sent: OutboxResult[] = [];
  const dropped: OutboxItem[] = [];
  for (const item of items) {
    try {
      if (item.kind === "grab") sent.push({ kind: "grab", item, response: await sender.grab(item) });
      else sent.push({ kind: "complete", item, response: await sender.complete(item) });
    } catch (err) {
      if (shouldDrop(statusOf(err))) {
        console.warn("[claw] dropping unrecoverable write", item.kind, statusOf(err), err);
        dropped.push(item);
        continue;
      }
      return { sent, dropped, blocked: true };
    }
  }
  return { sent, dropped, blocked: false };
}

interface OutboxState {
  items: OutboxItem[];
  enqueue: (item: OutboxItem) => void;
  remove: (ids: readonly string[]) => void;
}

export const useClawOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      items: [],
      enqueue: (item) => set((s) => ({ items: [...s.items, item] })),
      remove: (ids) => set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) })),
    }),
    {
      name: "gretas-game:claw-outbox",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => ({ items: s.items }) as OutboxState,
    },
  ),
);

const liveSender: Sender = {
  grab: (i) => recordGrab(i.attemptId, { nickname: i.nickname, seq: i.seq, prizeId: i.prizeId, succeeded: i.succeeded, elapsedSeconds: i.elapsedSeconds }),
  complete: (i) => completeAttempt(i.attemptId, { nickname: i.nickname, durationSeconds: i.durationSeconds }),
};

/** Callers waiting on a specific item (the celebration card wants the grab's response). */
const waiters = new Map<string, { resolve: (r: OutboxResult) => void; reject: (reason: unknown) => void }>();
let flushing: Promise<FlushOutcome> | null = null;
let seq = 0;

export function newOutboxId(): string {
  return `${Date.now().toString(36)}-${(seq++).toString(36)}`;
}

/** Queues a write and resolves with the server's answer once it has been sent (rejects if it is dropped). */
export function enqueueClawWrite(item: OutboxItem): Promise<OutboxResult> {
  const promise = new Promise<OutboxResult>((resolve, reject) => waiters.set(item.id, { resolve, reject }));
  // Avoid unhandled-rejection noise for callers that do not care about the answer.
  promise.catch(() => undefined);
  useClawOutbox.getState().enqueue(item);
  void flushClawOutbox();
  return promise;
}

/** Sends everything queued, one flush at a time. Safe to call often. */
export function flushClawOutbox(sender: Sender = liveSender): Promise<FlushOutcome> {
  if (flushing) return flushing;
  flushing = (async () => {
    const items = useClawOutbox.getState().items;
    if (items.length === 0) return { sent: [], dropped: [], blocked: false };
    const outcome = await flushItems(items, sender);
    useClawOutbox.getState().remove([...outcome.sent.map((s) => s.item.id), ...outcome.dropped.map((d) => d.id)]);
    for (const s of outcome.sent) {
      waiters.get(s.item.id)?.resolve(s);
      waiters.delete(s.item.id);
    }
    for (const d of outcome.dropped) {
      waiters.get(d.id)?.reject(new Error(`dropped ${d.kind}`));
      waiters.delete(d.id);
    }
    return outcome;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function pendingClawWrites(): number {
  return useClawOutbox.getState().items.length;
}
