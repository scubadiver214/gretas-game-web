import { POINTS, levelStars } from "../config";
import { AVATARS, type AvatarDef, type AvatarRule } from "../content/avatars";
import type { WorldId } from "../content/worlds";
import type { Rarity } from "./types";

export { levelStars };

export function pointsFor(rarity: Rarity): number {
  return POINTS[rarity];
}

/** Everything an avatar rule can look at. The server builds the same shape from its tables. */
export interface MilestoneContext {
  successfulGrabs: number;
  /** Total prizes delivered (duplicates count). */
  prizesCollected: number;
  /** Distinct prize ids collected. */
  uniquePrizes: number;
  highestLevelCleared: number;
  mysteryWorldsWon: readonly WorldId[];
}

export function meetsRule(rule: AvatarRule, ctx: MilestoneContext): boolean {
  switch (rule.kind) {
    case "firstGrab":
      return ctx.successfulGrabs >= 1;
    case "prizesCollected":
      return ctx.prizesCollected >= rule.count;
    case "uniquePrizes":
      return ctx.uniquePrizes >= rule.count;
    case "levelCleared":
      return ctx.highestLevelCleared >= rule.level;
    case "worldMystery":
      return ctx.mysteryWorldsWon.includes(rule.world);
    default:
      return false;
  }
}

/** Ids of avatars newly earned (excluding already-unlocked ones), in catalog order. */
export function evaluateMilestones(ctx: MilestoneContext, unlocked: Iterable<string>): string[] {
  const have = new Set(unlocked);
  return AVATARS.filter((a) => !have.has(a.id) && meetsRule(a.rule, ctx)).map((a) => a.id);
}

/** 0..1 progress towards a rule, for the "next avatar" preview. */
export function ruleProgress(rule: AvatarRule, ctx: MilestoneContext): { current: number; target: number } {
  switch (rule.kind) {
    case "firstGrab":
      return { current: Math.min(1, ctx.successfulGrabs), target: 1 };
    case "prizesCollected":
      return { current: Math.min(rule.count, ctx.prizesCollected), target: rule.count };
    case "uniquePrizes":
      return { current: Math.min(rule.count, ctx.uniquePrizes), target: rule.count };
    case "levelCleared":
      return { current: Math.min(rule.level, ctx.highestLevelCleared), target: rule.level };
    case "worldMystery":
      return { current: ctx.mysteryWorldsWon.includes(rule.world) ? 1 : 0, target: 1 };
    default:
      return { current: 0, target: 1 };
  }
}

/** The locked avatar the player is closest to, by fraction of its rule completed. */
export function nextAvatar(ctx: MilestoneContext, unlocked: Iterable<string>): { avatar: AvatarDef; current: number; target: number } | null {
  const have = new Set(unlocked);
  let best: { avatar: AvatarDef; current: number; target: number; frac: number } | null = null;
  for (const avatar of AVATARS) {
    if (have.has(avatar.id)) continue;
    const p = ruleProgress(avatar.rule, ctx);
    const frac = p.target === 0 ? 0 : p.current / p.target;
    // Prefer the most complete rule; break ties by catalog order (earlier = easier).
    if (!best || frac > best.frac) best = { avatar, ...p, frac };
  }
  return best ? { avatar: best.avatar, current: best.current, target: best.target } : null;
}
