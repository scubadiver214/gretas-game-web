/**
 * Shop soundtrack. These files live in `public/music` and play on menus,
 * the scoreboard, and the kitchen shift (the kitchen uses the mellow track
 * as a quieter loop). Other rounds still go silent when their countdown starts.
 */

export interface ShopTrack {
  id: string;
  src: string;
  /**
   * Linear playback gain. Measured gated RMS was leveled to about -21.7 dB,
   * the loudness of the hottest file (`out-of-my-head`), which has no headroom
   * left to turn up. Quieter files are boosted and the louder one is trimmed,
   * and every resulting peak stays under about -1 dBFS.
   */
  gain: number;
}

export const SHOP_TRACKS: readonly ShopTrack[] = [
  { id: "chill-mellow", src: "/music/chill-mellow.m4a", gain: 2.54 },
  { id: "astral-pulse", src: "/music/astral-pulse.m4a", gain: 1 },
  { id: "out-of-my-head", src: "/music/out-of-my-head.m4a", gain: 1 },
  { id: "app-recording", src: "/music/app-recording.mp3", gain: 0.64 },
];

/** Looping kitchen bed — the mellow shop track, played quieter in-game. */
export const KITCHEN_BED = SHOP_TRACKS[0];

export type Rng = () => number;

/** A random order of every shop track. `avoidId` is not placed first when another track exists. */
export function shuffleShopTracks(rng: Rng, avoidId?: string | null): ShopTrack[] {
  const items = [...SHOP_TRACKS];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = items[i];
    items[i] = items[j];
    items[j] = swap;
  }
  if (avoidId && items[0]?.id === avoidId && items.length > 1) {
    const first = items.shift();
    if (first) items.push(first);
  }
  return items;
}
