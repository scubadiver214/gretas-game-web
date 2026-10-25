"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { N } from "@/design/neon";
import { stickFromDrag } from "../engine/input";

/**
 * Kitchen-style analog stick: drag the knob any direction, including toward
 * the glass. One circle stays on screen; a 3-row D-pad was clipping left/down.
 */
function AnalogStick({
  size,
  disabled,
  onStick,
}: {
  size: number;
  disabled?: boolean;
  onStick: (x: number, z: number) => void;
}) {
  const base = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const knobSize = Math.round(size * 0.44);
  const max = (size - knobSize) / 2;
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    const stick = stickFromDrag(dx, dy, max);
    onStick(stick.x, stick.z);
  };
  const release = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    onStick(0, 0);
  };
  // Effect Events always see the latest release without re-subscribing the
  // window listeners (and without touching a ref during render).
  const releaseIfHeld = useEffectEvent((pointerId?: number) => {
    if (pointer.current === null) return;
    if (pointerId !== undefined && pointer.current !== pointerId) return;
    release();
  });

  // A lost pointerup (window blur, pointer leaving the window) must never leave
  // the stick pushed, or the claw keeps sliding on its own.
  useEffect(() => {
    const onWindowUp = (e: PointerEvent) => releaseIfHeld(e.pointerId);
    const onBlur = () => releaseIfHeld();
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <Box
      ref={base}
      role="application"
      aria-label="Move claw"
      aria-disabled={disabled || undefined}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        pointer.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best-effort */
        }
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      sx={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: "rgba(13,19,31,0.88)",
        border: `3px solid ${N.delivery}B3`,
        boxShadow: `0 0 16px ${N.delivery}40, 0 6px 16px rgba(0,0,0,0.45)`,
        touchAction: "none",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: (size - knobSize) / 2 + knob.x,
          top: (size - knobSize) / 2 + knob.y,
          width: knobSize,
          height: knobSize,
          borderRadius: "50%",
          bgcolor: N.delivery,
          boxShadow: `0 0 18px ${N.delivery}AA`,
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}

/**
 * Analog stick + a huge GRAB button, pinned over the bottom of the canvas so
 * left/forward are never clipped. Drag the stick toward the glass; the claw
 * rides the rails all the way there.
 */
export default function ClawControls({
  depthControl,
  canMove,
  canGrab,
  showKeys,
  mystery,
  compact,
  onStick,
  onGrab,
}: {
  depthControl: boolean;
  canMove: boolean;
  canGrab: boolean;
  /** Desktop: show the keyboard hints under the buttons. */
  showKeys?: boolean;
  /** Mystery machine: the claw sweeps on its own, so only GRAB is shown. */
  mystery?: boolean;
  compact?: boolean;
  onStick: (x: number, z: number) => void;
  onGrab: () => void;
}) {
  const stick = compact ? 104 : 128;
  const grab = compact ? 88 : 104;
  return (
    <Stack direction="row" sx={{ alignItems: "flex-end", justifyContent: mystery ? "center" : "space-between", width: "100%", maxWidth: 560, mx: "auto", px: 1 }}>
      {!mystery && <AnalogStick size={stick} disabled={!canMove} onStick={onStick} />}
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
            width: grab,
            height: grab,
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
