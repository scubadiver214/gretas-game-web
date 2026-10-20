"use client";

import Avatar from "@mui/material/Avatar";
import type { CharacterId } from "@/features/player/types";
import { DEFAULT_COLOR } from "@/features/player/types";

/** Coloured initial badge used on leaderboards and the hub. */
export default function PlayerAvatar({
  nickname,
  character,
  color,
  size = 36,
}: {
  nickname: string;
  character: CharacterId;
  color?: string | null;
  size?: number;
}) {
  const bg = color ?? DEFAULT_COLOR[character];
  return (
    <Avatar
      aria-hidden
      sx={{
        width: size,
        height: size,
        bgcolor: bg,
        color: "#fff",
        fontWeight: 900,
        fontSize: size * 0.5,
        fontFamily: "var(--font-display)",
        border: "2px solid rgba(234,242,255,0.85)",
        boxShadow: `0 0 10px ${bg}80`,
      }}
    >
      {nickname.trim().charAt(0).toUpperCase() || "?"}
    </Avatar>
  );
}
