"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import { ScorePill } from "@/components/HUD";
import { N } from "@/design/neon";
import { SHIFT_CLOCK } from "../config";
import { comboMultiplier } from "../engine/scoring";
import { useKitchenHud } from "../useKitchenHud";

/** "12:45" on the shift clock for the time that has passed. */
export function shiftClock(timeLeft: number, shiftSeconds: number): string {
  const done = shiftSeconds > 0 ? 1 - timeLeft / shiftSeconds : 0;
  const minutes = Math.round(SHIFT_CLOCK.openMinutes + done * (SHIFT_CLOCK.closeMinutes - SHIFT_CLOCK.openMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")}`;
}

const pill = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  height: 40,
  px: 1.25,
  borderRadius: 999,
  bgcolor: N.panel,
  border: `1px solid ${N.panelEdge}`,
  boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
} as const;

export function ClockPill() {
  const timeLeft = useKitchenHud((s) => s.timeLeft);
  const shiftSeconds = useKitchenHud((s) => s.shiftSeconds);
  const rush = useKitchenHud((s) => s.rush);
  const urgent = timeLeft <= 30;
  return (
    <Box
      aria-label={`${timeLeft} seconds left in the shift`}
      sx={{
        ...pill,
        bgcolor: urgent ? N.kitchen : rush ? `${N.sun}22` : N.panel,
        borderColor: rush ? N.sun : N.panelEdge,
        color: urgent ? N.white : N.text,
      }}
    >
      <ScheduleRoundedIcon sx={{ fontSize: 20, color: urgent ? N.white : rush ? N.sun : N.delivery }} />
      <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "1.05rem" }}>
        {shiftClock(timeLeft, shiftSeconds)}
      </Typography>
      <Typography className="tnum" sx={{ fontSize: "0.78rem", color: urgent ? N.white : N.textSoft }}>
        {timeLeft}s
      </Typography>
    </Box>
  );
}

export function ComboPill() {
  const combo = useKitchenHud((s) => s.combo);
  if (combo < 1) return null;
  const hot = combo >= 3;
  return (
    <Box
      key={combo}
      aria-label={`${combo} correct pizzas in a row`}
      sx={{
        ...pill,
        bgcolor: hot ? N.kitchen : N.panel,
        borderColor: hot ? N.kitchenDeep : N.panelEdge,
        boxShadow: hot ? `0 0 18px ${N.kitchen}80` : pill.boxShadow,
        animation: "comboPop 260ms cubic-bezier(.2,1.6,.4,1)",
        "@keyframes comboPop": { from: { transform: "scale(1.25)" }, to: { transform: "scale(1)" } },
      }}
    >
      <LocalFireDepartmentRoundedIcon sx={{ fontSize: 20, color: hot ? N.sun : N.delivery }} />
      <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.white }}>
        x{comboMultiplier(combo)}
      </Typography>
    </Box>
  );
}

export function StarProgress() {
  const score = useKitchenHud((s) => s.score);
  const targets = useKitchenHud((s) => s.starTargets);
  const next = targets.find((t) => score < t);
  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }} aria-label={`${targets.filter((t) => score >= t).length} of 3 stars`}>
      {targets.map((t, i) => (
        <StarRoundedIcon key={i} sx={{ fontSize: 20, color: score >= t ? N.sun : N.panelEdge, filter: score >= t ? `drop-shadow(0 0 6px ${N.sun})` : undefined }} />
      ))}
      {next !== undefined && (
        <Typography className="tnum" sx={{ fontSize: "0.72rem", color: N.textSoft, ml: 0.5 }}>
          {next}
        </Typography>
      )}
    </Stack>
  );
}

export default function ShiftStatus() {
  const score = useKitchenHud((s) => s.score);
  return (
    <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
        <ComboPill />
        <ClockPill />
        <ScorePill score={score} />
      </Stack>
      <StarProgress />
    </Stack>
  );
}
