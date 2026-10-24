"use client";

import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import Panel from "@/components/ui/Panel";
import { CLIP, N } from "@/design/neon";
import { usePlayerStore } from "@/features/player/store";
import { fx } from "@/lib/fx";
import ClawPageHeader from "../components/ClawPageHeader";
import { RARITY_COLORS } from "../components/rarity";
import { AVATARS, type AvatarDef } from "../content/avatars";
import { AvatarArt } from "../content/avatarArt";
import { RARITY_LABELS } from "../content/prizes";
import { nextAvatar } from "../engine/rewards";
import { useClawProfile, useSelectAvatar } from "../hooks";
import { milestoneContext } from "../profileStats";

function AvatarCard({ avatar, unlockedAt, selected, onSelect }: { avatar: AvatarDef; unlockedAt: string | undefined; selected: boolean; onSelect: () => void }) {
  const unlocked = !!unlockedAt;
  const accent = RARITY_COLORS[avatar.rarity];
  return (
    <ButtonBase
      disabled={!unlocked}
      onClick={onSelect}
      aria-label={unlocked ? `${avatar.name}${selected ? ", your avatar" : ", tap to wear"}` : `${avatar.name}, locked: ${avatar.earnedBy}`}
      aria-pressed={unlocked ? selected : undefined}
      sx={{
        position: "relative",
        flexDirection: "column",
        p: 1.5,
        textAlign: "center",
        clipPath: CLIP.card,
        bgcolor: N.panel,
        border: `1px solid ${selected ? accent : unlocked ? `${accent}80` : N.panelEdge}`,
        boxShadow: selected ? `0 0 22px ${accent}66` : unlocked ? `0 0 12px ${accent}26` : "none",
        outline: selected ? `3px solid ${accent}` : "3px solid transparent",
        outlineOffset: -3,
        "&.Mui-disabled": { opacity: 0.85 },
      }}
    >
      {selected && (
        <Box sx={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: "50%", bgcolor: accent, display: "grid", placeItems: "center" }}>
          <CheckRoundedIcon sx={{ fontSize: 18, color: N.bg }} />
        </Box>
      )}
      <AvatarArt art={avatar.art} palette={avatar.palette} size={84} locked={!unlocked} />
      <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, mt: 0.75, color: unlocked ? N.text : N.textSoft, lineHeight: 1.15 }}>{avatar.name}</Typography>
      <Chip label={RARITY_LABELS[avatar.rarity]} size="small" sx={{ mt: 0.5, bgcolor: unlocked ? accent : N.panelEdge, color: unlocked ? N.bg : N.textSoft, fontWeight: 700, height: 22 }} />
      <Typography variant="body2" sx={{ color: N.textSoft, mt: 0.5, fontSize: "0.82rem", minHeight: 36 }}>
        {avatar.earnedBy}
      </Typography>
      {unlockedAt && (
        <Typography variant="caption" sx={{ color: N.textSoft }}>
          {new Date(unlockedAt).toLocaleDateString()}
        </Typography>
      )}
    </ButtonBase>
  );
}

function Inner() {
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const { profile } = useClawProfile(nickname);
  const select = useSelectAvatar(nickname);
  const unlockedAt = new Map(profile.avatars.map((a) => [a.avatarId, a.unlockedAt]));
  const next = nextAvatar(milestoneContext(profile), unlockedAt.keys());
  const sorted = [...AVATARS].sort((a, b) => Number(unlockedAt.has(b.id)) - Number(unlockedAt.has(a.id)));

  return (
    <PageContainer maxWidth={900}>
      <Stack spacing={2} sx={{ flex: 1, py: 2 }}>
        <ClawPageHeader
          title="My Avatars"
          subtitle="Earn avatars by playing. Tap one you have unlocked to wear it."
          right={
            <>
              <span aria-hidden>🏅</span>
              <span className="tnum">
                {profile.avatars.length} / {AVATARS.length}
              </span>
            </>
          }
        />

        {next && (
          <Panel accent={RARITY_COLORS[next.avatar.rarity]} padding={1.5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <AvatarArt art={next.avatar.art} palette={next.avatar.palette} size={64} locked />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.sun, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.9rem" }}>
                  Next up: {next.avatar.name}
                </Typography>
                <Typography sx={{ color: N.textSoft, fontSize: "0.9rem" }}>{next.avatar.earnedBy}</Typography>
                <Box role="progressbar" aria-label={`${next.current} of ${next.target}`} aria-valuenow={next.current} aria-valuemin={0} aria-valuemax={next.target} sx={{ mt: 0.75, height: 10, borderRadius: 999, bgcolor: N.bgRaise, border: `1px solid ${N.panelEdge}`, overflow: "hidden" }}>
                  <Box sx={{ width: `${Math.min(100, (next.current / Math.max(1, next.target)) * 100)}%`, height: "100%", bgcolor: N.sun, boxShadow: `0 0 10px ${N.sun}99` }} />
                </Box>
              </Box>
              <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.text }}>
                {next.current}/{next.target}
              </Typography>
            </Stack>
          </Panel>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(156px, 1fr))", gap: 1.5 }}>
          {sorted.map((a) => (
            <AvatarCard
              key={a.id}
              avatar={a}
              unlockedAt={unlockedAt.get(a.id)}
              selected={profile.selectedAvatar === a.id}
              onSelect={() => {
                if (profile.selectedAvatar === a.id) return;
                fx.unlocked();
                select.mutate({ character, color, avatarId: a.id });
              }}
            />
          ))}
        </Box>
      </Stack>
    </PageContainer>
  );
}

export default function AvatarCollection() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
