import { describe, expect, it } from "vitest";
import { KITCHEN_BED, SHOP_TRACKS, shuffleShopTracks } from "./shopTracks";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("shuffleShopTracks", () => {
  it("uses each soundtrack file once", () => {
    const order = shuffleShopTracks(seeded(7));
    expect(order.map((track) => track.id).sort()).toEqual(SHOP_TRACKS.map((track) => track.id).sort());
    expect(new Set(order.map((track) => track.src)).size).toBe(SHOP_TRACKS.length);
  });

  it("does not open with the track that just finished", () => {
    const avoid = SHOP_TRACKS[0].id;
    for (let seed = 1; seed <= 20; seed++) {
      expect(shuffleShopTracks(seeded(seed), avoid)[0]?.id).not.toBe(avoid);
    }
  });

  it("levels the quiet track up and the loud track down", () => {
    const gain = Object.fromEntries(SHOP_TRACKS.map((track) => [track.id, track.gain]));
    expect(gain["chill-mellow"]).toBeGreaterThan(1);
    expect(gain["app-recording"]).toBeLessThan(1);
    expect(gain["astral-pulse"]).toBe(1);
    expect(gain["out-of-my-head"]).toBe(1);
  });

  it("is deterministic for the same seed", () => {
    expect(shuffleShopTracks(seeded(4)).map((track) => track.id)).toEqual(shuffleShopTracks(seeded(4)).map((track) => track.id));
  });
});

describe("KITCHEN_BED", () => {
  it("loops the mellow shop track so the kitchen bed stays quiet and familiar", () => {
    expect(KITCHEN_BED.id).toBe("chill-mellow");
    expect(KITCHEN_BED.src).toBe("/music/chill-mellow.m4a");
  });
});
