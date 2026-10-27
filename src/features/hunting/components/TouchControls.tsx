"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { HudSnapshot } from "../types";
import { H } from "./hudStyle";

interface Props {
  hud: HudSnapshot;
  onFire: () => void;
  onAds: (on: boolean) => void;
  onReload: () => void;
  onZoom: () => void;
  onSwap: () => void;
}

function Pad({ label, emoji, size, top, bottom, onDown, onUp, ariaLabel }: { label: string; emoji: string; size: number; top: string; bottom: string; onDown: () => void; onUp?: () => void; ariaLabel: string }) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        onDown();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onUp?.();
      }}
      onPointerCancel={() => onUp?.()}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3px solid rgba(255,255,255,0.75)",
        background: `radial-gradient(circle at 35% 30%, ${top}, ${bottom})`,
        boxShadow: "0 5px 0 rgba(0,0,0,0.3), 0 10px 20px rgba(0,0,0,0.25)",
        color: H.white,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.2,
        pointerEvents: "auto",
        touchAction: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        "&:active": { transform: "scale(0.94)" },
      }}
    >
      <Box component="span" sx={{ fontSize: size * 0.34, lineHeight: 1 }}>
        {emoji}
      </Box>
      <Typography component="span" sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: Math.max(10, size * 0.15), textShadow: "0 1px 0 rgba(0,0,0,0.4)", lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

/** Thumb buttons for phones and tablets. Dragging anywhere else turns the view. */
export default function TouchControls({ hud, onFire, onAds, onReload, onZoom, onSwap }: Props) {
  const camera = hud.tool === "camera";
  return (
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Box sx={{ position: "absolute", right: "max(18px, env(safe-area-inset-right))", bottom: "max(18px, env(safe-area-inset-bottom))", display: "grid", gridTemplateColumns: "auto auto", gridTemplateRows: "auto auto", gap: 1.2, alignItems: "end", justifyItems: "end" }}>
        <Box />
        {camera ? (
          <Pad label="ZOOM" emoji="🔍" size={66} top="#7fd0ff" bottom="#1b7fc4" onDown={onZoom} ariaLabel={`Zoom (now ${hud.zoom}x)`} />
        ) : (
          <Pad label="RELOAD" emoji="🔄" size={66} top="#ffd36b" bottom="#c88a0c" onDown={onReload} ariaLabel="Reload" />
        )}
        {camera ? <Box /> : <Pad label="AIM" emoji="🎯" size={66} top="#9ff0c9" bottom="#1e9e5a" onDown={() => onAds(true)} onUp={() => onAds(false)} ariaLabel="Hold to aim" />}
        <Pad label={camera ? "SNAP" : "FIRE"} emoji={camera ? "📸" : "💥"} size={104} top={camera ? "#ffe07a" : "#ff8f5e"} bottom={camera ? "#e0a10c" : "#d0261d"} onDown={onFire} ariaLabel={camera ? "Take photo" : "Fire"} />
      </Box>
      {hud.activity !== "explore" && (
        <Box sx={{ position: "absolute", left: "max(18px, env(safe-area-inset-left))", bottom: "max(18px, env(safe-area-inset-bottom))" }}>
          <Pad label={camera ? "SHOTGUN" : "CAMERA"} emoji={camera ? "🦆" : "📷"} size={70} top="#c8b6ff" bottom="#6b4fd1" onDown={onSwap} ariaLabel={camera ? "Switch to shotgun" : "Switch to camera"} />
        </Box>
      )}
    </Box>
  );
}
