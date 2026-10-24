"use client";

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { SettingsToggles } from "@/components/HUD";
import { CLIP, N, neonGlow, panelGlow, textGlow } from "@/design/neon";
import { usePlayerStore } from "@/features/player/store";
import AvatarBadge from "../components/AvatarBadge";
import SaveStatusChip from "../components/SaveStatusChip";
import { GAME_TITLE } from "../config";
import { MAX_LEVEL } from "../engine/difficulty";
import { useClawOutboxFlusher, useClawProfile } from "../hooks";
import { avatarCount, collectionStats, worldProgress, type WorldProgress } from "../profileStats";

/** A world's machine: palette-tinted card with level progress and its mystery machine. */
function WorldCard({ w, onPlay, onMystery }: { w: WorldProgress; onPlay: () => void; onMystery: () => void }) {
  const p = w.world.palette;
  const size = w.world.to - w.world.from + 1;
  return (
    <Box
      sx={{
        position: "relative",
        clipPath: CLIP.card,
        bgcolor: N.panel,
        border: `1px solid ${w.unlocked ? `${p.glow}80` : N.panelEdge}`,
        boxShadow: w.unlocked ? panelGlow(p.glow) : "0 4px 14px rgba(0,0,0,0.4)",
        overflow: "hidden",
        opacity: w.unlocked ? 1 : 0.75,
      }}
    >
      {/* Mini cabinet silhouette in the world's colours. */}
      <Box aria-hidden sx={{ height: 92, position: "relative", background: `linear-gradient(180deg, ${p.sky}, ${p.backdrop}55)` }}>
        <Box sx={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", width: 120, height: 78, bgcolor: p.cabinet, borderTop: `10px solid ${p.trim}`, borderLeft: `6px solid ${p.trim}`, borderRight: `6px solid ${p.trim}`, borderRadius: "6px 6px 0 0" }}>
          <Box sx={{ position: "absolute", inset: "8px 8px 0", bgcolor: `${p.backdrop}CC` }} />
          <Box sx={{ position: "absolute", left: "50%", top: 6, width: 3, height: 24, bgcolor: "#333A4B", transform: "translateX(-50%)" }} />
          <Box sx={{ position: "absolute", left: "50%", top: 28, width: 14, height: 10, bgcolor: "#DDE4F0", transform: "translateX(-50%)", clipPath: "polygon(0 0, 100% 0, 80% 100%, 20% 100%)" }} />
          <Box sx={{ position: "absolute", left: 10, right: 10, bottom: 0, height: 16, bgcolor: p.floor }} />
        </Box>
        {!w.unlocked && (
          <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", bgcolor: "rgba(5,8,13,0.5)" }}>
            <LockRoundedIcon sx={{ fontSize: 36, color: N.textSoft }} />
          </Box>
        )}
      </Box>
      <Box sx={{ p: 1.75 }}>
        <Typography component="h2" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "1.2rem", textTransform: "uppercase", letterSpacing: "0.03em", color: w.unlocked ? p.glow : N.textSoft, textShadow: w.unlocked ? `0 0 10px ${p.glow}66` : undefined }}>
          {w.world.name}
        </Typography>
        <Typography sx={{ color: N.textSoft, fontSize: "0.9rem", mb: 1 }}>{w.world.blurb}</Typography>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", mb: 1.25 }}>
          <Chip size="small" label={`Levels ${w.world.from}-${w.world.to}`} variant="outlined" />
          <Chip size="small" label={`${w.cleared}/${size} cleared`} sx={{ bgcolor: N.bgRaise }} />
          <Chip size="small" icon={<StarRoundedIcon />} label={`${w.stars}/${w.maxStars}`} sx={{ bgcolor: N.bgRaise, "& .MuiChip-icon": { color: N.sun } }} />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="contained" color="success" startIcon={w.unlocked ? <PlayArrowRoundedIcon /> : <LockRoundedIcon />} disabled={!w.unlocked} onClick={onPlay}>
            {w.unlocked ? `Level ${w.playLevel}` : `Clear level ${w.world.from - 1}`}
          </Button>
          {w.mysteryOpen && (
            <Button fullWidth variant="contained" color="warning" onClick={onMystery} sx={{ boxShadow: w.mysteryWon ? undefined : neonGlow(N.sun, 10) }}>
              {w.mysteryWon ? "Mystery again" : "Mystery!"}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const { profile, offline } = useClawProfile(nickname);
  const pending = useClawOutboxFlusher(nickname);
  const stats = collectionStats(profile);
  const avatars = avatarCount(profile);
  const worlds = worldProgress(profile);

  return (
    <PageContainer maxWidth={1080}>
      <Stack spacing={{ xs: 1.75, md: 2.5 }} sx={{ flex: 1, py: { xs: 1.5, md: 3 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Button variant="outlined" size="small" startIcon={<ArrowBackRoundedIcon />} onClick={() => router.push("/adventure")}>
            Games
          </Button>
          <ButtonBase onClick={() => router.push("/claw/avatars")} aria-label="My avatars" sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 46, pl: 0.5, pr: 1.5, clipPath: CLIP.button, bgcolor: N.panel, border: `1px solid ${N.panelEdge}` }}>
            <AvatarBadge avatarId={profile.selectedAvatar} nickname={nickname} character={character} color={color} size={34} />
            <Typography sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.text }}>{nickname}</Typography>
          </ButtonBase>
          <Box sx={{ flex: 1 }} />
          {(offline || pending > 0) && <SaveStatusChip status={offline ? "offline" : "saving"} pending={pending} compact />}
          <SettingsToggles size="small" />
        </Stack>

        <Box sx={{ textAlign: "center" }}>
          <Typography component="h1" sx={{ fontFamily: "var(--font-script), cursive", fontSize: "clamp(1.9rem, 8vw, 2.8rem)", lineHeight: 1.3, color: N.claw, textShadow: textGlow(N.claw) }}>
            {GAME_TITLE}
          </Typography>
          <Typography sx={{ color: N.textSoft, fontWeight: 700 }}>
            Level {profile.currentLevel} of {MAX_LEVEL} · {stats.unique} toys · {avatars.unlocked} avatars
          </Typography>
        </Box>

        {/* Big "continue" button for the youngest players: one tap into the newest level. */}
        <Button size="large" variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={() => router.push(`/play/claw?level=${profile.currentLevel}`)} sx={{ alignSelf: "center", minWidth: 260, fontSize: "1.25rem" }}>
          Play level {profile.currentLevel}
        </Button>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: { xs: 1.25, md: 2 } }}>
          {worlds.map((w) => (
            <WorldCard key={w.world.id} w={w} onPlay={() => router.push(`/play/claw?level=${w.playLevel}`)} onMystery={() => router.push(`/play/claw?mystery=${w.world.id}`)} />
          ))}
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {(
            [
              { label: `Toy collection · ${stats.unique}/${stats.catalog}`, to: "/claw/collection", accent: N.brand },
              { label: `Avatars · ${avatars.unlocked}/${avatars.total}`, to: "/claw/avatars", accent: N.wordle },
              { label: "My progress", to: "/claw/progress", accent: N.sun },
            ] as const
          ).map(({ label, to, accent }) => (
            <ButtonBase
              key={to}
              onClick={() => router.push(to)}
              sx={{ flex: 1, minHeight: 52, clipPath: CLIP.button, color: accent, border: `1px solid ${accent}59`, fontFamily: "var(--font-arcade)", fontWeight: 600, fontSize: "0.95rem", letterSpacing: "0.05em", textTransform: "uppercase", "&:hover": { bgcolor: `${accent}14`, boxShadow: `0 0 12px ${accent}40` } }}
            >
              {label}
            </ButtonBase>
          ))}
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export default function ArcadeSelect() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
