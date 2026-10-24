"use client";

import { useCallback, useRef, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import { N } from "@/design/neon";
import type { MoveDir } from "../engine/types";

/** Big, round, thumb-sized hold button; fires on pointer down and releases on up/cancel/leave. */
function HoldButton({
  label,
  icon,
  accent,
  disabled,
  size = 72,
  onHold,
}: {
  label: string;
  icon: ReactNode;
  accent: string;
  disabled?: boolean;
  size?: number;
  onHold: (pressed: boolean) => void;
}) {
  const holding = useRef(false);
  const release = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    onHold(false);
  }, [onHold]);
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        holding.current = true;
        onHold(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic events (and some browsers) cannot capture; hold still counts.
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !holding.current) {
          holding.current = true;
          onHold(true);
        }
      }}
      onKeyUp={release}
      onBlur={release}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: "rgba(13,19,31,0.9)",
        color: accent,
        border: `3px solid ${accent}B3`,
        boxShadow: `0 0 16px ${accent}40, 0 6px 16px rgba(0,0,0,0.45)`,
        transition: "transform 80ms ease, box-shadow 80ms ease",
        touchAction: "none",
        "&:active": { transform: "translateY(3px) scale(0.96)", boxShadow: `0 0 24px ${accent}73` },
        "&.Mui-disabled": { opacity: 0.4 },
      }}
    >
      {icon}
    </ButtonBase>
  );
}

/**
 * Joystick-style arrows and a huge GRAB button. Arrows are held (the claw
 * glides while a finger is down); depth-control levels add forward/back.
 */
export default function ClawControls({
  depthControl,
  canMove,
  canGrab,
  showKeys,
  mystery,
  onMove,
  onGrab,
}: {
  depthControl: boolean;
  canMove: boolean;
  canGrab: boolean;
  /** Desktop: show the keyboard hints under the buttons. */
  showKeys?: boolean;
  /** Mystery machine: the claw sweeps on its own, so only GRAB is shown. */
  mystery?: boolean;
  onMove: (dir: MoveDir, pressed: boolean) => void;
  onGrab: () => void;
}) {
  const arrow = (dir: MoveDir, label: string, icon: ReactNode) => (
    <HoldButton key={dir} label={label} icon={icon} accent={N.delivery} disabled={!canMove} onHold={(p) => onMove(dir, p)} />
  );
  return (
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: mystery ? "center" : "space-between", width: "100%", maxWidth: 560, mx: "auto", px: 1 }}>
      {!mystery && (
        <Box sx={{ display: "grid", gridTemplateAreas: depthControl ? `". up ." "left . right" ". down ."` : `"left right"`, gap: 0.75, placeItems: "center", touchAction: "none" }}>
          {depthControl && <Box sx={{ gridArea: "up" }}>{arrow("back", "Move claw back", <ArrowUpwardRoundedIcon sx={{ fontSize: 40 }} />)}</Box>}
          <Box sx={{ gridArea: "left" }}>{arrow("left", "Move claw left", <ArrowBackRoundedIcon sx={{ fontSize: 40 }} />)}</Box>
          <Box sx={{ gridArea: "right" }}>{arrow("right", "Move claw right", <ArrowForwardRoundedIcon sx={{ fontSize: 40 }} />)}</Box>
          {depthControl && <Box sx={{ gridArea: "down" }}>{arrow("forward", "Move claw forward", <ArrowDownwardRoundedIcon sx={{ fontSize: 40 }} />)}</Box>}
        </Box>
      )}
      <Stack spacing={0.5} sx={{ alignItems: "center" }}>
        <ButtonBase
          aria-label="Grab"
          disabled={!canGrab}
          onPointerDown={(e) => {
            e.preventDefault();
            onGrab();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onGrab();
          }}
          sx={{
            width: 104,
            height: 104,
            borderRadius: "50%",
            bgcolor: N.kitchen,
            color: N.white,
            fontFamily: "var(--font-arcade)",
            fontWeight: 700,
            fontSize: "1.35rem",
            letterSpacing: "0.08em",
            border: `4px solid ${N.kitchenDeep}`,
            boxShadow: `0 0 26px ${N.kitchen}73, inset 0 -8px 0 rgba(0,0,0,0.22), 0 8px 18px rgba(0,0,0,0.5)`,
            transition: "transform 80ms ease, box-shadow 80ms ease",
            touchAction: "none",
            "&:active": { transform: "translateY(5px)", boxShadow: `0 0 34px ${N.kitchen}99, inset 0 -3px 0 rgba(0,0,0,0.22), 0 3px 10px rgba(0,0,0,0.5)` },
            "&.Mui-disabled": { opacity: 0.45, bgcolor: N.panelEdge, borderColor: N.panelEdge, boxShadow: "none" },
          }}
        >
          GRAB
        </ButtonBase>
        {showKeys && (
          <Typography sx={{ color: N.textSoft, fontSize: "0.75rem", fontWeight: 700 }}>
            {mystery ? "Space" : `${depthControl ? "Arrows / WASD" : "← → or A / D"} · Space`}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
