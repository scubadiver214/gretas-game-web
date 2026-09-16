"use client";

import ButtonBase from "@mui/material/ButtonBase";
import type { ReactNode } from "react";
import { C, RADIUS, hardShadow, pressedShadow } from "@/design/tokens";

export type TileTone = "white" | "sand" | "blue" | "sun" | "money" | "tomato";

const TONES: Record<TileTone, { bg: string; edge: string; fg: string }> = {
  white: { bg: C.white, edge: C.sandDeep, fg: C.ink },
  sand: { bg: C.sandSoft, edge: C.sandDeep, fg: C.ink },
  blue: { bg: C.blue, edge: C.blueDeep, fg: C.white },
  sun: { bg: C.sun, edge: C.sunDeep, fg: C.ink },
  money: { bg: C.money, edge: C.moneyDeep, fg: C.white },
  tomato: { bg: C.tomato, edge: C.tomatoDeep, fg: C.white },
};

/**
 * Pressable plastic tile. The whole UI is built from these: topping buttons,
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
  /** Chosen state: solid ring in the tile's own edge colour. */
  selected?: boolean;
  /** "Tap me next" state: pulsing tomato ring. */
  wanted?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
  sx?: object;
}) {
  const t = TONES[tone];
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
        borderRadius: `${RADIUS.tile}px`,
        bgcolor: disabled ? C.slate : t.bg,
        color: disabled ? C.inkSoft : t.fg,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        boxShadow: hardShadow(disabled ? C.slateDeep : t.edge, 5),
        outline: selected ? `4px solid ${t.edge}` : wanted ? `4px solid ${C.tomato}` : "4px solid transparent",
        outlineOffset: 1,
        transition: "transform 80ms ease, box-shadow 80ms ease, outline-color 150ms ease",
        "&:active": { transform: "translateY(4px)", boxShadow: pressedShadow(t.edge) },
        ...(wanted && {
          animation: "tileWanted 1100ms ease-in-out infinite",
          "@keyframes tileWanted": {
            "0%,100%": { outlineColor: C.tomato },
            "50%": { outlineColor: "rgba(239,81,54,0.25)" },
          },
        }),
        ...sx,
      }}
    >
      {children}
    </ButtonBase>
  );
}
