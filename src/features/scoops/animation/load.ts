import { MOTION } from "./motionConfig";

export type LoadBand = "stable" | "stir" | "slide" | "fall" | "overflow";

export interface LoadInput {
  pieceWeight: number;
  sauceCount: number;
  extraWeight: number;
  scoopCount: number;
  topRadius: number;
  serve: "cone" | "cup" | "none";
  melt: number;
}

/** How much this dessert can hold. Melt lowers it. A wider top holds a little more. */
export function toppingCapacity(input: LoadInput): number {
  if (input.scoopCount <= 0) return 1;
  const raw = MOTION.capacityBase + input.scoopCount * MOTION.capacityPerScoop;
  const radius = MOTION.capacityRadiusBase + MOTION.capacityRadius * (input.topRadius / 74);
  const cup = input.serve === "cup" ? MOTION.capacityCup : 0;
  const melt = 1 - Math.min(0.85, Math.max(0, input.melt) * MOTION.capacityMelt);
  return Math.max(0.5, (raw + cup) * radius * melt);
}

export function loadRatio(input: LoadInput): number {
  if (input.scoopCount <= 0) return 0;
  const used = input.pieceWeight + input.sauceCount * MOTION.sauceWeight + input.extraWeight;
  return used / toppingCapacity(input);
}

export function loadBand(ratio: number): LoadBand {
  if (ratio <= MOTION.bandStable) return "stable";
  if (ratio <= MOTION.bandStir) return "stir";
  if (ratio <= MOTION.bandSlide) return "slide";
  if (ratio <= MOTION.bandFall) return "fall";
  return "overflow";
}
