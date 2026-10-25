"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import { useSettingsStore } from "@/features/settings/store";
import { runLoop } from "@/lib/game/loop";
import type { RaceEngine } from "../engine/RaceEngine";
import { useRacingSettings } from "../settings";
import type { VehicleStyle } from "../render/vehicle/styles";
import { RacingRenderer } from "../render/RacingRenderer";

/**
 * Hosts the three.js view of the engine and drives the frame loop. The canvas is
 * created imperatively per mount so a strict-mode remount never reuses a WebGL
 * context that was just force-lost. The world builds on the first frame after a
 * paint, so the loading screen shows first.
 */
export default function RacingCanvas({ engine, styles, lowPower, onReady, onFail }: { engine: RaceEngine; styles: readonly VehicleStyle[]; lowPower: boolean; onReady: () => void; onFail: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onFail });
  useEffect(() => {
    callbacks.current = { onReady, onFail };
  }, [onReady, onFail]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;outline:none";
    canvas.setAttribute("aria-label", "The Fitz and Furious race track");
    canvas.setAttribute("role", "img");
    host.appendChild(canvas);

    let renderer: RacingRenderer;
    try {
      renderer = new RacingRenderer(canvas, {
        reducedMotion: () => useSettingsStore.getState().reducedMotion,
        cameraDistance: () => useRacingSettings.getState().cameraDistance,
        lowPower,
      });
    } catch (err) {
      console.error("[racing] WebGL unavailable", err);
      canvas.remove();
      queueMicrotask(() => callbacks.current.onFail());
      return;
    }

    let stop = () => {};
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    // Two frames: one for the loading screen to paint, then the (synchronous) world build.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          renderer.load(engine.track, engine.content);
          renderer.attach(engine, styles);
        } catch (err) {
          console.error("[racing] could not build the track", err);
          callbacks.current.onFail();
          return;
        }
        const resize = () => renderer.resize(host.clientWidth, host.clientHeight);
        resize();
        ro = new ResizeObserver(resize);
        ro.observe(host);
        stop = runLoop((dt) => {
          engine.advance(dt);
          renderer.render(dt);
        });
        callbacks.current.onReady();
      }),
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stop();
      ro?.disconnect();
      renderer.dispose();
      canvas.remove();
    };
  }, [engine, styles, lowPower]);

  return <Box ref={hostRef} sx={{ position: "absolute", inset: 0, overflow: "hidden" }} />;
}
