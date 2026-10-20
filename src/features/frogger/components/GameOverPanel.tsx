"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import Panel from "@/components/ui/Panel";
import { N, textGlow } from "@/design/neon";
import type { GameSummary } from "../types";

export type SaveState =
  | { status: "saving" }
  | { status: "saved"; rank: number; isPersonalBest: boolean; previousBest: number | null }
  | { status: "error" }
  | { status: "offline" };

export default function GameOverPanel({
  summary,
  save,
  previousBest,
  isDaily,
  onRetrySave,
  onPlayAgain,
  onExit,
  onRanks,
}: {
  summary: GameSummary;
  save: SaveState;
  /** Best known before this game (used until the server answers). */
  previousBest: number | undefined;
  isDaily: boolean;
  onRetrySave: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
  onRanks: () => void;
}) {
  const prior = save.status === "saved" ? save.previousBest : previousBest ?? null;
  const newBest = save.status === "saved" ? save.isPersonalBest : summary.score > 0 && summary.score > (prior ?? 0);
  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 10, display: "flex", p: 2, bgcolor: "rgba(5,8,13,0.7)", overflow: "auto" }}>
      <Panel accent={newBest ? N.sun : N.frogger} padding={2.5} sx={{ maxWidth: 400, width: "100%", m: "auto" }}>
        <Stack spacing={1.5} sx={{ textAlign: "center" }}>
          <Typography variant="h2" component="h2" sx={{ color: N.kitchen, textShadow: textGlow(N.kitchen) }}>
            Game over
          </Typography>
          <Box>
            <Typography sx={{ color: N.textSoft, fontWeight: 800 }}>Final score</Typography>
            <Typography
              className="tnum"
              sx={{
                fontFamily: "var(--font-display)",
                fontSize: "4.2rem",
                fontWeight: 800,
                lineHeight: 1,
                color: N.frogger,
                textShadow: textGlow(N.frogger),
                animation: "goIn 600ms cubic-bezier(.2,1.5,.4,1)",
                "@keyframes goIn": { from: { transform: "scale(0.4)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
              }}
            >
              {summary.score}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.75} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }}>
            <Chip label={`Reached level ${summary.highestLevel}`} sx={{ bgcolor: N.bgRaise, color: N.text }} />
            <Chip label={`${summary.homesFilled} ${summary.homesFilled === 1 ? "frog" : "frogs"} home`} variant="outlined" />
            <Chip label={prior === null ? "First game!" : `Previous best ${prior}`} variant="outlined" />
            {isDaily && <Chip label="📅 Daily" sx={{ bgcolor: N.sun, color: N.bg }} />}
          </Stack>

          <Box sx={{ minHeight: 40, display: "grid", placeItems: "center" }} aria-live="polite">
            {save.status === "saving" && <CircularProgress size={26} aria-label="Saving score" />}
            {save.status === "saved" && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }}>
                <Chip
                  icon={<EmojiEventsRoundedIcon />}
                  label={isDaily ? `#${save.rank} today` : `#${save.rank} all time`}
                  sx={{ bgcolor: N.delivery, color: N.bg, "& .MuiChip-icon": { color: N.sun } }}
                />
                {save.isPersonalBest && <Chip label="⭐ New high score!" sx={{ bgcolor: N.sun, color: N.bg }} />}
              </Stack>
            )}
            {save.status === "error" && (
              <Alert
                severity="warning"
                action={
                  <Button size="small" onClick={onRetrySave}>
                    Retry
                  </Button>
                }
              >
                Couldn&apos;t save your score right now.
              </Alert>
            )}
            {save.status === "offline" && (
              <Alert severity="info">The game server was offline, so this score wasn&apos;t saved.</Alert>
            )}
          </Box>

          <Button size="large" variant="contained" color="success" startIcon={<ReplayRoundedIcon />} onClick={onPlayAgain} autoFocus>
            Play again
          </Button>
          <Button fullWidth variant="outlined" onClick={onExit}>
            Return to games
          </Button>
          <Button variant="text" startIcon={<EmojiEventsRoundedIcon />} onClick={onRanks} sx={{ alignSelf: "center" }}>
            Ranks
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}
