export type CharacterId = "boy" | "girl";

export type GameMode = "kitchen" | "delivery";

export const GAME_MODES: readonly GameMode[] = ["kitchen", "delivery"] as const;

export const MODE_LABELS: Record<GameMode, string> = {
  kitchen: "Pizza Kitchen",
  delivery: "Bike Delivery",
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
  boy: "#3B82F6",
  girl: "#E85D9A",
};

export function isPlayerColor(value: string | null | undefined): value is string {
  return !!value && PLAYER_COLORS.some((c) => c.id === value);
}

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
  /** Set when the round was today's seeded daily challenge (UTC date key). */
  challengeDate?: string;
}

/** A finished round remembered on this device for the "My scores" page. */
export interface RoundRecord {
  roundId: string;
  mode: GameMode;
  score: number;
  level: number;
  playedAt: string;
  challengeDate?: string;
  rank?: number;
  personalBest?: boolean;
}

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
