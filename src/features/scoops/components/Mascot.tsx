"use client";

import { useId } from "react";

interface MascotProps {
  mood?: "happy" | "wow" | "love";
  size?: number;
  className?: string;
}

/** Shelby: a scoop in a paper hat. The shopkeeper, not the player's avatar. */
export function Mascot({ mood = "happy", size = 120, className }: MascotProps) {
  const gloss = useId().replace(/:/g, "");
  const mouth = mood === "wow" ? "M78 104 Q96 120 114 104" : "M78 108 Q96 122 114 108";
  return (
    <svg className={className ?? "mascot bob"} width={size} height={size} viewBox="0 0 160 160" aria-hidden>
      <ellipse cx="80" cy="148" rx="36" ry="8" fill="#e7b7a2" opacity="0.45" />
      <path d="M58 46 h44 l8 16 H50 z" fill="#fff" stroke="#f0d2b0" strokeWidth="3" />
      <rect x="72" y="28" width="16" height="20" rx="4" fill="#fff" stroke="#f0d2b0" strokeWidth="3" />
      <circle cx="80" cy="92" r="46" fill="#ffb7d5" />
      <circle cx="80" cy="92" r="46" fill={`url(#${gloss})`} />
      <circle cx="64" cy="86" r="5" fill="#4a2c4a" />
      <circle cx="96" cy="86" r="5" fill="#4a2c4a" />
      <circle cx="66" cy="84" r="1.6" fill="#fff" />
      <circle cx="98" cy="84" r="1.6" fill="#fff" />
      <ellipse cx="54" cy="98" rx="8" ry="5" fill="#ff8fb8" />
      <ellipse cx="106" cy="98" rx="8" ry="5" fill="#ff8fb8" />
      <path d={mouth} fill="none" stroke="#4a2c4a" strokeWidth="4" strokeLinecap="round" />
      {mood === "love" && <text x="118" y="46" fontSize="22">💗</text>}
      <defs>
        <radialGradient id={gloss} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
