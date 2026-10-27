"use client";

import { useEffect } from "react";

export default function ScoopsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[scoops]", error);
  }, [error]);
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
        background: "linear-gradient(#9fe7ff, #fff6ea)",
        color: "#4a2c4a",
        fontFamily: "var(--font-display), sans-serif",
      }}
    >
      <div>
        <h1 style={{ fontSize: "2rem" }}>🍦 Oops! Shelby dropped that scoop. Let&apos;s try again!</h1>
        <button
          type="button"
          onClick={reset}
          style={{ marginTop: 16, minHeight: 52, padding: "10px 18px", borderRadius: 999, border: 0, background: "#ff6fa5", color: "#fff", font: "inherit", fontWeight: 800 }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
