"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CountPill from "@/components/ui/CountPill";
import { CLIP, N } from "@/design/neon";
import { useFroggerHud } from "../useFroggerHud";

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

export function ScoreAndBest({ best }: { best: number }) {
  const score = useFroggerHud((s) => s.score);
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
      <Box sx={chipSx} aria-label={`High score ${Math.max(best, score)}`}>
        <EmojiEventsRoundedIcon sx={{ fontSize: 18, color: N.sun }} />
        <span className="tnum">HI {Math.max(best, score)}</span>
      </Box>
      <CountPill icon={<StarRoundedIcon />} value={score} tone="sun" label={`Score ${score}`} />
    </Stack>
  );
}

/** Lives, level and the five home bays. */
export function StatusRow() {
  const lives = useFroggerHud((s) => s.lives);
  const level = useFroggerHud((s) => s.level);
  const homes = useFroggerHud((s) => s.homes);
  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Box sx={chipSx} aria-label={`${lives} ${lives === 1 ? "life" : "lives"} left`}>
        {Array.from({ length: lives }).map((_, i) => (
          <Box key={i} component="span" aria-hidden sx={{ fontSize: 17, lineHeight: 1 }}>
            🐸
          </Box>
        ))}
        {lives === 0 && <span>0</span>}
      </Box>
      <Box sx={{ ...chipSx, color: N.frogger, borderColor: `${N.frogger}59` }} aria-label={`Level ${level}`}>
        LV {level}
      </Box>
      <Box sx={chipSx} aria-label={`${homes.filter(Boolean).length} of 5 home bays filled`}>
        {homes.map((filled, i) => (
          <Box
            key={i}
            aria-hidden
            sx={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              bgcolor: filled ? N.frogger : "transparent",
              border: `2px solid ${filled ? N.frogger : N.textSoft}`,
              boxShadow: filled ? `0 0 8px ${N.frogger}` : undefined,
              transition: "background-color 200ms",
            }}
          />
        ))}
      </Box>
    </Stack>
  );
}

/** Per-frog countdown: a chunky bar that turns red in the last ten seconds. */
export function TimerBar() {
  const timeLeft = useFroggerHud((s) => s.timeLeft);
  const timerSeconds = useFroggerHud((s) => s.timerSeconds);
  const phase = useFroggerHud((s) => s.phase);
  const pct = Math.max(0, Math.min(100, (timeLeft / Math.max(1, timerSeconds)) * 100));
  const urgent = timeLeft <= 10;
  const color = urgent ? N.kitchen : timeLeft <= timerSeconds / 2 ? N.sun : N.frogger;
  // The bar glides between whole-second updates instead of re-rendering per frame.
  const ticking = phase === "playing";
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color, minWidth: 44, textAlign: "right" }}>
        {timeLeft}s
      </Typography>
      <Box
        role="progressbar"
        aria-label="Time left for this frog"
        aria-valuenow={timeLeft}
        aria-valuemin={0}
        aria-valuemax={timerSeconds}
        sx={{ flex: 1, height: 14, borderRadius: 999, bgcolor: "rgba(15,22,36,0.9)", border: `1px solid ${N.panelEdge}`, overflow: "hidden" }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${pct}%`,
            bgcolor: color,
            boxShadow: `0 0 10px ${color}99`,
            transition: ticking ? "width 1s linear, background-color 300ms" : "none",
            animation: urgent && ticking ? "timerPulse 600ms ease-in-out infinite" : undefined,
            "@keyframes timerPulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.55 } },
          }}
        />
      </Box>
    </Stack>
  );
}
