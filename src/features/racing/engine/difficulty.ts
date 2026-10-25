import { clamp01 } from "./math";

/**
 * Difficulty is data. Each tier changes how fast and how well the AI drives,
 * how forgiving collisions are, how much steering help the player gets by
 * default, how many obstacles a track carries and how generous rewards are.
 * Nothing here is rubber-banding: the AI's speed is a fixed fraction of the
 * vehicle's top speed, so skill always matters.
 */
export interface DifficultyConfig {
  tier: number;
  name: string;
  /** AI top speed as a fraction of the vehicle's top speed. */
  aiSpeedMultiplier: number;
  /** 0..1: how close to the grip limit the AI takes corners. */
  aiCorneringSkill: number;
  /** AI slips per minute (a wide line, a late brake). */
  aiMistakeFrequency: number;
  /** 0..1 strength of steering help when the player's assist is on. */
  steeringAssist: number;
  /** 0..1 multiplier on the speed lost in collisions. */
  collisionPenalty: number;
  /** Multiplier on how many obstacles a track carries. */
  obstacleDensity: number;
  rewardMultiplier: number;
  /** Checkpoint gate half-width as a multiple of the road's half-width (>= 1 covers the shoulders too). */
  gateScale: number;
}

export const DIFFICULTY_TIERS: readonly DifficultyConfig[] = [
  { tier: 1, name: "Rookie Racers", aiSpeedMultiplier: 0.7, aiCorneringSkill: 0.45, aiMistakeFrequency: 6, steeringAssist: 0.75, collisionPenalty: 0.35, obstacleDensity: 0.35, rewardMultiplier: 1, gateScale: 1.6 },
  { tier: 2, name: "Speedy Starters", aiSpeedMultiplier: 0.78, aiCorneringSkill: 0.55, aiMistakeFrequency: 4.5, steeringAssist: 0.55, collisionPenalty: 0.5, obstacleDensity: 0.6, rewardMultiplier: 1.15, gateScale: 1.4 },
  { tier: 3, name: "Turbo Racers", aiSpeedMultiplier: 0.86, aiCorneringSkill: 0.68, aiMistakeFrequency: 3, steeringAssist: 0.35, collisionPenalty: 0.7, obstacleDensity: 0.85, rewardMultiplier: 1.35, gateScale: 1.2 },
  { tier: 4, name: "Super Speedsters", aiSpeedMultiplier: 0.93, aiCorneringSkill: 0.8, aiMistakeFrequency: 1.8, steeringAssist: 0.2, collisionPenalty: 0.85, obstacleDensity: 1, rewardMultiplier: 1.6, gateScale: 1.05 },
  { tier: 5, name: "Fitz Champions", aiSpeedMultiplier: 1, aiCorneringSkill: 0.92, aiMistakeFrequency: 0.8, steeringAssist: 0.08, collisionPenalty: 1, obstacleDensity: 1.2, rewardMultiplier: 2, gateScale: 0.95 },
];

export const MAX_TIER = DIFFICULTY_TIERS.length;

export function difficultyFor(tier: number): DifficultyConfig {
  const t = Math.min(MAX_TIER, Math.max(1, Math.round(tier)));
  return DIFFICULTY_TIERS[t - 1];
}

/** How much help the player wants. "off" is the competitive setting. */
export type AssistLevel = "off" | "helper" | "extra";

export const ASSIST_LEVELS: readonly AssistLevel[] = ["off", "helper", "extra"] as const;

export const ASSIST_LABELS: Record<AssistLevel, { name: string; blurb: string }> = {
  off: { name: "Pro", blurb: "No help. Every bump and turn is yours." },
  helper: { name: "Helper", blurb: "Gentle steering help, softer bumps, rescues if you get stuck." },
  extra: { name: "Super helper", blurb: "Steers for you, drives itself and goes easy on every bump." },
};

/** What the player's vehicle actually uses for a race: the tier plus the assist level. */
export interface PlayerTuning {
  /** 0..1 */
  steeringAssist: number;
  /** 0..1 multiplier on collision speed loss. */
  collisionPenalty: number;
  autoAccelerate: boolean;
  /** Teleport back to the last gate after being stuck. */
  autoRecover: boolean;
  /** Multiplier on acceleration (gentler for little ones). */
  accelScale: number;
  gateScale: number;
}

export function playerTuning(tier: number, assist: AssistLevel): PlayerTuning {
  const d = difficultyFor(tier);
  switch (assist) {
    case "off":
      return { steeringAssist: 0, collisionPenalty: d.collisionPenalty, autoAccelerate: false, autoRecover: false, accelScale: 1, gateScale: d.gateScale };
    case "helper":
      return { steeringAssist: d.steeringAssist, collisionPenalty: d.collisionPenalty * 0.7, autoAccelerate: false, autoRecover: true, accelScale: 1, gateScale: d.gateScale * 1.1 };
    case "extra":
      return {
        steeringAssist: clamp01(d.steeringAssist + 0.25),
        collisionPenalty: d.collisionPenalty * 0.45,
        autoAccelerate: true,
        autoRecover: true,
        accelScale: 0.85,
        gateScale: d.gateScale * 1.2,
      };
  }
}
