import { CABINET, CLAW } from "../config";
import { MAX_LEVEL } from "../engine/difficulty";
import type { Rarity } from "../engine/types";
import { AVATARS, type AvatarRule } from "./avatars";
import { LEVELS } from "./levels";
import { PRIZES } from "./prizes";
import { WORLDS, type WorldId } from "./worlds";

/**
 * The slice of the content the API needs to validate grabs and award
 * avatars. `pnpm claw:export-content` writes it to claw-content.json here
 * and into the sibling API repo; content.test.ts fails if the committed
 * copy drifts from the TypeScript source of truth.
 */
export interface ClawContentExport {
  version: number;
  maxLevel: number;
  /** Shortest possible grab cycle (seconds), for server-side cadence checks. */
  minGrabCycleSeconds: number;
  /** Grabs over the goal that still earn three / two stars. */
  stars: { threeWithin: number; twoWithin: number };
  prizes: { id: string; name: string; rarity: Rarity; points: number; unlockLevel: number; mysteryOnly: boolean }[];
  levels: { level: number; world: WorldId; goal: number; toyCount: number }[];
  worlds: { id: WorldId; name: string; from: number; to: number; mysteryPrize: string; avatar: string }[];
  avatars: { id: string; name: string; rarity: Rarity; rule: AvatarRule }[];
}

/** Fastest a grab can resolve: shortest descent to the top of the pile, the grip, and the lift back. */
export function minGrabCycleSeconds(): number {
  const minDrop = CABINET.height - CLAW.fingerLength - CLAW.maxPileTop;
  const cycle = minDrop / CLAW.descendSpeed + CLAW.gripSeconds + minDrop / CLAW.liftSpeed;
  return Math.round(cycle * 100) / 100;
}

export function buildClawContent(): ClawContentExport {
  return {
    version: 1,
    maxLevel: MAX_LEVEL,
    minGrabCycleSeconds: minGrabCycleSeconds(),
    stars: { threeWithin: 1, twoWithin: 3 },
    prizes: PRIZES.map((p) => ({ id: p.id, name: p.name, rarity: p.rarity, points: p.points, unlockLevel: p.unlockLevel, mysteryOnly: p.mysteryOnly === true })),
    levels: LEVELS.map((l) => ({ level: l.level, world: l.world, goal: l.goal, toyCount: l.toyCount })),
    worlds: WORLDS.map((w) => ({ id: w.id, name: w.name, from: w.from, to: w.to, mysteryPrize: w.mysteryPrize, avatar: w.avatar })),
    avatars: AVATARS.map((a) => ({ id: a.id, name: a.name, rarity: a.rarity, rule: a.rule })),
  };
}
