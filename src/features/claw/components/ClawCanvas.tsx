"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { N } from "@/design/neon";
import { useSettingsStore } from "@/features/settings/store";
import type { WorldPalette } from "../content/worlds";
import { ClawEngine, runLoop } from "../engine/ClawEngine";
import { setClawProjector } from "../fx";
import { ClawRenderer, type ViewInsets } from "../render/ClawRenderer";

/**
 * Hosts the three.js view of the engine and drives the frame loop. The canvas
 * is created imperatively per mount so a strict-mode remount never reuses a
 * WebGL context that was just force-lost. Tapping a toy glides the claw to it.
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

    // Tap a toy to aim at it (only while the player can move the claw).
    let down: { x: number; y: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 12 || engine.phase !== "positioning") return;
      const rect = canvas.getBoundingClientRect();
      const uid = renderer.pick(e.clientX - rect.left, e.clientY - rect.top);
      const toy = uid === null ? null : engine.toy(uid);
      if (toy && toy.status === "resting") engine.moveTo(toy.x, toy.z);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    const stop = runLoop((dt) => {
      engine.advance(dt);
      renderer.render(dt);
    });

    return () => {
      stop();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
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
