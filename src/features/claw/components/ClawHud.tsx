"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CountPill from "@/components/ui/CountPill";
import { CLIP, N } from "@/design/neon";
import type { HintDir } from "../engine/types";
import { useClawHud } from "../useClawHud";

const chipSx = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.5,
  height: 34,
  px: 1.1,
  clipPath: CLIP.button,
  bgcolor: "rgba(19,27,42,0.88)",
  border: `1px solid ${N.panelEdge}`,
  color: N.text,
  fontFamily: "var(--font-arcade)",
  fontWeight: 700,
  fontSize: "0.95rem",
  whiteSpace: "nowrap",
} as const;

export function PointsPill() {
  const points = useClawHud((s) => s.points);
  return <CountPill icon={<StarRoundedIcon />} value={points} tone="sun" label={`${points} points`} />;
}

/** Level chip plus one pip per prize needed; filled pips are prizes already won. */
export function LevelAndGoal({ worldName, accent, mystery }: { worldName?: string; accent?: string; mystery?: boolean }) {
  const level = useClawHud((s) => s.level);
  const goal = useClawHud((s) => s.goal);
  const successes = useClawHud((s) => s.successes);
  const color = accent ?? N.claw;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Box sx={{ ...chipSx, color, borderColor: `${color}59` }} aria-label={mystery ? `Mystery machine${worldName ? `, ${worldName}` : ""}` : `Level ${level}${worldName ? `, ${worldName}` : ""}`}>
        {mystery ? "MYSTERY" : `LV ${level}`}
      </Box>
      <Box sx={chipSx} aria-label={`${successes} of ${goal} prizes won`}>
        <span aria-hidden>🧸</span>
        {Array.from({ length: goal }).map((_, i) => (
          <Box
            key={i}
            aria-hidden
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: i < successes ? color : "transparent",
              border: `2px solid ${i < successes ? color : N.textSoft}`,
              boxShadow: i < successes ? `0 0 8px ${color}` : undefined,
              transition: "background-color 200ms",
            }}
          />
        ))}
      </Box>
    </Stack>
  );
}

const HINT_ICON: Record<HintDir, React.ReactNode> = {
  left: <ArrowBackRoundedIcon />,
  right: <ArrowForwardRoundedIcon />,
  back: <ArrowUpwardRoundedIcon />,
  forward: <ArrowDownwardRoundedIcon />,
  here: <StarRoundedIcon />,
};

const HINT_TEXT: Record<HintDir, string> = {
  left: "Try the glowing toy: move left",
  right: "Try the glowing toy: move right",
  back: "Try the glowing toy: press up",
  forward: "Try the glowing toy: press down",
  here: "Right here! Press GRAB",
};

/** Appears after a few misses: points the player at the highlighted toy. */
export function HintBanner() {
  const hint = useClawHud((s) => s.hint);
  const phase = useClawHud((s) => s.phase);
  if (!hint || phase !== "positioning") return null;
  return (
    <Box
      role="status"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        height: 42,
        clipPath: CLIP.button,
        bgcolor: N.sun,
        color: N.bg,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        boxShadow: `0 0 18px ${N.sun}80`,
        animation: "hintPop 400ms cubic-bezier(.2,1.6,.4,1)",
        "@keyframes hintPop": { from: { transform: "scale(0.6)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
      }}
    >
      {HINT_ICON[hint]}
      <Typography component="span" sx={{ fontWeight: 800 }}>
        {HINT_TEXT[hint]}
      </Typography>
    </Box>
  );
}
