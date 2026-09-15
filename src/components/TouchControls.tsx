"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useEffect } from "react";

interface TouchControlsProps {
  onLeft: () => void;
  onRight: () => void;
  disabled?: boolean;
}

/**
 * Big thumb-friendly left/right controls. Also wires keyboard arrows (and
 * A/D) for desktop testing. Swipe handling lives in the game shell.
 */
export default function TouchControls({ onLeft, onRight, disabled }: TouchControlsProps) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") onLeft();
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") onRight();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLeft, onRight, disabled]);

  const btn = {
    width: 88,
    height: 88,
    borderRadius: "50%",
    bgcolor: "rgba(255,255,255,0.9)",
    boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
    color: "#2B2D42",
    "&:active": { transform: "scale(0.94)", bgcolor: "#FDE68A" },
    transition: "transform 80ms ease",
  } as const;

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1 }}>
      <ButtonBase aria-label="Move left" disabled={disabled} sx={btn} onPointerDown={onLeft}>
        <ArrowBackRoundedIcon sx={{ fontSize: 44 }} />
      </ButtonBase>
      <ButtonBase aria-label="Move right" disabled={disabled} sx={btn} onPointerDown={onRight}>
        <ArrowForwardRoundedIcon sx={{ fontSize: 44 }} />
      </ButtonBase>
    </Box>
  );
}
