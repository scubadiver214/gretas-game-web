/**
 * The racing screens' own palette, taken from the reference screenshot: warm gold
 * frames on dark olive plates, white type with a hard drop shadow. (The rest of the
 * app is neon-on-navy; the race is a sunny desert, so it gets its own look.)
 */
export const R = {
  gold: "#E8A91D",
  goldLight: "#FFD54D",
  goldDeep: "#B97A06",
  plateTop: "rgba(92,70,14,0.84)",
  plateBottom: "rgba(46,34,6,0.88)",
  white: "#FFFFFF",
  ink: "#2B1D05",
  red: "#E53935",
  orange: "#FF8A1F",
  yellow: "#FFD23F",
  green: "#3DDC5B",
  blue: "#2F9BFF",
  pink: "#FF4FA3",
  sky: "#2C78D4",
} as const;

/** Chunky white type with a dark edge: readable over sky, sand and shadow alike. */
export const bigText = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  color: R.white,
  textShadow: "0 2px 0 rgba(30,18,0,0.6), 0 0 8px rgba(0,0,0,0.35)",
  lineHeight: 1.05,
} as const;

/** The gold-framed plate behind the HUD labels. */
export const plate = {
  border: `3px solid ${R.gold}`,
  borderRadius: "12px",
  background: `linear-gradient(180deg, ${R.plateTop}, ${R.plateBottom})`,
  boxShadow: "0 3px 0 rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,236,160,0.3)",
  color: R.white,
} as const;
