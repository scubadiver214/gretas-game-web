import { MAX_LEVEL, difficultyFor, tierFor, type Tier } from "../engine/difficulty";
import type { LevelSetup } from "../engine/types";
import { PRIZE_BY_ID, prizesUnlockedAt } from "./prizes";
import { WORLD_BY_ID, worldFor, type WorldId } from "./worlds";

export interface LevelDef extends LevelSetup {
  world: WorldId;
  tier: Tier["id"];
  title: string;
}

/** Prizes to deliver before a level is cleared. */
export function goalFor(level: number): number {
  if (level <= 3) return 1;
  if (level <= 10) return 2;
  if (level <= 30) return 3;
  return 4;
}

/**
 * Every machine moves in 3D: left/right across the cabinet and up/down to the
 * back and front. The engine still supports simple left/right machines
 * (`depthControl: false`) if a special level ever wants one.
 */
export const DEPTH_FROM_LEVEL = 1;

export function hasDepthControl(level: number): boolean {
  return level >= DEPTH_FROM_LEVEL;
}

/** Hand-tuned tweaks on top of the curve. */
const OVERRIDES: Partial<Record<number, Partial<Pick<LevelSetup, "toyCount" | "goal">>>> = {};

export function levelDef(level: number): LevelDef {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
  const world = worldFor(l);
  const curve = difficultyFor(l);
  const unlocked = world.prizes.map((id) => PRIZE_BY_ID[id]).filter((p) => p && !p.mysteryOnly && p.unlockLevel <= l);
  const pool = (unlocked.length >= 3 ? unlocked : prizesUnlockedAt(l)).map((p) => p.id);
  const override = OVERRIDES[l] ?? {};
  return {
    level: l,
    world: world.id,
    tier: tierFor(l).id,
    title: `Level ${l}`,
    goal: override.goal ?? goalFor(l),
    toyCount: override.toyCount ?? curve.toyCount,
    pool,
    difficulty: {
      clawSpeed: curve.clawSpeed,
      gripStrength: curve.gripStrength,
      alignTolerance: curve.alignTolerance,
      slipChance: curve.slipChance,
      crowding: curve.crowding,
    },
    depthControl: hasDepthControl(l),
  };
}

export const LEVELS: readonly LevelDef[] = Array.from({ length: MAX_LEVEL }, (_, i) => levelDef(i + 1));

/**
 * A world's mystery machine: one legendary prize on a pedestal and a claw
 * that sweeps on its own. GRAB stops it; only alignment matters, there is
 * no slip and the grip is strong, so a well-timed press always wins.
 */
export function mysterySetup(worldId: WorldId): LevelSetup {
  const world = WORLD_BY_ID[worldId];
  return {
    level: world.to,
    goal: 1,
    toyCount: 1,
    pool: [world.mysteryPrize],
    difficulty: { clawSpeed: 0, gripStrength: 1.4, alignTolerance: 0.3, slipChance: 0, crowding: 0 },
    depthControl: false,
    mystery: true,
  };
}
