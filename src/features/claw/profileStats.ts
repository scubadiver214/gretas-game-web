import { emptyProfile, type ClawProfile } from "./api";
import { AVATARS } from "./content/avatars";
import { PRIZES } from "./content/prizes";
import { WORLDS, type WorldDef } from "./content/worlds";
import { MAX_LEVEL } from "./engine/difficulty";
import type { MilestoneContext } from "./engine/rewards";

/** Level to open after a clear. Uses the just-beaten level so a stale profile cache cannot pin the player. */
export function nextLevelAfterClear(cleared: number, unlocked: number, max = MAX_LEVEL): number {
  return Math.min(max, Math.max(1, cleared + 1, unlocked));
}

/** Menu picks stay inside what is unlocked. */
export function clampPickedLevel(requested: number, unlocked: number, max = MAX_LEVEL): number {
  return Math.min(max, Math.max(1, Math.min(requested, unlocked)));
}

/** Prefer the on-device mirror when it is ahead of a React Query snapshot that has not refetched yet. */
export function selectClawProfile(server: ClawProfile | undefined, mirrored: ClawProfile | null, nickname: string): ClawProfile {
  if (server && mirrored) return mirrored.currentLevel >= server.currentLevel ? mirrored : server;
  return server ?? mirrored ?? emptyProfile(nickname);
}

/** Everything the avatar rules look at, derived from a profile (same shape the server builds). */
export function milestoneContext(p: ClawProfile): MilestoneContext {
  return {
    successfulGrabs: p.successfulGrabs,
    prizesCollected: p.prizes.reduce((n, x) => n + x.count, 0),
    uniquePrizes: p.prizes.length,
    highestLevelCleared: p.levels.reduce((m, l) => Math.max(m, l.level), 0),
    mysteryWorldsWon: p.mysteryWorldsWon,
  };
}

export interface CollectionStats {
  unique: number;
  total: number;
  /** Prizes that can be collected (every catalog entry, mystery ones included). */
  catalog: number;
  percent: number;
  favorites: number;
}

export function collectionStats(p: ClawProfile): CollectionStats {
  const unique = p.prizes.length;
  const catalog = PRIZES.length;
  return {
    unique,
    total: p.prizes.reduce((n, x) => n + x.count, 0),
    catalog,
    percent: catalog === 0 ? 0 : Math.round((unique / catalog) * 100),
    favorites: p.prizes.filter((x) => x.favorite).length,
  };
}

export interface WorldProgress {
  world: WorldDef;
  /** The player can start at least the world's first level. */
  unlocked: boolean;
  cleared: number;
  stars: number;
  maxStars: number;
  /** The world's last level has been cleared, so its mystery machine is open. */
  mysteryOpen: boolean;
  mysteryWon: boolean;
  /** Level to jump into: the newest unlocked one inside the world. */
  playLevel: number;
}

export function worldProgress(p: ClawProfile): WorldProgress[] {
  return WORLDS.map((world) => {
    const levels = p.levels.filter((l) => l.level >= world.from && l.level <= world.to);
    const size = world.to - world.from + 1;
    return {
      world,
      unlocked: p.currentLevel >= world.from,
      cleared: levels.length,
      stars: levels.reduce((n, l) => n + l.stars, 0),
      maxStars: size * 3,
      mysteryOpen: p.currentLevel > world.to,
      mysteryWon: p.mysteryWorldsWon.includes(world.id),
      playLevel: Math.min(Math.max(world.from, p.currentLevel), world.to),
    };
  });
}

export function avatarCount(p: ClawProfile): { unlocked: number; total: number } {
  return { unlocked: p.avatars.length, total: AVATARS.length };
}
