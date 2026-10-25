"use client";

import { useEffect, useRef } from "react";
import type { RaceEngine } from "../engine/RaceEngine";

/**
 * Text that ticks every frame (the race clock, the speedometer) without React ever
 * re-rendering: a small animation-frame loop writes the string straight into the DOM
 * when it changes. `read` must be a stable function (declare it at module level).
 */
export default function LiveText({ engine, read }: { engine: RaceEngine; read: (engine: RaceEngine) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let id = 0;
    let last = "";
    const tick = () => {
      const next = read(engine);
      if (next !== last && ref.current) {
        ref.current.textContent = next;
        last = next;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [engine, read]);
  return <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }} />;
}
