export type CharacterId = "boy" | "girl";

export type GameMode = "kitchen" | "delivery" | "wordle" | "frogger" | "claw";

/** Modes with a public leaderboard (the claw arcade keeps its progress private: no scoreboard). */
export const GAME_MODES: readonly GameMode[] = ["kitchen", "delivery", "wordle", "frogger"] as const;

export const MODE_LABELS: Record<GameMode, string> = {
  kitchen: "Pizza Kitchen",
  delivery: "Bike Delivery",
  wordle: "Word Quest",
  frogger: "Frogger Adventure",
  claw: "Bea's Claw-some Adventure",
};

/** One-word labels for tabs and small buttons. */
export const MODE_SHORT_LABELS: Record<GameMode, string> = {
  kitchen: "Kitchen",
  delivery: "Delivery",
  wordle: "Words",
  frogger: "Frogger",
  claw: "Claw",
};

export const MODE_EMOJI: Record<GameMode, string> = {
  kitchen: "🍕",
  delivery: "🛵",
  wordle: "🔤",
  frogger: "🐸",
  claw: "🧸",
};

export const CHARACTER_LABELS: Record<CharacterId, string> = {
  boy: "Max",
  girl: "Greta",
};

/** Outfit colours players can pick; also used as their avatar colour on the scoreboard. */
export const PLAYER_COLORS: readonly { id: string; label: string }[] = [
  { id: "#F2542D", label: "Tomato" },
  { id: "#E85D9A", label: "Bubblegum" },
  { id: "#7C3AED", label: "Grape" },
  { id: "#3B82F6", label: "Sky" },
  { id: "#0E9594", label: "Teal" },
  { id: "#3FA34D", label: "Lime" },
  { id: "#F2B134", label: "Sunshine" },
  { id: "#2B2D42", label: "Midnight" },
] as const;

export const DEFAULT_COLOR: Record<CharacterId, string> = {
  boy: "#2B2D42",
  girl: "#2B2D42",
};

/** Defaults from before the fantasy restyle, so old saves can follow the new look. */
export const LEGACY_DEFAULT_COLOR: Record<CharacterId, string> = {
  boy: "#3B82F6",
  girl: "#E85D9A",
};

export function isPlayerColor(value: string | null | undefined): value is string {
  return !!value && PLAYER_COLORS.some((c) => c.id === value);
}

/** Hair colours players can pick on the character screen. */
export const HAIR_COLORS: readonly { id: string; label: string }[] = [
  { id: "#E6E8EE", label: "Snow" },
  { id: "#1B1712", label: "Black" },
  { id: "#5A3A1B", label: "Brown" },
  { id: "#8C5A2B", label: "Chestnut" },
  { id: "#F2B134", label: "Blonde" },
  { id: "#C0392B", label: "Ginger" },
  { id: "#EADCC8", label: "Platinum" },
  { id: "#E85D9A", label: "Bubblegum" },
  { id: "#3B82F6", label: "Blueberry" },
] as const;

export const DEFAULT_HAIR_COLOR: Record<CharacterId, string> = {
  boy: "#E6E8EE",
  girl: "#E6E8EE",
};

export const LEGACY_DEFAULT_HAIR_COLOR: Record<CharacterId, string> = {
  boy: "#5A3A1B",
  girl: "#F2B134",
};

export function isHairColor(value: string | null | undefined): value is string {
  return !!value && HAIR_COLORS.some((c) => c.id === value);
}

/** Skin tones players can pick. Lightest to deepest. */
export const SKIN_COLORS: readonly { id: string; label: string }[] = [
  { id: "#FBE4D6", label: "Porcelain" },
  { id: "#F6C9A0", label: "Peach" },
  { id: "#E8B48A", label: "Honey" },
  { id: "#CEAD86", label: "Sand" },
  { id: "#C68642", label: "Golden" },
  { id: "#A86B3C", label: "Amber" },
  { id: "#5D4D44", label: "Cocoa" },
  { id: "#3C2415", label: "Deep" },
] as const;

/** Close to each model's own skin tone. */
export const DEFAULT_SKIN_COLOR: Record<CharacterId, string> = {
  boy: "#CEAD86",
  girl: "#CEAD86",
};

export const LEGACY_DEFAULT_SKIN_COLOR: Record<CharacterId, string> = {
  boy: "#5D4D44",
  girl: "#CEAD86",
};

export function isSkinColor(value: string | null | undefined): value is string {
  return !!value && SKIN_COLORS.some((c) => c.id === value);
}

/** Raw numbers from a round, used for achievements (perfect bakes, combos, ...). */
export type RoundMetrics = Record<string, number>;

export interface GameResult {
  mode: GameMode;
  score: number;
  durationSeconds: number;
  /** Short human-readable stats for the results screen. */
  highlights: { label: string; value: string }[];
  /** Unique per round so the results page submits each round exactly once. */
  roundId: string;
  /** Difficulty level the round was played at. */
  level: number;
  /** 0-3 stars; drives level progression. */
  stars: number;
  metrics: RoundMetrics;
  /** Set when the round was today's seeded daily challenge (UTC date key). */
  challengeDate?: string;
}

/** A finished round remembered on this device for the "My scores" page. */
export interface RoundRecord {
  roundId: string;
  mode: GameMode;
  score: number;
  level: number;
  stars?: number;
  playedAt: string;
  challengeDate?: string;
  rank?: number;
  personalBest?: boolean;
}

/** Unlockable bike paint jobs (delivery mode). */
export type BikeSkinId = "classic" | "mint" | "midnight" | "gold";

export interface BikeSkin {
  id: BikeSkinId;
  label: string;
  frame: string;
  accent: string;
  /** Achievement that unlocks it; undefined = always available. */
  unlockedBy?: string;
}

export const BIKE_SKINS: readonly BikeSkin[] = [
  { id: "classic", label: "Classic red", frame: "#F2542D", accent: "#FDE68A" },
  { id: "mint", label: "Mint racer", frame: "#5EEAD4", accent: "#0E9594", unlockedBy: "delivery-10" },
  { id: "midnight", label: "Midnight", frame: "#2B2D42", accent: "#E85D9A", unlockedBy: "clean-ride" },
  { id: "gold", label: "Golden legend", frame: "#F2B134", accent: "#FFFFFF", unlockedBy: "delivery-legend" },
] as const;

export const BIKE_SKIN_BY_ID: Record<BikeSkinId, BikeSkin> = Object.fromEntries(BIKE_SKINS.map((s) => [s.id, s])) as Record<
  BikeSkinId,
  BikeSkin
>;

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateNickname(raw: string): string | null {
  const nick = normalizeNickname(raw);
  if (nick.length < NICKNAME_MIN) return `Use at least ${NICKNAME_MIN} letters`;
  if (nick.length > NICKNAME_MAX) return `Keep it under ${NICKNAME_MAX} letters`;
  if (!/^[\p{L}\p{N} _'-]+$/u.test(nick)) return "Letters and numbers only, please";
  return null;
}
