import { describe, expect, it } from "vitest";
import { ApiError } from "@/features/scores/api";
import type { CompleteAttemptResponse, RecordGrabResponse } from "./api";
import { flushItems, shouldDrop, type OutboxItem, type Sender } from "./outbox";

const grab = (seq: number, id = `g${seq}`): OutboxItem => ({ id, kind: "grab", attemptId: "a", nickname: "Greta", seq, prizeId: "teddy-brown", succeeded: true, elapsedSeconds: seq * 3 });
const complete: OutboxItem = { id: "c", kind: "complete", attemptId: "a", nickname: "Greta", durationSeconds: 30 };
const grabOk: RecordGrabResponse = { succeeded: true, prizeId: "teddy-brown", count: 1, points: 10, totalPoints: 10, newAvatars: [] };
const completeOk: CompleteAttemptResponse = { stars: 3, cleared: true, currentLevel: 2, newAvatars: [], mysteryUnlocked: null };

function sender(fail: Record<string, unknown> = {}): Sender & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    grab: async (i) => {
      calls.push(i.id);
      if (i.id in fail) throw fail[i.id];
      return grabOk;
    },
    complete: async (i) => {
      calls.push(i.id);
      if (i.id in fail) throw fail[i.id];
      return completeOk;
    },
  };
}

describe("shouldDrop", () => {
  it("drops client errors the server will never accept, keeps network errors, 429 and 5xx", () => {
    for (const s of [400, 403, 404, 409, 410]) expect(shouldDrop(s)).toBe(true);
    for (const s of [null, 408, 429, 500, 502, 503]) expect(shouldDrop(s)).toBe(false);
  });
});

describe("flushItems", () => {
  it("sends everything in order and reports the responses", async () => {
    const s = sender();
    const out = await flushItems([grab(1), grab(2), complete], s);
    expect(s.calls).toEqual(["g1", "g2", "c"]);
    expect(out.sent.map((r) => r.item.id)).toEqual(["g1", "g2", "c"]);
    expect(out.blocked).toBe(false);
    expect(out.dropped).toEqual([]);
  });

  it("stops at a network failure so later grabs are never sent out of sequence", async () => {
    const s = sender({ g2: new TypeError("Failed to fetch") });
    const out = await flushItems([grab(1), grab(2), complete], s);
    expect(s.calls).toEqual(["g1", "g2"]);
    expect(out.sent.map((r) => r.item.id)).toEqual(["g1"]);
    expect(out.blocked).toBe(true);
  });

  it("stops on a 5xx too", async () => {
    const s = sender({ g1: new ApiError(503, "down") });
    const out = await flushItems([grab(1), complete], s);
    expect(out.sent).toEqual([]);
    expect(out.blocked).toBe(true);
    expect(out.dropped).toEqual([]);
  });

  it("drops unrecoverable rejections and carries on", async () => {
    const s = sender({ g1: new ApiError(409, "conflict") });
    const out = await flushItems([grab(1), grab(2), complete], s);
    expect(out.dropped.map((d) => d.id)).toEqual(["g1"]);
    expect(out.sent.map((r) => r.item.id)).toEqual(["g2", "c"]);
    expect(out.blocked).toBe(false);
  });
});
