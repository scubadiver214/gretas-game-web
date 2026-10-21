"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { N } from "@/design/neon";
import type { PadAction } from "../input/keyboard";

const STICK = 128;
const KNOB = 56;

/** Floating thumb stick: drag anywhere inside the pad, the chef walks that way. */
function Joystick({ onMove, disabled }: { onMove: (x: number, z: number) => void; disabled?: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const max = (STICK - KNOB) / 2;
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / max;
    const ny = dy / max;
    // Small dead zone so a resting thumb doesn't drift.
    if (Math.hypot(nx, ny) < 0.2) onMove(0, 0);
    else onMove(nx, ny);
  };
  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <Box
      ref={base}
      role="application"
      aria-label="Move stick"
      onPointerDown={(e) => {
        if (disabled) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      sx={{
        position: "relative",
        width: STICK,
        height: STICK,
        borderRadius: "50%",
        bgcolor: "rgba(13,19,31,0.7)",
        border: `2px solid ${N.delivery}80`,
        boxShadow: `0 0 16px ${N.delivery}33`,
        touchAction: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: (STICK - KNOB) / 2 - 2 + knob.x,
          top: (STICK - KNOB) / 2 - 2 + knob.y,
          width: KNOB,
          height: KNOB,
          borderRadius: "50%",
          bgcolor: N.delivery,
          boxShadow: `0 0 18px ${N.delivery}AA`,
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}

function PadButton({ label, emoji, color, size, onPress, disabled }: { label: string; emoji: string; color: string; size: number; onPress: () => void; disabled?: boolean }) {
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexDirection: "column",
        bgcolor: "rgba(13,19,31,0.85)",
        color,
        border: `2px solid ${color}AA`,
        boxShadow: `0 0 16px ${color}40, 0 6px 16px rgba(0,0,0,0.45)`,
        touchAction: "none",
        transition: "transform 80ms ease",
        "&:active": { transform: "translateY(3px) scale(0.96)" },
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span aria-hidden style={{ fontSize: size * 0.36, lineHeight: 1 }}>
        {emoji}
      </span>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, fontFamily: "var(--font-display)", mt: 0.25 }}>{label}</Typography>
    </ButtonBase>
  );
}

export default function TouchPad({
  onMove,
  onAction,
  canSwap,
  disabled,
}: {
  onMove: (x: number, z: number) => void;
  onAction: (a: PadAction) => void;
  canSwap: boolean;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", px: 1 }}>
      <Joystick onMove={onMove} disabled={disabled} />
      <Box sx={{ display: "grid", gridTemplateColumns: "auto auto", gridTemplateRows: "auto auto", gap: 1, alignItems: "end", justifyItems: "center" }}>
        <PadButton label="Dash" emoji="💨" color={N.delivery} size={56} onPress={() => onAction("dash")} disabled={disabled} />
        {canSwap ? <PadButton label="Swap" emoji="🔄" color={N.pop} size={56} onPress={() => onAction("swap")} disabled={disabled} /> : <span />}
        <PadButton label="Chop" emoji="🔪" color={N.sun} size={70} onPress={() => onAction("work")} disabled={disabled} />
        <PadButton label="Grab" emoji="✋" color={N.brand} size={84} onPress={() => onAction("interact")} disabled={disabled} />
      </Box>
    </Box>
  );
}
