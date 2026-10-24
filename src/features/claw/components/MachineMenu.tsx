"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { BackToShopButton, SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { CLIP, N } from "@/design/neon";
import { GAME_TITLE } from "../config";
import { TIERS, tierFor } from "../engine/difficulty";
import type { WorldDef } from "../content/worlds";
import ReducedMotionToggle from "./ReducedMotionToggle";

const HOW_TO_DEPTH = [
  "Drag the stick (or drag on the floor) to slide the claw anywhere — including right up to the glass.",
  "Line up the glowing ring on a toy you like (or tap the toy), then press GRAB (or Space).",
  "Caught one? It rides to the chute and joins your toy collection!",
];
const HOW_TO_SIMPLE = [
  "Drag the stick or the floor (or use ← → keys) until the claw hangs over a toy you like.",
  "Press the big GRAB button (or Space). The claw drops, closes and lifts.",
  "Caught one? It rides to the chute and joins your toy collection!",
];

export default function MachineMenu({
  level,
  world,
  goal,
  depthControl,
  touch,
  /** Highest level the player may start. */
  maxLevel,
  starsByLevel,
  onPickLevel,
  onPlay,
  onClose,
}: {
  level: number;
  world: WorldDef;
  goal: number;
  depthControl: boolean;
  touch: boolean;
  maxLevel: number;
  starsByLevel: Readonly<Record<number, number>>;
  onPickLevel: (level: number) => void;
  onPlay: () => void;
  onClose: () => void;
}) {
  const accent = world.palette.glow;
  const tier = tierFor(level);
  const lines = depthControl ? HOW_TO_DEPTH : HOW_TO_SIMPLE;
  const levels = Array.from({ length: world.to - world.from + 1 }, (_, i) => world.from + i);
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", p: 2, bgcolor: "rgba(5,8,13,0.62)", overflow: "auto" }}>
      <Box sx={{ position: "relative", maxWidth: 460, width: "100%", m: "auto" }}>
        <Panel accent={accent} padding={2.25}>
          <Stack spacing={1.5}>
            <Box sx={{ textAlign: "center", px: 4 }}>
              <Typography component="h1" sx={{ fontFamily: "var(--font-script), cursive", fontSize: "2rem", lineHeight: 1.25, color: accent, textShadow: `0 0 14px ${accent}66` }}>
                {GAME_TITLE}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.75, justifyContent: "center", flexWrap: "wrap" }}>
                <Chip label={world.name} sx={{ bgcolor: accent, color: N.bg, fontWeight: 700 }} />
                <Chip label={`Level ${level} · ${tier.label}`} variant="outlined" />
                <Chip label={`Win ${goal} ${goal === 1 ? "prize" : "prizes"}`} variant="outlined" />
              </Stack>
            </Box>

            {/* Level strip for this world. */}
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }} aria-label="Pick a level">
              {levels.map((l) => {
                const locked = l > maxLevel;
                const stars = starsByLevel[l] ?? 0;
                const active = l === level;
                return (
                  <ButtonBase
                    key={l}
                    disabled={locked}
                    aria-label={locked ? `Level ${l}, locked` : `Level ${l}${stars ? `, ${stars} stars` : ""}`}
                    aria-pressed={active}
                    onClick={() => onPickLevel(l)}
                    sx={{
                      width: 40,
                      height: 44,
                      flexDirection: "column",
                      clipPath: CLIP.button,
                      bgcolor: active ? accent : N.bgRaise,
                      color: active ? N.bg : locked ? N.textSoft : N.text,
                      border: `1px solid ${active ? accent : N.panelEdge}`,
                      fontFamily: "var(--font-arcade)",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      "&.Mui-disabled": { opacity: 0.5 },
                    }}
                  >
                    {locked ? <LockRoundedIcon sx={{ fontSize: 16 }} /> : l}
                    {!locked && (
                      <Stack direction="row" spacing={0} sx={{ mt: -0.25 }}>
                        {[0, 1, 2].map((i) => (
                          <StarRoundedIcon key={i} sx={{ fontSize: 10, color: i < stars ? (active ? N.bg : N.sun) : "transparent", stroke: active ? N.bg : N.panelEdge, strokeWidth: i < stars ? 0 : 1 }} />
                        ))}
                      </Stack>
                    )}
                  </ButtonBase>
                );
              })}
            </Stack>

            <Stack component="ul" spacing={0.6} sx={{ listStyle: "none", m: 0, p: 0 }}>
              {lines.map((line) => (
                <Stack key={line} component="li" direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                  <Box aria-hidden sx={{ mt: "6px", width: 8, height: 8, flexShrink: 0, borderRadius: "50%", bgcolor: accent, boxShadow: `0 0 8px ${accent}99` }} />
                  <Typography sx={{ fontSize: "0.98rem", lineHeight: 1.35, color: N.text }}>{touch ? line.replace(" (or ← → keys)", "").replace(" (or Space)", "").replace(" (or WASD)", "") : line}</Typography>
                </Stack>
              ))}
            </Stack>

            <Button size="large" fullWidth variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={onPlay} autoFocus>
              Play
            </Button>

            <Typography sx={{ textAlign: "center", color: N.textSoft, fontSize: "0.85rem" }}>
              {TIERS.map((t) => t.label).join(" → ")}. No timers, no limits. Take your time!
            </Typography>

            <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", alignItems: "center" }}>
              <SettingsToggles />
              <ReducedMotionToggle />
            </Stack>
          </Stack>
        </Panel>
        <BackToShopButton onClick={onClose} />
      </Box>
    </Box>
  );
}
