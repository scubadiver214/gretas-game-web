"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { BackToShopButton, SettingsToggles } from "@/components/HUD";
import Panel from "@/components/ui/Panel";
import { N } from "@/design/neon";
import { LIVES } from "../config";
import type { FroggerStats } from "../api";
import Leaderboard from "./Leaderboard";

const HOW_TO = [
  "Hop across the busy road and the river to the lily pads at the top.",
  "Arrow keys or WASD hop one square. On a phone, use the arrows or swipe.",
  "Ride the logs and turtles. Red turtles are about to dive!",
  "Fill all five lily pads to clear the level. Space or Esc pauses.",
];

export default function MainMenu({
  nickname,
  isDaily,
  best,
  stats,
  onPlay,
  onRanks,
  onClose,
}: {
  nickname: string;
  isDaily: boolean;
  best: number | undefined;
  stats: FroggerStats | undefined;
  onPlay: () => void;
  onRanks: () => void;
  onClose: () => void;
}) {
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", p: 2, bgcolor: "rgba(5,8,13,0.62)", overflow: "auto" }}>
      <Box sx={{ position: "relative", maxWidth: 440, width: "100%", m: "auto" }}>
      <Panel accent={N.frogger} padding={2.25}>
        <Stack spacing={1.5}>
          <Box sx={{ textAlign: "center", px: 4 }}>
            <Typography variant="h2" component="h1" sx={{ color: N.frogger, textShadow: `0 0 14px ${N.frogger}66` }}>
              🐸 Frogger Adventure
            </Typography>
            <Chip
              label={isDaily ? "📅 Daily challenge" : `Arcade · ${LIVES.start} lives`}
              sx={{ mt: 0.75, bgcolor: isDaily ? N.sun : N.frogger, color: N.bg, fontWeight: 700 }}
            />
          </Box>

          <Stack component="ul" spacing={0.6} sx={{ listStyle: "none", m: 0, p: 0 }}>
            {HOW_TO.map((line) => (
              <Stack key={line} component="li" direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                <Box aria-hidden sx={{ mt: "6px", width: 8, height: 8, flexShrink: 0, borderRadius: "50%", bgcolor: N.frogger, boxShadow: `0 0 8px ${N.frogger}99` }} />
                <Typography sx={{ fontSize: "0.98rem", lineHeight: 1.35, color: N.text }}>{line}</Typography>
              </Stack>
            ))}
          </Stack>

          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center" }}>
            <Chip icon={<EmojiEventsRoundedIcon />} label={`Best ${best ?? 0}`} sx={{ bgcolor: N.bgRaise, color: N.text, "& .MuiChip-icon": { color: N.sun } }} />
            {stats && stats.gamesPlayed > 0 && (
              <>
                <Chip label={`Top level ${stats.highestLevel}`} variant="outlined" />
                <Chip label={`${stats.gamesPlayed} ${stats.gamesPlayed === 1 ? "game" : "games"}`} variant="outlined" />
              </>
            )}
          </Stack>

          <Button size="large" fullWidth variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={onPlay} autoFocus>
            Play
          </Button>

          <Box>
            <Stack direction="row" sx={{ alignItems: "center", mb: 0.5 }}>
              <Typography sx={{ flex: 1, fontFamily: "var(--font-arcade)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: N.sun }}>
                Top frogs
              </Typography>
              <Button size="small" variant="text" onClick={onRanks}>
                All ranks
              </Button>
            </Stack>
            <Leaderboard me={nickname} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <SettingsToggles />
          </Box>
        </Stack>
      </Panel>
      <BackToShopButton onClick={onClose} />
      </Box>
    </Box>
  );
}
