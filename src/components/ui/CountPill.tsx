"use client";

import Box from "@mui/material/Box";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { C, floatShadow } from "@/design/tokens";

export type PillTone = "money" | "sun" | "blue" | "tomato" | "ink";

const TONE: Record<PillTone, string> = {
  money: C.money,
  sun: C.sun,
  blue: C.blue,
  tomato: C.tomato,
  ink: C.ink,
};

/**
 * The HUD counter from the reference art: a white lozenge with a coloured icon
 * badge on the left and a fat number on the right. It punches whenever the
 * value changes so gains feel physical.
 */
export default function CountPill({
  icon,
  value,
  tone = "money",
  size = "md",
  urgent = false,
  label,
}: {
  icon: ReactNode;
  value: ReactNode;
  tone?: PillTone;
  size?: "sm" | "md";
  /** Pulses the pill (used by the delivery timer in its last seconds). */
  urgent?: boolean;
  label?: string;
}) {
  const [punch, setPunch] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPunch((p) => p + 1);
    }
  }, [value]);

  const h = size === "sm" ? 38 : 46;
  const badge = h - 10;
  return (
    <Box
      aria-label={label}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        height: h,
        pl: 0.625,
        pr: 1.75,
        borderRadius: 999,
        bgcolor: urgent ? C.tomato : C.white,
        color: urgent ? C.white : C.ink,
        boxShadow: floatShadow,
        animation: urgent ? "pillUrgent 620ms ease-in-out infinite" : undefined,
        "@keyframes pillUrgent": { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.07)" } },
      }}
    >
      <Box
        sx={{
          width: badge,
          height: badge,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: urgent ? "rgba(255,255,255,0.25)" : TONE[tone],
          color: tone === "sun" ? C.ink : C.white,
          fontSize: size === "sm" ? 18 : 22,
          lineHeight: 1,
          "& .MuiSvgIcon-root": { fontSize: size === "sm" ? 20 : 24 },
        }}
      >
        {icon}
      </Box>
      <Box
        key={punch}
        className="tnum"
        sx={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: size === "sm" ? "1.15rem" : "1.45rem",
          lineHeight: 1,
          minWidth: 22,
          textAlign: "center",
          animation: punch ? "pillPunch 300ms cubic-bezier(.2,1.7,.4,1)" : undefined,
          "@keyframes pillPunch": { "0%": { transform: "scale(1.35)" }, "100%": { transform: "scale(1)" } },
        }}
      >
        {value}
      </Box>
    </Box>
  );
}
