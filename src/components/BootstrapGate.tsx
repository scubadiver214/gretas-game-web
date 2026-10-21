"use client";

import { useEffect, type ReactNode } from "react";

function hideSplash(): void {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  splash.style.display = "none";
  splash.setAttribute("hidden", "");
  splash.setAttribute("aria-busy", "false");
}

/**
 * Lifts the layout boot landing once React is running and the first app
 * frame has painted. The inline script in the root layout is only a failsafe
 * if client JS never arrives.
 */
export default function BootstrapGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    const hide = () => {
      if (cancelled) return;
      window.dispatchEvent(new Event("gretas-app-ready"));
      hideSplash();
    };
    const frame = requestAnimationFrame(() => requestAnimationFrame(hide));
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return children;
}
