"use client";

import IconButton from "@mui/material/IconButton";
import MotionPhotosOffRoundedIcon from "@mui/icons-material/MotionPhotosOffRounded";
import AnimationRoundedIcon from "@mui/icons-material/AnimationRounded";
import { N } from "@/design/neon";
import { useSettingsStore } from "@/features/settings/store";

/** Reduced-motion switch in the same style as the sound/music toggles. */
export default function ReducedMotionToggle({ size = "medium" }: { size?: "small" | "medium" }) {
  const reduced = useSettingsStore((s) => s.reducedMotion);
  const toggle = useSettingsStore((s) => s.toggleReducedMotion);
  const dim = size === "small" ? 36 : 42;
  return (
    <IconButton
      aria-label={reduced ? "Turn animations back on" : "Reduce motion"}
      aria-pressed={reduced}
      onClick={toggle}
      sx={{
        width: dim,
        height: dim,
        bgcolor: N.panel,
        color: reduced ? N.brand : N.textSoft,
        border: `1px solid ${reduced ? `${N.brand}80` : N.panelEdge}`,
        boxShadow: reduced ? `0 0 10px ${N.brand}40` : undefined,
        "&:hover": { bgcolor: N.bgRaise },
      }}
    >
      {reduced ? <MotionPhotosOffRoundedIcon /> : <AnimationRoundedIcon />}
    </IconButton>
  );
}
