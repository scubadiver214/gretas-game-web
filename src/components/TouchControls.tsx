"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import { useEffect } from "react";
import { N } from "@/design/neon";

interface TouchControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onJump?: () => void;
  disabled?: boolean;
}

/**
 * Big thumb-friendly left/right (and jump) controls. Also wires keyboard
 * arrows, A/D, and Space/W/Up for desktop. Swipe handling lives in the game shell.
 */
export default function TouchControls({ onLeft, onRight, onJump, disabled }: TouchControlsProps) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") onLeft();
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") onRight();
      if (onJump && (e.key === "ArrowUp" || e.key === " " || e.key === "w" || e.key === "W")) {
        e.preventDefault();
        onJump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLeft, onRight, onJump, disabled]);

  const round = (accent: string, size: number) =>
    ({
      width: size,
      height: size,
      borderRadius: "50%",
      bgcolor: "rgba(13,19,31,0.85)",
      color: accent,
      border: `2px solid ${accent}99`,
      boxShadow: `0 0 16px ${accent}40, 0 6px 16px rgba(0,0,0,0.45)`,
      transition: "transform 80ms ease, box-shadow 80ms ease",
      "&:active": { transform: "translateY(4px)", boxShadow: `0 0 22px ${accent}66` },
    }) as const;

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1 }}>
      <ButtonBase
        aria-label="Move left"
        disabled={disabled}
        sx={round(N.delivery, 86)}
        onPointerDown={onLeft}
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 46 }} />
      </ButtonBase>
      {onJump && (
        <ButtonBase
          aria-label="Jump"
          disabled={disabled}
          sx={round(N.sun, 74)}
          onPointerDown={onJump}
        >
          <ArrowUpwardRoundedIcon sx={{ fontSize: 42 }} />
        </ButtonBase>
      )}
      <ButtonBase
        aria-label="Move right"
        disabled={disabled}
        sx={round(N.delivery, 86)}
        onPointerDown={onRight}
      >
        <ArrowForwardRoundedIcon sx={{ fontSize: 46 }} />
      </ButtonBase>
    </Box>
  );
}
