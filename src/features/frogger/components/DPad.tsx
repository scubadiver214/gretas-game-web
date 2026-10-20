"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import type { ReactNode } from "react";
import { N } from "@/design/neon";
import type { Dir } from "../types";

const BUTTONS: { dir: Dir; label: string; icon: ReactNode; area: string }[] = [
  { dir: "up", label: "Hop forward", icon: <ArrowUpwardRoundedIcon sx={{ fontSize: 40 }} />, area: "up" },
  { dir: "left", label: "Hop left", icon: <ArrowBackRoundedIcon sx={{ fontSize: 36 }} />, area: "left" },
  { dir: "right", label: "Hop right", icon: <ArrowForwardRoundedIcon sx={{ fontSize: 36 }} />, area: "right" },
  { dir: "down", label: "Hop back", icon: <ArrowDownwardRoundedIcon sx={{ fontSize: 36 }} />, area: "down" },
];

/** Big thumb-friendly cross of arrows; fires on pointer-down so hops feel instant. */
export default function DPad({ onDir, disabled }: { onDir: (dir: Dir) => void; disabled?: boolean }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateAreas: `". up ." "left . right" ". down ."`,
        gridTemplateColumns: "repeat(3, 70px)",
        gridTemplateRows: "repeat(3, 62px)",
        gap: 0.5,
        justifyContent: "center",
        touchAction: "none",
      }}
    >
      {BUTTONS.map(({ dir, label, icon, area }) => {
        const accent = dir === "up" ? N.frogger : N.delivery;
        return (
          <ButtonBase
            key={dir}
            aria-label={label}
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault();
              onDir(dir);
            }}
            sx={{
              gridArea: area,
              borderRadius: "50%",
              bgcolor: "rgba(13,19,31,0.88)",
              color: accent,
              border: `2px solid ${accent}99`,
              boxShadow: `0 0 14px ${accent}40, 0 6px 16px rgba(0,0,0,0.45)`,
              transition: "transform 80ms ease, box-shadow 80ms ease",
              "&:active": { transform: "translateY(3px) scale(0.96)", boxShadow: `0 0 22px ${accent}66` },
              "&.Mui-disabled": { opacity: 0.4 },
            }}
          >
            {icon}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
