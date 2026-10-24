"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { N } from "@/design/neon";
import { useSettingsStore } from "@/features/settings/store";
import type { WorldPalette } from "../content/worlds";
import { chooseAim } from "../engine/claw";
import { ClawEngine, runLoop } from "../engine/ClawEngine";
import { stickFromDrag } from "../engine/input";
import { setClawProjector } from "../fx";
import { ClawRenderer, type ViewInsets } from "../render/ClawRenderer";

/**
 * Hosts the three.js view of the engine and drives the frame loop. The canvas
 * is created imperatively per mount so a strict-mode remount never reuses a
 * WebGL context that was just force-lost. Dragging on the floor slides the
 * claw to that tile (out to the glass); a short tap still glides onto a toy.
 */
export default function ClawCanvas({ engine, palette, insets }: { engine: ClawEngine; palette: WorldPalette; insets: ViewInsets }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<ClawRenderer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
    canvas.setAttribute("aria-label", "Claw machine");
    canvas.setAttribute("role", "img");
    host.appendChild(canvas);

    let renderer: ClawRenderer;
    try {
      renderer = new ClawRenderer(canvas, { reducedMotion: () => useSettingsStore.getState().reducedMotion });
    } catch (err) {
      console.error("[claw] WebGL unavailable", err);
      canvas.remove();
      queueMicrotask(() => setFailed(true));
      return;
    }
    rendererRef.current = renderer;
    renderer.attach(engine);
    setClawProjector((x, y, z) => renderer.project(x, y, z));

    const resize = () => renderer.resize(host.clientWidth, host.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // Drag the 3D joystick like a stick, or drag across the floor: the claw
    // follows all the way to the glass. A short tap still glides onto a toy.
    let down: { x: number; y: number; id: number; dragged: boolean; stick: boolean } | null = null;
    const pointerOnCanvas = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { px: e.clientX - rect.left, py: e.clientY - rect.top };
    };
    const followFloor = (e: PointerEvent) => {
      if (engine.phase !== "positioning") return;
      const { px, py } = pointerOnCanvas(e);
      const tile = renderer.pickFloor(px, py);
      if (tile) engine.place(tile.x, tile.z);
    };
    const followStick = (e: PointerEvent) => {
      if (!down) return;
      const stick = stickFromDrag(e.clientX - down.x, e.clientY - down.y, 48);
      engine.setMove(stick.x, stick.z);
    };
    const onDown = (e: PointerEvent) => {
      const { px, py } = pointerOnCanvas(e);
      down = { x: e.clientX, y: e.clientY, id: e.pointerId, dragged: false, stick: renderer.pickStick(px, py) };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort; move/up still fire on the canvas */
      }
      if (down.stick) followStick(e);
      else followFloor(e);
    };
    const onMove = (e: PointerEvent) => {
      if (!down || down.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.dragged = true;
      if (down.stick) followStick(e);
      else if (down.dragged) followFloor(e);
    };
    const onUp = (e: PointerEvent) => {
      if (!down || down.id !== e.pointerId) return;
      const dragged = down.dragged;
      const stick = down.stick;
      down = null;
      if (stick) {
        engine.setMove(0, 0);
        return;
      }
      if (dragged || engine.phase !== "positioning") return;
      const { px, py } = pointerOnCanvas(e);
      const uid = renderer.pick(px, py);
      const toy = uid === null ? null : engine.toy(uid);
      const tile = renderer.pickFloor(px, py);
      const aim = chooseAim(tile, toy);
      if (aim) engine.moveTo(aim.x, aim.z);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const stop = runLoop((dt) => {
      engine.advance(dt);
      renderer.render(dt);
    });

    return () => {
      stop();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      ro.disconnect();
      setClawProjector(null);
      rendererRef.current = null;
      renderer.dispose();
      canvas.remove();
    };
  }, [engine]);

  useEffect(() => {
    rendererRef.current?.setWorld(palette);
  }, [palette]);

  useEffect(() => {
    rendererRef.current?.setInsets(insets);
  }, [insets]);

  return (
    <Box ref={hostRef} sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {failed && (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 56 }} aria-hidden>
              🧸
            </Typography>
            <Typography variant="h4" sx={{ color: N.text }}>
              This device can&apos;t draw the 3D claw machine
            </Typography>
            <Typography sx={{ color: N.textSoft }}>Try a newer browser, or turn on hardware acceleration.</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
