"use client";

import Box from "@mui/material/Box";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { N } from "@/design/neon";

export type PillTone = "money" | "sun" | "blue" | "tomato" | "ink";

const TONE: Record<PillTone, string> = {
  money: N.brand,
  sun: N.sun,
  blue: N.delivery,
  tomato: N.kitchen,
  ink: N.textSoft,
};

/**
 * HUD counter: a dark lozenge with a neon icon badge on the left and a fat
 * number on the right. It punches whenever the value changes so gains feel
 * physical.
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
  const accent = TONE[tone];
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
        bgcolor: urgent ? N.kitchen : N.panel,
        color: urgent ? N.white : N.text,
        border: `1px solid ${urgent ? N.kitchenDeep : `${accent}59`}`,
        boxShadow: urgent ? `0 0 16px ${N.kitchen}80` : `0 0 10px ${accent}26, 0 4px 14px rgba(0,0,0,0.4)`,
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
          bgcolor: urgent ? "rgba(255,255,255,0.25)" : accent,
          color: N.bg,
          fontSize: size === "sm" ? 18 : 22,
          lineHeight: 1,
          boxShadow: urgent ? undefined : `0 0 10px ${accent}66`,
          "& .MuiSvgIcon-root": { fontSize: size === "sm" ? 20 : 24 },
        }}
      >
        {icon}
      </Box>
      <Box
        key={punch}
        className="tnum"
        sx={{
          fontFamily: "var(--font-arcade)",
          fontWeight: 700,
          fontSize: size === "sm" ? "1.1rem" : "1.35rem",
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
