import { buildTrackContent, type TrackContent } from "./content";
import { Track, type TrackDefinition } from "./track";
import { SUNNY_SUMMIT_SPRINT } from "./tracks/alpine";
import { BREEZY_BEACH_BLAST } from "./tracks/beach";
import { DUSTY_DESERT_DASH } from "./tracks/desert";
import { JUNGLE_ROAR_RALLY } from "./tracks/jungle";
import { FROSTY_FLURRY_RUN } from "./tracks/winter";

/** Every track in the game, in play order (easiest first). All of them are open from the start. */
export const TRACKS: readonly TrackDefinition[] = [DUSTY_DESERT_DASH, FROSTY_FLURRY_RUN, SUNNY_SUMMIT_SPRINT, BREEZY_BEACH_BLAST, JUNGLE_ROAR_RALLY];

/** The track with this id, or the first one if it is unknown (a stale saved choice). */
export function trackById(id: string | null | undefined): TrackDefinition {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export interface RacingWorld {
  track: Track;
  content: TrackContent;
}

const cache = new Map<string, RacingWorld>();

/**
 * Builds (once) the runtime track and everything placed on it. Pure and
 * deterministic, so the engine and renderer share one copy and a retry or a
 * hot reload never rebuilds it.
 */
export function loadWorld(def: TrackDefinition): RacingWorld {
  let world = cache.get(def.id);
  if (!world) {
    const track = new Track(def);
    world = { track, content: buildTrackContent(track) };
    cache.set(def.id, world);
  }
  return world;
}
