"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { neutralControls, type Controls } from "../types";
import { useRacingHud } from "../useRacingHud";
import { R, bigText, plate } from "./hudStyle";

type ButtonId = "left" | "right" | "gas" | "brake" | "boost" | "drift";

function toControls(held: ReadonlySet<ButtonId>): Controls {
  return {
    throttle: held.has("gas") ? 1 : 0,
    brake: held.has("brake") ? 1 : 0,
    steer: (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0),
    handbrake: held.has("drift"),
    boost: held.has("boost"),
  };
}

/** One press-and-hold button. Each tracks its own pointer, so any number can be held at once (steer + gas + boost). */
function HoldButton({ id, label, onHold, size, color, children, ariaLabel }: { id: ButtonId; label?: string; onHold: (id: ButtonId, down: boolean) => void; size: number; color: string; children?: ReactNode; ariaLabel: string }) {
  const down = useRef(false);
  const press = (e: ReactPointerEvent) => {
    e.preventDefault();
    try {
      // Keeps the button held when a thumb slides off it; best-effort, the up/cancel events still release it.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some pointers cannot be captured */
    }
    if (down.current) return;
    down.current = true;
    onHold(id, true);
  };
  const release = () => {
    if (!down.current) return;
    down.current = false;
    onHold(id, false);
  };
  return (
    <Box
      role="button"
      aria-label={ariaLabel}
      tabIndex={-1}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        touchAction: "none",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        background: `radial-gradient(circle at 35% 28%, ${color}ee, ${color}bb 70%)`,
        border: `4px solid ${R.gold}`,
        boxShadow: "0 4px 0 rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,255,255,0.35)",
        "&:active": { transform: "translateY(3px) scale(0.97)", filter: "brightness(1.15)" },
        ...bigText,
        fontSize: size * 0.24,
      }}
    >
      {children ?? label}
    </Box>
  );
}

/**
 * On-screen driving controls for phones and tablets: steer pads on the left, pedals
 * and boost on the right. Auto-gas (from the assist level) drops the gas pedal so
 * the littlest drivers only steer.
 */
export default function TouchControls({ onChange, onReset, onCycle, onFire, autoGas }: { onChange: (c: Controls) => void; onReset: () => void; onCycle: () => void; onFire: () => void; autoGas: boolean }) {
  const held = useRef(new Set<ButtonId>());
  const boost = useRacingHud((s) => s.boost);
  const boosting = useRacingHud((s) => s.boosting);

  const publish = useRef(onChange);
  useEffect(() => {
    publish.current = onChange;
  }, [onChange]);

  const onHold = (id: ButtonId, down: boolean) => {
    if (down) held.current.add(id);
    else held.current.delete(id);
    publish.current(toControls(held.current));
  };

  // Let go of everything if the controls go away mid-press.
  useEffect(() => {
    const set = held.current;
    return () => {
      set.clear();
      publish.current(neutralControls());
    };
  }, []);

  const ready = boost >= 0.12;
  return (
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", "& > *": { pointerEvents: "auto" } }}>
      <Box sx={{ position: "absolute", left: "max(14px, env(safe-area-inset-left))", bottom: "max(16px, env(safe-area-inset-bottom))", display: "flex", gap: 1.5 }}>
        <HoldButton id="left" onHold={onHold} size={92} color="#2f7dd8" ariaLabel="Steer left">
          <ArrowBackRoundedIcon sx={{ fontSize: 54 }} />
        </HoldButton>
        <HoldButton id="right" onHold={onHold} size={92} color="#2f7dd8" ariaLabel="Steer right">
          <ArrowForwardRoundedIcon sx={{ fontSize: 54 }} />
        </HoldButton>
      </Box>

      <Box sx={{ position: "absolute", right: "max(14px, env(safe-area-inset-right))", bottom: "max(16px, env(safe-area-inset-bottom))", display: "flex", gap: 1.2, alignItems: "flex-end" }}>
        <Box sx={{ display: "grid", gap: 1.2, justifyItems: "center" }}>
          <HoldButton id="drift" label="DRIFT" onHold={onHold} size={62} color="#7c3aed" ariaLabel="Drift" />
          <HoldButton id="brake" label="STOP" onHold={onHold} size={74} color="#e53935" ariaLabel="Brake" />
        </Box>
        <Box sx={{ display: "grid", gap: 1.2, justifyItems: "center" }}>
          <Box sx={{ position: "relative", opacity: ready || boosting ? 1 : 0.55, filter: boosting ? `drop-shadow(0 0 12px ${R.orange})` : undefined }}>
            <HoldButton id="boost" label="🔥" onHold={onHold} size={74} color="#ff8a1f" ariaLabel="Boost" />
            <Box sx={{ ...plate, position: "absolute", left: 6, right: 6, bottom: -6, height: 12, borderRadius: 999, p: "2px" }}>
              <Box sx={{ width: `${boost * 100}%`, height: "100%", borderRadius: 999, bgcolor: R.yellow }} />
            </Box>
          </Box>
          {!autoGas && <HoldButton id="gas" label="GO" onHold={onHold} size={104} color="#2fb44a" ariaLabel="Accelerate" />}
        </Box>
      </Box>

      <Box sx={{ position: "absolute", left: "50%", bottom: "max(18px, env(safe-area-inset-bottom))", transform: "translateX(-50%)", display: "flex", gap: 1.2 }}>
        <Box
          role="button"
          aria-label="Next weapon"
          onPointerDown={(e) => {
            e.preventDefault();
            onCycle();
          }}
          sx={{ ...plate, width: 78, height: 48, borderRadius: 999, display: "grid", placeItems: "center", touchAction: "none", ...bigText, fontSize: "0.85rem" }}
        >
          SWAP
        </Box>
        <Box
          role="button"
          aria-label="Fire weapon"
          onPointerDown={(e) => {
            e.preventDefault();
            onFire();
          }}
          sx={{ ...plate, width: 78, height: 48, borderRadius: 999, display: "grid", placeItems: "center", touchAction: "none", ...bigText, fontSize: "0.85rem", color: "#ffb020" }}
        >
          FIRE
        </Box>
      </Box>

      <Box
        role="button"
        aria-label="Reset to the last checkpoint"
        onPointerDown={(e) => {
          e.preventDefault();
          onReset();
        }}
        sx={{ ...plate, position: "absolute", right: "max(14px, env(safe-area-inset-right))", top: "max(64px, calc(env(safe-area-inset-top) + 56px))", width: 46, height: 46, borderRadius: "50%", display: "grid", placeItems: "center", touchAction: "none" }}
      >
        <RestartAltRoundedIcon sx={{ color: R.goldLight }} />
      </Box>
    </Box>
  );
}
