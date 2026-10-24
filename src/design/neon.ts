/**
 * "Neon arcade" design tokens: the dark reskin of the original pizza-shop
 * look. Near-black navy backgrounds, glowing per-game accents and angular
 * clipped panels - esports poster energy, tuned to stay friendly and readable
 * for kids (bright text, generous contrast, no pure black).
 *
 * The original light tokens live in tokens.ts and still power the screens
 * that have not been reskinned yet. Keep both until the rollout finishes.
 */

export const N = {
  /** Page background: near-black navy, never pure black. */
  bg: "#0B0F17",
  /** Slightly raised surfaces (page glows, grid lines sit on this). */
  bgRaise: "#0F1624",
  /** Cards and panels. */
  panel: "#131B2A",
  /** Default panel border. */
  panelEdge: "#24314B",

  /** Brand: neon green, the "Greta's Games" signature colour. */
  brand: "#3DFF88",
  brandDeep: "#17B35A",
  /** Hot magenta used for the "for fun!" energy + highlights. */
  pop: "#FF4FD8",
  popDeep: "#C01FA0",

  /** Per-game neon accents (same hues as the light theme, electrified). */
  kitchen: "#FF6A57",
  kitchenDeep: "#D13A26",
  delivery: "#41C9FF",
  deliveryDeep: "#1E8FC9",
  wordle: "#B78AFF",
  wordleDeep: "#8A4DFF",
  frogger: "#B6FF3B",
  froggerDeep: "#6FC21A",
  claw: "#FF8AD0",
  clawDeep: "#D13A9A",

  /** Stars, coins, streaks. */
  sun: "#FFD54D",
  sunDeep: "#D9A414",

  /** Text. */
  text: "#EAF2FF",
  textSoft: "#93A5BE",
  white: "#FFFFFF",
} as const;

/** Outer neon glow for buttons/cards; pass the accent colour. */
export function neonGlow(color: string, spread = 18): string {
  return `0 0 ${spread}px ${color}66, 0 0 ${spread * 2.2}px ${color}2E, 0 4px 18px rgba(0,0,0,0.5)`;
}

/** Softer resting glow for panels. */
export function panelGlow(color: string): string {
  return `0 0 0 1px ${color}59, 0 0 22px ${color}24, 0 10px 30px rgba(0,0,0,0.45)`;
}

/** Neon text glow (use sparingly: headings and the wordmark only). */
export function textGlow(color: string): string {
  return `0 0 12px ${color}B3, 0 0 36px ${color}59`;
}

/** Angular esports corner clip for cards and big buttons. */
export const CLIP = {
  /** Shaves the top-left and bottom-right corners. */
  card: "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
  /** Smaller shave for pills/buttons. */
  button: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
} as const;
