"use client";

import Box from "@mui/material/Box";
import PlayerAvatar from "@/components/PlayerAvatar";
import type { CharacterId } from "@/features/player/types";
import { AVATAR_BY_ID } from "../content/avatars";
import { AvatarArt } from "../content/avatarArt";
import { RARITY_COLORS } from "./rarity";

/**
 * The player's chosen claw avatar as a round badge, falling back to the
 * coloured-initial badge when none is selected yet.
 */
export default function AvatarBadge({
  avatarId,
  nickname,
  character,
  color,
  size = 36,
}: {
  avatarId: string | null | undefined;
  nickname: string;
  character: CharacterId;
  color?: string | null;
  size?: number;
}) {
  const avatar = avatarId ? AVATAR_BY_ID[avatarId] : undefined;
  if (!avatar) return <PlayerAvatar nickname={nickname} character={character} color={color} size={size} />;
  const ring = RARITY_COLORS[avatar.rarity];
  return (
    <Box
      aria-label={`${avatar.name} avatar`}
      role="img"
      sx={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `2px solid ${ring}`, boxShadow: `0 0 10px ${ring}80`, flexShrink: 0, display: "grid" }}
    >
      <AvatarArt art={avatar.art} palette={avatar.palette} size={size - 4} />
    </Box>
  );
}
