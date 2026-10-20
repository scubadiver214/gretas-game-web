"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { N } from "@/design/neon";
import { useSettingsStore } from "@/features/settings/store";
import { runLoop, type GameEngine } from "../engine/GameEngine";
import { bindSwipe } from "../engine/input";
import { ThreeRenderer } from "../render/ThreeRenderer";

/**
 * Hosts the three.js view of the engine and drives the frame loop. The canvas
 * is created imperatively per mount so a strict-mode remount never reuses a
 * WebGL context that was just force-lost.
 */
export default function FroggerCanvas({ engine }: { engine: GameEngine }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
    canvas.setAttribute("aria-label", "Frogger game board");
    canvas.setAttribute("role", "img");
    host.appendChild(canvas);

    let renderer: ThreeRenderer;
    try {
      renderer = new ThreeRenderer(canvas, { reducedMotion: () => useSettingsStore.getState().reducedMotion });
    } catch (err) {
      console.error("[frogger] WebGL unavailable", err);
      canvas.remove();
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.attach(engine);

    const resize = () => renderer.resize(host.clientWidth, host.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const unbindSwipe = bindSwipe(canvas, (dir) => engine.input(dir));
    const stop = runLoop((dt) => {
      engine.advance(dt);
      renderer.render(dt);
    });

    return () => {
      stop();
      unbindSwipe();
      ro.disconnect();
      renderer.dispose();
      canvas.remove();
    };
  }, [engine]);

  return (
    <Box ref={hostRef} sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {failed && (
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", p: 3, textAlign: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 56 }} aria-hidden>
              🐸
            </Typography>
            <Typography variant="h4" sx={{ color: N.text }}>
              This device can&apos;t draw the 3D pond
            </Typography>
            <Typography sx={{ color: N.textSoft }}>Try a newer browser, or turn on hardware acceleration.</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
