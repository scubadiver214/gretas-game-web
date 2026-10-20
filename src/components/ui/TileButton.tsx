"use client";

import ButtonBase from "@mui/material/ButtonBase";
import type { ReactNode } from "react";
import { CLIP, N } from "@/design/neon";

export type TileTone = "white" | "sand" | "blue" | "sun" | "money" | "tomato";

/**
 * Tone names kept from the light theme so call sites don't change:
 * "white"/"sand" are now dark raised tiles, the colour tones are neon fills.
 */
const TONES: Record<TileTone, { bg: string; edge: string; fg: string }> = {
  white: { bg: N.bgRaise, edge: N.panelEdge, fg: N.text },
  sand: { bg: N.panel, edge: N.panelEdge, fg: N.text },
  blue: { bg: N.delivery, edge: N.deliveryDeep, fg: N.bg },
  sun: { bg: N.sun, edge: N.sunDeep, fg: N.bg },
  money: { bg: N.brand, edge: N.brandDeep, fg: N.bg },
  tomato: { bg: N.kitchen, edge: N.kitchenDeep, fg: N.white },
};

/**
 * Pressable arcade tile. The whole UI is built from these: topping buttons,
 * adventure cards, colour swatches. `wanted` draws the attention ring used to
 * point a young player at the thing they should tap next.
 */
export default function TileButton({
  children,
  tone = "white",
  selected = false,
  wanted = false,
  disabled = false,
  onClick,
  ariaLabel,
  ariaPressed,
  sx,
}: {
  children: ReactNode;
  tone?: TileTone;
  /** Chosen state: solid neon ring in the tile's own edge colour. */
  selected?: boolean;
  /** "Tap me next" state: pulsing neon ring. */
  wanted?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
  sx?: object;
}) {
  const t = TONES[tone];
  const ringColor = tone === "white" || tone === "sand" ? N.brand : t.edge;
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      sx={{
        flexDirection: "column",
        gap: 0.25,
        px: 1.5,
        py: 1.25,
        clipPath: CLIP.button,
        bgcolor: disabled ? N.panelEdge : t.bg,
        color: disabled ? N.textSoft : t.fg,
        border: `1px solid ${disabled ? N.panelEdge : `${t.edge}73`}`,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        outline: selected ? `3px solid ${ringColor}` : wanted ? `3px solid ${N.kitchen}` : "3px solid transparent",
        outlineOffset: -3,
        transition: "transform 80ms ease, outline-color 150ms ease, filter 80ms ease",
        "&:hover": { filter: "brightness(1.08)" },
        "&:active": { transform: "translateY(3px)" },
        ...(wanted && {
          animation: "tileWanted 1100ms ease-in-out infinite",
          "@keyframes tileWanted": {
            "0%,100%": { outlineColor: N.kitchen },
            "50%": { outlineColor: "rgba(255,106,87,0.25)" },
          },
        }),
        ...sx,
      }}
    >
      {children}
    </ButtonBase>
  );
}
