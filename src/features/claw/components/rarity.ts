import { N } from "@/design/neon";
import type { Rarity } from "../engine/types";

/** Neon accent per rarity tier, used for chips, glows and shelf frames. */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: N.delivery,
  uncommon: N.brand,
  rare: N.wordle,
  legendary: N.sun,
};
