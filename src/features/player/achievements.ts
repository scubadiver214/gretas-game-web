import { MAX_LEVEL } from "./progress";
import type { GameResult, RoundRecord } from "./types";

/** Everything an achievement rule can look at when a round finishes. */
export interface AchievementContext {
  result: GameResult;
  /** History including the round that just finished (newest first). */
  history: readonly RoundRecord[];
  /** Level in the round's mode after this round was counted. */
  levelAfter: number;
  /** Daily-challenge streak after this round. */
  streak: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Rarity drives the badge colour. */
  tier: "bronze" | "silver" | "gold";
  check: (ctx: AchievementContext) => boolean;
}

const m = (ctx: AchievementContext, key: string) => ctx.result.metrics[key] ?? 0;

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // --- getting started -----------------------------------------------------
  { id: "first-round", title: "First slice", description: "Finish your first round.", emoji: "🍕", tier: "bronze", check: (c) => c.history.length >= 1 },
  { id: "both-modes", title: "Double shift", description: "Play both the kitchen and the delivery run.", emoji: "🔁", tier: "bronze", check: (c) => c.history.some((h) => h.mode === "kitchen") && c.history.some((h) => h.mode === "delivery") },
  { id: "ten-rounds", title: "Regular", description: "Finish 10 rounds.", emoji: "🎟️", tier: "silver", check: (c) => c.history.length >= 10 },
  { id: "fifty-rounds", title: "Pizza fanatic", description: "Finish 50 rounds.", emoji: "🏅", tier: "gold", check: (c) => c.history.length >= 50 },

  // --- kitchen -------------------------------------------------------------
  { id: "first-perfect", title: "Golden crust", description: "Bake one perfect pizza.", emoji: "✨", tier: "bronze", check: (c) => c.result.mode === "kitchen" && m(c, "perfectBakes") >= 1 },
  { id: "all-perfect", title: "Master baker", description: "Every pizza in a round baked perfectly.", emoji: "👩‍🍳", tier: "gold", check: (c) => c.result.mode === "kitchen" && m(c, "orders") >= 3 && m(c, "perfectBakes") === m(c, "orders") },
  { id: "no-wrong", title: "Sharp eyes", description: "Finish a kitchen round with no wrong toppings.", emoji: "👀", tier: "silver", check: (c) => c.result.mode === "kitchen" && m(c, "wrong") === 0 && m(c, "abandoned") === 0 && m(c, "orders") >= 3 },
  { id: "speedy-3", title: "Quick hands", description: "Earn three speedy bonuses in one round.", emoji: "⚡", tier: "silver", check: (c) => c.result.mode === "kitchen" && m(c, "speedy") >= 3 },
  { id: "rush-served", title: "Rush hour hero", description: "Serve a rush order with a perfect bake.", emoji: "🔥", tier: "silver", check: (c) => c.result.mode === "kitchen" && m(c, "rushPerfect") >= 1 },
  { id: "kitchen-combo-5", title: "Hot streak", description: "Serve 5 correct pizzas in a row.", emoji: "🌶️", tier: "silver", check: (c) => c.result.mode === "kitchen" && m(c, "bestCombo") >= 5 },
  { id: "kitchen-10", title: "Lunch rush legend", description: "Serve 10 correct pizzas in one shift.", emoji: "🍽️", tier: "gold", check: (c) => c.result.mode === "kitchen" && m(c, "correct") >= 10 },

  // --- delivery ------------------------------------------------------------
  { id: "delivery-10", title: "Paper route", description: "Deliver 10 pizzas in one ride.", emoji: "📬", tier: "bronze", check: (c) => c.result.mode === "delivery" && m(c, "deliveries") >= 10 },
  { id: "delivery-20", title: "Express courier", description: "Deliver 20 pizzas in one ride.", emoji: "🚴", tier: "silver", check: (c) => c.result.mode === "delivery" && m(c, "deliveries") >= 20 },
  { id: "combo-6", title: "On a roll", description: "Reach a 6-delivery combo.", emoji: "🎯", tier: "silver", check: (c) => c.result.mode === "delivery" && m(c, "bestCombo") >= 6 },
  { id: "combo-12", title: "Unstoppable", description: "Reach a 12-delivery combo.", emoji: "💫", tier: "gold", check: (c) => c.result.mode === "delivery" && m(c, "bestCombo") >= 12 },
  { id: "clean-ride", title: "Not a scratch", description: "Finish a ride without a single bump (5+ deliveries).", emoji: "🛡️", tier: "silver", check: (c) => c.result.mode === "delivery" && m(c, "hits") === 0 && m(c, "deliveries") >= 5 },
  { id: "jumper", title: "Hop to it", description: "Jump 10 times in one ride.", emoji: "🦘", tier: "bronze", check: (c) => c.result.mode === "delivery" && m(c, "jumps") >= 10 },
  { id: "powered", title: "Power player", description: "Grab 3 power-ups in one ride.", emoji: "⭐", tier: "bronze", check: (c) => c.result.mode === "delivery" && m(c, "powerUps") >= 3 },

  // --- wordle ----------------------------------------------------------------
  { id: "first-word", title: "Word smart", description: "Guess your first secret word.", emoji: "🔤", tier: "bronze", check: (c) => c.result.mode === "wordle" && m(c, "solved") >= 1 },
  { id: "word-whiz", title: "Word whiz", description: "Guess a word in 2 tries or fewer.", emoji: "🧠", tier: "silver", check: (c) => c.result.mode === "wordle" && m(c, "bestGuesses") > 0 && m(c, "bestGuesses") <= 2 },
  { id: "flawless-round", title: "Flawless round", description: "Solve every word in a round with no hints.", emoji: "🌈", tier: "gold", check: (c) => c.result.mode === "wordle" && m(c, "words") >= 3 && m(c, "solved") === m(c, "words") && m(c, "hints") === 0 },
  { id: "triple-shift", title: "Triple shift", description: "Play the kitchen, delivery and word game.", emoji: "🎪", tier: "silver", check: (c) => ["kitchen", "delivery", "wordle"].every((mode) => c.history.some((h) => h.mode === mode)) },

  // --- frogger ---------------------------------------------------------------
  { id: "first-frog-home", title: "Home sweet pond", description: "Get a frog safely onto a lily pad.", emoji: "🐸", tier: "bronze", check: (c) => c.result.mode === "frogger" && m(c, "homes") >= 1 },
  { id: "frogger-level-3", title: "Pond hopper", description: "Clear level 3 in Frogger Adventure.", emoji: "🪷", tier: "silver", check: (c) => c.result.mode === "frogger" && m(c, "levelsCompleted") >= 3 },
  { id: "frogger-perfect", title: "Not a splash", description: "Clear a Frogger level without losing a life.", emoji: "💚", tier: "gold", check: (c) => c.result.mode === "frogger" && m(c, "perfectLevels") >= 1 },

  // --- claw ------------------------------------------------------------------
  { id: "claw-first", title: "Toy catcher", description: "Win your first claw machine prize.", emoji: "🧸", tier: "bronze", check: (c) => c.result.mode === "claw" && m(c, "successes") >= 1 },
  { id: "claw-clean", title: "Clean sweep", description: "Clear a claw level without a single miss (2+ prizes).", emoji: "🎯", tier: "silver", check: (c) => c.result.mode === "claw" && m(c, "misses") === 0 && m(c, "successes") >= 2 },
  { id: "claw-level-10", title: "Toy Box champion", description: "Clear level 10 of the claw arcade.", emoji: "🎪", tier: "gold", check: (c) => c.result.mode === "claw" && m(c, "mystery") === 0 && c.result.level >= 10 && c.result.stars >= 1 },
  { id: "claw-mystery", title: "Mystery solved", description: "Win a mystery machine prize.", emoji: "🎁", tier: "gold", check: (c) => c.result.mode === "claw" && m(c, "mystery") >= 1 && m(c, "successes") >= 1 },

  // --- progression ---------------------------------------------------------
  { id: "three-stars", title: "Three stars", description: "Earn a three-star round.", emoji: "🌟", tier: "bronze", check: (c) => c.result.stars >= 3 },
  { id: "kitchen-legend", title: "Kitchen legend", description: "Reach level 5 in the kitchen.", emoji: "🏆", tier: "gold", check: (c) => c.result.mode === "kitchen" && c.levelAfter >= MAX_LEVEL },
  { id: "delivery-legend", title: "Delivery legend", description: "Reach level 5 on the bike.", emoji: "🏆", tier: "gold", check: (c) => c.result.mode === "delivery" && c.levelAfter >= MAX_LEVEL },
  { id: "wordle-legend", title: "Word legend", description: "Reach level 5 in the word game.", emoji: "🏆", tier: "gold", check: (c) => c.result.mode === "wordle" && c.levelAfter >= MAX_LEVEL },
  { id: "daily-1", title: "Challenger", description: "Play a daily challenge.", emoji: "📅", tier: "bronze", check: (c) => !!c.result.challengeDate },
  { id: "streak-3", title: "Three-day streak", description: "Play the daily challenge three days running.", emoji: "🔥", tier: "silver", check: (c) => c.streak >= 3 },
  { id: "streak-7", title: "Week of pizza", description: "Play the daily challenge seven days running.", emoji: "🗓️", tier: "gold", check: (c) => c.streak >= 7 },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Ids of achievements newly earned by this round (excluding already-unlocked ones). */
export function evaluateAchievements(ctx: AchievementContext, unlocked: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id]) continue;
    try {
      if (a.check(ctx)) out.push(a.id);
    } catch {
      // a broken rule must never block the results screen
    }
  }
  return out;
}
