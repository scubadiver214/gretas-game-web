/**
 * Design tokens for the "pizza shop" look: flat saturated colours, sand floors,
 * blue plastic machinery, hard drop shadows and very round corners.
 *
 * Every colour has a `deep` partner used as the hard bottom edge on buttons and
 * the outline on floating pills, which is what gives the UI its chunky,
 * toy-like feel. Keep the pairs in sync when adding new colours.
 */

export const C = {
  /** Blue plastic: machines, counters, primary chrome. */
  blue: "#2E8DEF",
  blueDeep: "#1A67BE",
  blueSoft: "#8CC9FF",
  /** Sand floor of the shop. */
  sand: "#F6E4B0",
  sandDeep: "#E3CB8B",
  sandSoft: "#FDF4DA",
  /** Grass outside the shop. */
  grass: "#4FC64A",
  grassDeep: "#37A034",
  /** Cash + success. */
  money: "#5FC46B",
  moneyDeep: "#42A34F",
  /** Cheese + coins + stars. */
  sun: "#FFC53D",
  sunDeep: "#DFA018",
  /** Pizza sauce: rush orders, urgency, delete. */
  tomato: "#EF5136",
  tomatoDeep: "#C6371F",
  /** Pizza crust / cardboard box. */
  crust: "#EDAA5F",
  crustDeep: "#CE8639",
  /** Grape: the word game's accent colour. */
  grape: "#8B5CF6",
  grapeDeep: "#6D28D9",
  /** Near-black used for every bit of text. */
  ink: "#16212E",
  inkSoft: "#5A6675",
  white: "#FFFFFF",
  /** Locked / disabled surfaces. */
  slate: "#D7DEE6",
  slateDeep: "#B4BFCB",
} as const;

/** Hard "sticker" shadow: a solid edge plus a soft ambient shadow. */
export function hardShadow(edge: string, depth = 6): string {
  return `0 ${depth}px 0 ${edge}, 0 ${depth + 4}px ${depth * 2}px rgba(22,33,46,0.18)`;
}

/** Pressed-in variant of {@link hardShadow}; pair with a matching translateY. */
export function pressedShadow(edge: string, depth = 2): string {
  return `0 ${depth}px 0 ${edge}, 0 ${depth + 2}px ${depth * 2}px rgba(22,33,46,0.15)`;
}

/** Floating HUD pill: white, thin ink outline, soft lift. */
export const floatShadow = "0 4px 0 rgba(22,33,46,0.10), 0 8px 18px rgba(22,33,46,0.16)";

export const RADIUS = { pill: 999, panel: 28, tile: 20 } as const;
