/**
 * Wild Adventure Hunting's own look, taken from the reference screenshot: slate
 * plates with a silver rim for the HUD, warm gold and forest green for menus,
 * shell-red and sunny orange for action. (The rest of the app is neon-on-navy.)
 */
export const H = {
  slateTop: "rgba(58,70,86,0.9)",
  slateBottom: "rgba(30,38,50,0.92)",
  rim: "#cfd8e2",
  rimDark: "#7d8a99",
  gold: "#F5C542",
  goldDeep: "#C58A0B",
  cream: "#FFF6DF",
  forest: "#1F4D3A",
  forestDeep: "#123226",
  orange: "#FF8A1F",
  orangeDeep: "#D9600A",
  red: "#E5392F",
  green: "#3DDC84",
  greenDeep: "#1E9E5A",
  teal: "#2FD8B0",
  tealDeep: "#13997C",
  sky: "#5FB8FF",
  pink: "#FF6FB5",
  white: "#FFFFFF",
  ink: "#0E1620",
} as const;

export const TONE_COLOR = { gold: H.gold, green: H.green, blue: H.sky, pink: H.pink, red: "#FF6B5E" } as const;

/** Chunky display type with a hard shadow that reads over sky, water and grass. */
export const bigText = {
  fontFamily: "var(--font-display)",
  fontWeight: 800,
  color: H.white,
  textShadow: "0 2px 0 rgba(0,0,0,0.45), 0 0 10px rgba(0,0,0,0.3)",
  lineHeight: 1.05,
} as const;

/** The slate HUD plate with a silver rim (top-centre score bar in the screenshot). */
export const plate = {
  border: `2.5px solid ${H.rim}`,
  borderRadius: "12px",
  background: `linear-gradient(180deg, ${H.slateTop}, ${H.slateBottom})`,
  boxShadow: "0 3px 0 rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.12)",
  color: H.white,
} as const;

/** Menu card: deep forest green with a gold frame. */
export const menuCard = {
  border: `3px solid ${H.gold}`,
  borderRadius: "20px",
  background: `linear-gradient(180deg, rgba(31,77,58,0.94), rgba(14,40,30,0.96))`,
  boxShadow: "0 10px 40px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,236,160,0.18)",
  color: H.cream,
} as const;

/** Big, friendly menu button in a given colour pair. */
export function bigButton(top: string, bottom: string) {
  return {
    width: "100%",
    minHeight: 58,
    px: 2.5,
    borderRadius: "16px",
    justifyContent: "flex-start",
    gap: 1.5,
    color: H.white,
    fontFamily: "var(--font-display)",
    fontWeight: 800,
    fontSize: "1.2rem",
    textTransform: "none" as const,
    letterSpacing: 0.3,
    background: `linear-gradient(180deg, ${top}, ${bottom})`,
    border: "2px solid rgba(255,255,255,0.35)",
    boxShadow: `0 4px 0 ${bottom}, 0 8px 18px rgba(0,0,0,0.3)`,
    textShadow: "0 1px 0 rgba(0,0,0,0.35)",
    transition: "transform 120ms ease, filter 120ms ease",
    "&:hover": { filter: "brightness(1.08)", transform: "translateY(-1px)" },
    "&:active": { transform: "translateY(2px)", boxShadow: `0 2px 0 ${bottom}` },
    "&:focus-visible": { outline: `3px solid ${H.gold}`, outlineOffset: 2 },
    "&.Mui-disabled": { opacity: 0.5, color: H.white },
  };
}

export const formatClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

/**
 * Phone landscape is short (about 320–450px). Selection menus use this to
 * spread choices across the width so they fit without a nested scroll.
 */
export const SHORT = "@media (max-height: 500px)";
