"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import type { ReactNode } from "react";
import type { RaceSummary } from "../types";
import { formatTime, ordinal } from "./format";
import { R, bigText, plate } from "./hudStyle";

const bigButton = {
  ...bigText,
  fontSize: "1.35rem",
  py: 1.2,
  borderRadius: "16px",
  textTransform: "none",
  border: "3px solid rgba(255,255,255,0.7)",
  boxShadow: "0 5px 0 rgba(0,0,0,0.35)",
  "&:active": { transform: "translateY(3px)", boxShadow: "0 2px 0 rgba(0,0,0,0.35)" },
} as const;

/** A cream button with dark type: the quiet choice next to the big green one. */
const creamButton = {
  ...bigButton,
  bgcolor: "#fff1c9",
  color: R.ink,
  textShadow: "none",
  "&:hover": { bgcolor: "#ffe08a" },
} as const;

function Dim({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 20, display: "grid", placeItems: "center", p: 2, overflow: "auto", bgcolor: "rgba(20,12,0,0.55)", backdropFilter: "blur(3px)" }}>{children}</Box>
  );
}

export function PauseOverlay({ onResume, onRestart, onQuit, touch }: { onResume: () => void; onRestart: () => void; onQuit: () => void; touch: boolean }) {
  return (
    <Dim>
      <Box sx={{ ...plate, p: 3, width: "100%", maxWidth: 380, textAlign: "center" }}>
        <Typography sx={{ ...bigText, fontSize: "2.6rem", color: R.goldLight, mb: 2 }}>Paused</Typography>
        <Stack spacing={1.5}>
          <Button autoFocus fullWidth variant="contained" color="success" startIcon={<PlayArrowRoundedIcon />} onClick={onResume} sx={bigButton}>
            Keep racing
          </Button>
          <Button fullWidth variant="contained" color="warning" startIcon={<ReplayRoundedIcon />} onClick={onRestart} sx={bigButton}>
            Start over
          </Button>
          <Button fullWidth variant="contained" startIcon={<HomeRoundedIcon />} onClick={onQuit} sx={creamButton}>
            Main menu
          </Button>
        </Stack>
        {!touch && (
          <Typography sx={{ color: "rgba(255,255,255,0.75)", mt: 2, fontSize: "0.95rem" }}>
            W A S D or arrows to drive · Q E or 1 2 3 weapons · F fires · Space drifts · Shift boosts · R resets · Esc pauses
          </Typography>
        )}
      </Box>
    </Dim>
  );
}

function Stat({ label, value, tone = R.white }: { label: string; value: string; tone?: string }) {
  return (
    <Box sx={{ textAlign: "center", px: 1 }}>
      <Typography sx={{ ...bigText, fontSize: "clamp(1.4rem, 5vmin, 2rem)", color: tone }}>{value}</Typography>
      <Typography sx={{ color: R.goldLight, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.04em" }}>{label}</Typography>
    </Box>
  );
}

/** Who came where: every car, the player highlighted, rivals still on the road marked as racing. */
function Standings({ summary, playerName, colors }: { summary: RaceSummary; playerName: string; colors: readonly string[] }) {
  return (
    <Box component="ol" aria-label="Finishing order" sx={{ listStyle: "none", m: 0, mb: 2, p: 0, display: "grid", gap: 0.5 }}>
      {summary.standings.map((s, i) => {
        const me = s.racer === 0;
        return (
          <Box
            component="li"
            key={s.racer}
            sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.2, py: 0.4, borderRadius: "10px", bgcolor: me ? "rgba(255,210,63,0.22)" : "rgba(0,0,0,0.22)", border: me ? `2px solid ${R.goldLight}` : "2px solid transparent" }}
          >
            <Typography sx={{ ...bigText, fontSize: "1.05rem", width: 38, textAlign: "left", color: i === 0 ? R.goldLight : R.white }}>{ordinal(i + 1)}</Typography>
            <Box aria-hidden sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: colors[s.racer] ?? R.white, border: "2px solid #fff", flexShrink: 0 }} />
            <Typography sx={{ ...bigText, fontSize: "1.05rem", flex: 1, textAlign: "left" }} noWrap>
              {me ? `${playerName} (you)` : s.name}
            </Typography>
            <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 700, color: s.finished ? R.white : "rgba(255,255,255,0.7)", fontSize: "0.95rem" }}>
              {s.finished && s.time !== null ? formatTime(s.time) : "still racing"}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export function ResultsCard({
  summary,
  playerName,
  colors,
  score,
  rank,
  personalBest,
  onAgain,
  onMenu,
  onRanks,
}: {
  summary: RaceSummary;
  playerName: string;
  colors: readonly string[];
  score?: number;
  rank?: number;
  personalBest?: boolean;
  onAgain: () => void;
  onMenu: () => void;
  onRanks?: () => void;
}) {
  const placed = summary.racers > 1;
  const headline = !placed ? "Great driving!" : summary.place === 1 ? "You won!" : summary.place <= 3 ? "Podium finish!" : "Nice race!";
  return (
    <Dim>
      <Box sx={{ ...plate, p: { xs: 2, sm: 3 }, width: "100%", maxWidth: 460, textAlign: "center", animation: "racingCard 450ms cubic-bezier(.2,1.4,.4,1)", "@keyframes racingCard": { from: { transform: "scale(0.7) translateY(30px)", opacity: 0 } } }}>
        <Typography sx={{ fontSize: "3rem", lineHeight: 1 }} aria-hidden>
          🏁
        </Typography>
        <Typography component="h2" sx={{ ...bigText, fontSize: "clamp(2rem, 8vmin, 3rem)", color: R.goldLight }}>
          {headline}
        </Typography>
        {placed && (
          <Typography sx={{ ...bigText, fontSize: "1.6rem", mb: 0.5 }}>
            You came {ordinal(summary.place)} of {summary.racers}
          </Typography>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", rowGap: 1.4, my: 2.2 }}>
          <Stat label="Time" value={formatTime(summary.timeSeconds)} />
          <Stat label="Best lap" value={summary.bestLap === null ? "–" : formatTime(summary.bestLap)} tone={R.goldLight} />
          <Stat label="Coins" value={`${summary.coins}`} tone="#ffe27a" />
          <Stat label="Gems" value={`${summary.gems}`} tone="#ff8fb3" />
          {score !== undefined && <Stat label="Score" value={`${score}`} tone={R.goldLight} />}
          {rank !== undefined && <Stat label={personalBest ? "Rank · PB" : "Rank"} value={`#${rank}`} />}
        </Box>
        {summary.lapTimes.length > 1 && (
          <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 2, fontSize: "0.95rem" }}>{summary.lapTimes.map((t, i) => `Lap ${i + 1}: ${formatTime(t)}`).join("   ·   ")}</Typography>
        )}
        {placed && <Standings summary={summary} playerName={playerName} colors={colors} />}
        <Stack spacing={1.4}>
          <Button autoFocus fullWidth variant="contained" color="success" startIcon={<ReplayRoundedIcon />} onClick={onAgain} sx={bigButton}>
            Race again
          </Button>
          <Button fullWidth variant="contained" startIcon={<HomeRoundedIcon />} onClick={onMenu} sx={creamButton}>
            Main menu
          </Button>
          {onRanks && (
            <Button fullWidth variant="contained" startIcon={<EmojiEventsRoundedIcon />} onClick={onRanks} sx={creamButton}>
              Scoreboard
            </Button>
          )}
        </Stack>
      </Box>
    </Dim>
  );
}

export function LoadingScreen({ failed }: { failed: boolean }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, zIndex: 30, display: "grid", placeItems: "center", background: "linear-gradient(180deg,#2c78d4 0%,#8cc7f2 55%,#f7dcaa 100%)", textAlign: "center", p: 3 }}>
      <Box>
        <Typography sx={{ fontSize: 72, lineHeight: 1, animation: failed ? undefined : "racingWobble 700ms ease-in-out infinite alternate", "@keyframes racingWobble": { from: { transform: "translateX(-14px) rotate(-5deg)" }, to: { transform: "translateX(14px) rotate(5deg)" } } }} aria-hidden>
          {failed ? "😢" : "🏎️"}
        </Typography>
        <Typography sx={{ ...bigText, fontSize: "clamp(1.6rem, 6vw, 2.4rem)", mt: 1 }}>{failed ? "This device can't draw the 3D track" : "Warming up the engine…"}</Typography>
        {failed && <Typography sx={{ color: "#fff", mt: 1 }}>Try a newer browser, or turn on hardware acceleration.</Typography>}
      </Box>
    </Box>
  );
}
