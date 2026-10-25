"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import type { RaceEngine } from "../engine/RaceEngine";
import { R } from "./hudStyle";

/**
 * The course outline with the cars on it. The outline is drawn once into an
 * offscreen canvas; each frame only the dots move, so it costs next to nothing.
 */
export default function Minimap({ engine, size, colors }: { engine: RaceEngine; size: number; colors: readonly string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef(colors);
  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const track = engine.track;

    // Fit the track's bounding box into the square, keeping its shape.
    const b = track.bounds;
    const pad = 14 * dpr;
    const w = b.maxX - b.minX;
    const h = b.maxZ - b.minZ;
    const scale = Math.min((canvas.width - pad * 2) / w, (canvas.height - pad * 2) / h);
    const ox = (canvas.width - w * scale) / 2 - b.minX * scale;
    const oy = (canvas.height - h * scale) / 2 - b.minZ * scale;
    const mx = (x: number) => x * scale + ox;
    const my = (z: number) => z * scale + oy;

    const layer = document.createElement("canvas");
    layer.width = canvas.width;
    layer.height = canvas.height;
    const lc = layer.getContext("2d")!;
    lc.lineJoin = "round";
    lc.lineCap = "round";
    const path = () => {
      lc.beginPath();
      for (let i = 0; i < track.count; i++) {
        if (i === 0) lc.moveTo(mx(track.px[i]), my(track.pz[i]));
        else lc.lineTo(mx(track.px[i]), my(track.pz[i]));
      }
      lc.closePath();
    };
    // White halo, dark core, like the reference.
    path();
    lc.strokeStyle = "rgba(255,255,255,0.9)";
    lc.lineWidth = 9 * dpr;
    lc.stroke();
    path();
    lc.strokeStyle = "#1b1306";
    lc.lineWidth = 4.5 * dpr;
    lc.stroke();
    // Start / finish tick.
    const g = track.checkpoints[0];
    lc.strokeStyle = R.red;
    lc.lineWidth = 3.2 * dpr;
    lc.beginPath();
    lc.moveTo(mx(g.x - g.tz * 11), my(g.z + g.tx * 11));
    lc.lineTo(mx(g.x + g.tz * 11), my(g.z - g.tx * 11));
    lc.stroke();

    let id = 0;
    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(layer, 0, 0);
      for (let i = engine.vehicles.length - 1; i >= 0; i--) {
        const v = engine.vehicles[i];
        const isPlayer = i === engine.playerIndex;
        const x = mx(v.x);
        const y = my(v.z);
        ctx.save();
        ctx.translate(x, y);
        // Forward is (sin h, cos h) in (x, z), which is the canvas direction (x right, y down).
        ctx.rotate(Math.PI / 2 - v.heading);
        const r = (isPlayer ? 8.5 : 6) * dpr;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(-r * 0.75, r * 0.7);
        ctx.lineTo(-r * 0.4, 0);
        ctx.lineTo(-r * 0.75, -r * 0.7);
        ctx.closePath();
        ctx.fillStyle = colorsRef.current[i] ?? (isPlayer ? R.pink : "#46a0ff");
        ctx.fill();
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.restore();
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [engine, size]);

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      aria-label="Track map"
      role="img"
      sx={{ width: size, height: size, display: "block", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.45))" }}
    />
  );
}
