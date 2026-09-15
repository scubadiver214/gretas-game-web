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

export interface GameResult {
  mode: GameMode;
  score: number;
  durationSeconds: number;
  /** Short human-readable stats for the results screen. */
  highlights: { label: string; value: string }[];
  /** Unique per round so the results page submits each round exactly once. */
  roundId: string;
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
