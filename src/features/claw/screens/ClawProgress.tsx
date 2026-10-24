"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import Panel from "@/components/ui/Panel";
import { CLIP, N } from "@/design/neon";
import { ACHIEVEMENTS } from "@/features/player/achievements";
import { usePlayerStore } from "@/features/player/store";
import AvatarBadge from "../components/AvatarBadge";
import ClawPageHeader from "../components/ClawPageHeader";
import { MAX_LEVEL } from "../engine/difficulty";
import { useClawProfile } from "../hooks";
import { avatarCount, collectionStats, worldProgress } from "../profileStats";

function Stat({ label, value, accent = N.text }: { label: string; value: string | number; accent?: string }) {
  return (
    <Box sx={{ p: 1.5, clipPath: CLIP.card, bgcolor: N.panel, border: `1px solid ${N.panelEdge}`, textAlign: "center" }}>
      <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "1.6rem", lineHeight: 1, color: accent }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: N.textSoft, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Typography>
    </Box>
  );
}

function Inner() {
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const achievements = usePlayerStore((s) => s.achievements);
  const { profile } = useClawProfile(nickname);
  const stats = collectionStats(profile);
  const worlds = worldProgress(profile);
  const avatars = avatarCount(profile);
  const cleared = profile.levels.length;
  const totalStars = profile.levels.reduce((n, l) => n + l.stars, 0);
  const successRate = profile.totalGrabs === 0 ? 0 : Math.round((profile.successfulGrabs / profile.totalGrabs) * 100);
  const clawTrophies = ACHIEVEMENTS.filter((a) => a.id.startsWith("claw-"));

  return (
    <PageContainer maxWidth={720}>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <ClawPageHeader
          title="My Progress"
          subtitle={`${nickname}, you are on level ${profile.currentLevel} of ${MAX_LEVEL}.`}
          right={<AvatarBadge avatarId={profile.selectedAvatar} nickname={nickname} character={character} color={color} size={30} />}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 1.25 }}>
          <Stat label="Points" value={profile.points} accent={N.sun} />
          <Stat label="Levels cleared" value={`${cleared}/${MAX_LEVEL}`} accent={N.claw} />
          <Stat label="Toys found" value={`${stats.unique}/${stats.catalog}`} accent={N.brand} />
          <Stat label="Avatars" value={`${avatars.unlocked}/${avatars.total}`} accent={N.wordle} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" }, gap: 1.25 }}>
          <Stat label="Stars" value={`${totalStars}/${MAX_LEVEL * 3}`} accent={N.sun} />
          <Stat label="Grabs" value={profile.totalGrabs} />
          <Stat label="Grabs that won" value={`${successRate}%`} accent={N.brand} />
        </Box>

        <Typography variant="h3" component="h2" sx={{ mt: 1 }}>
          Worlds
        </Typography>
        <Stack spacing={1.25}>
          {worlds.map((w) => (
            <Panel key={w.world.id} accent={w.unlocked ? w.world.palette.glow : undefined} padding={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.75 }}>
                <Typography sx={{ flex: 1, fontFamily: "var(--font-arcade)", fontWeight: 700, color: w.unlocked ? w.world.palette.glow : N.textSoft, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {w.world.name}
                </Typography>
                {!w.unlocked && <LockRoundedIcon sx={{ color: N.textSoft }} />}
                <Chip size="small" icon={<StarRoundedIcon />} label={`${w.stars}/${w.maxStars}`} sx={{ bgcolor: N.bgRaise, "& .MuiChip-icon": { color: N.sun } }} />
                {w.mysteryWon ? <Chip size="small" label="Mystery prize won" sx={{ bgcolor: N.sun, color: N.bg, fontWeight: 700 }} /> : w.mysteryOpen ? <Chip size="small" label="Mystery open" variant="outlined" /> : null}
              </Stack>
              <Stack direction="row" spacing={0.5}>
                {Array.from({ length: w.world.to - w.world.from + 1 }, (_, i) => {
                  const level = w.world.from + i;
                  const entry = profile.levels.find((l) => l.level === level);
                  const reachable = level <= profile.currentLevel;
                  return (
                    <Box
                      key={level}
                      aria-label={entry ? `Level ${level}, ${entry.stars} stars` : reachable ? `Level ${level}, not cleared yet` : `Level ${level}, locked`}
                      sx={{ flex: 1, height: 26, borderRadius: 1, display: "grid", placeItems: "center", bgcolor: entry ? w.world.palette.glow : reachable ? N.bgRaise : "transparent", border: `1px solid ${entry ? w.world.palette.glow : N.panelEdge}`, color: entry ? N.bg : N.textSoft, fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "0.8rem" }}
                    >
                      {entry ? "★".repeat(entry.stars) : level}
                    </Box>
                  );
                })}
              </Stack>
            </Panel>
          ))}
        </Stack>

        {clawTrophies.length > 0 && (
          <>
            <Typography variant="h3" component="h2" sx={{ mt: 1 }}>
              Claw trophies
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {clawTrophies.map((a) => {
                const got = !!achievements[a.id];
                return (
                  <Chip
                    key={a.id}
                    label={`${a.emoji} ${a.title}`}
                    title={a.description}
                    aria-label={`${a.title}: ${a.description}${got ? " (earned)" : ""}`}
                    sx={{ bgcolor: got ? N.sun : N.bgRaise, border: `1px solid ${got ? N.sun : N.panelEdge}`, color: got ? N.bg : N.textSoft, fontWeight: 800, boxShadow: got ? `0 0 12px ${N.sun}80` : undefined, filter: got ? "none" : "grayscale(1)" }}
                  />
                );
              })}
            </Stack>
          </>
        )}
      </Stack>
    </PageContainer>
  );
}

export default function ClawProgress() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
