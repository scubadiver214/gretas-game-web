"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import Panel from "@/components/ui/Panel";
import { N, textGlow } from "@/design/neon";
import { AVATAR_BY_ID } from "../content/avatars";
import { PRIZE_BY_ID } from "../content/prizes";
import type { LevelSummary } from "../engine/types";
import { RARITY_COLORS } from "./rarity";

/** Three fat stars that pop in one after another. */
export function StarRow({ stars, size = 52 }: { stars: number; size?: number }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }} aria-label={`${stars} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <StarRoundedIcon
          key={i}
          sx={{
            fontSize: size,
            color: i < stars ? N.sun : N.panelEdge,
            filter: i < stars ? `drop-shadow(0 0 10px ${N.sun})` : undefined,
            animation: i < stars ? `starIn 500ms ${i * 220}ms both cubic-bezier(.2,1.6,.4,1)` : undefined,
            "@keyframes starIn": { from: { transform: "scale(0) rotate(-90deg)" }, to: { transform: "none" } },
          }}
        />
      ))}
    </Stack>
  );
}

export default function LevelClearCard({
  summary,
  accent,
  hasNext,
  mystery,
  unlockedAvatars = [],
  mysteryUnlocked,
  saveState,
  onNext,
  onReplay,
  onArcade,
  onMystery,
}: {
  summary: LevelSummary;
  accent: string;
  hasNext: boolean;
  /** The summary is for a mystery machine rather than a numbered level. */
  mystery?: boolean;
  unlockedAvatars?: string[];
  /** Set when this clear opened the world's mystery machine. */
  mysteryUnlocked?: boolean;
  /** Slot for the save status chip. */
  saveState?: React.ReactNode;
  onNext: () => void;
  onReplay: () => void;
  onArcade: () => void;
  onMystery?: () => void;
}) {
  const prizes = summary.prizes.map((id) => PRIZE_BY_ID[id]).filter(Boolean);
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 6, display: "grid", placeItems: "center", p: 2, bgcolor: "rgba(5,8,13,0.68)", overflow: "auto" }}>
      <Panel accent={accent} padding={2.25} sx={{ maxWidth: 420, width: "100%" }}>
        <Stack spacing={1.25} sx={{ alignItems: "center", textAlign: "center" }}>
          <Typography variant="h2" component="h2" sx={{ color: accent, textShadow: textGlow(accent) }}>
            {mystery ? "Mystery prize won!" : `Level ${summary.level} cleared!`}
          </Typography>
          <StarRow stars={summary.stars} />
          <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontSize: "2.2rem", lineHeight: 1, color: N.text }}>
            {summary.points} <span style={{ fontSize: "1rem", color: N.textSoft }}>points</span>
          </Typography>
          <Typography sx={{ color: N.textSoft }}>
            {summary.successes} {summary.successes === 1 ? "prize" : "prizes"} in {summary.grabs} {summary.grabs === 1 ? "grab" : "grabs"}
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }}>
            {prizes.map((p, i) => (
              <Chip key={`${p.id}-${i}`} label={p.name} sx={{ bgcolor: `${RARITY_COLORS[p.rarity]}26`, border: `1px solid ${RARITY_COLORS[p.rarity]}80`, color: N.text }} />
            ))}
          </Stack>
          {unlockedAvatars.length > 0 && (
            <Box sx={{ width: "100%", p: 1.25, bgcolor: `${N.sun}1A`, border: `1px solid ${N.sun}66`, borderRadius: 2 }}>
              <Typography sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.sun, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                New avatar unlocked!
              </Typography>
              <Typography sx={{ color: N.text, fontWeight: 800 }}>{unlockedAvatars.map((id) => AVATAR_BY_ID[id]?.name ?? id).join(" · ")}</Typography>
            </Box>
          )}
          {mysteryUnlocked && onMystery && (
            <Button fullWidth variant="contained" color="warning" onClick={onMystery}>
              Mystery machine unlocked!
            </Button>
          )}
          {saveState}
          {hasNext ? (
            <Button size="large" fullWidth variant="contained" color="success" endIcon={<ArrowForwardRoundedIcon />} onClick={onNext} autoFocus>
              Next level
            </Button>
          ) : mystery ? (
            <Button size="large" fullWidth variant="contained" color="success" onClick={onArcade} autoFocus>
              Back to the arcade
            </Button>
          ) : (
            <Typography sx={{ color: N.sun, fontWeight: 800 }}>You cleared every level. You are the Claw Champion!</Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button fullWidth variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={onReplay}>
              Play again
            </Button>
            {!mystery && (
              <Button fullWidth variant="text" onClick={onArcade}>
                Arcade
              </Button>
            )}
          </Stack>
        </Stack>
      </Panel>
    </Box>
  );
}
