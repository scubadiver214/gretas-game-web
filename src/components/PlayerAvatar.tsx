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
        border: "2px solid #fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      }}
    >
      {nickname.trim().charAt(0).toUpperCase() || "?"}
    </Avatar>
  );
}
