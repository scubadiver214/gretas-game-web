"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ButtonBase from "@mui/material/ButtonBase";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PageContainer from "@/components/PageContainer";
import PlayerAvatar from "@/components/PlayerAvatar";
import { CLIP, N, textGlow } from "@/design/neon";
import { usePlayerHydrated, usePlayerStore } from "@/features/player/store";
import {
  CHARACTER_LABELS,
  DAILY_MODES,
  GAME_MODES,
  MODE_EMOJI,
  MODE_LABELS,
  MODE_SHORT_LABELS,
  isGameMode,
  type GameMode,
} from "@/features/player/types";
import { dailyKey } from "@/lib/rng";
import { useTopScores } from "./hooks";
import type { Board, ScoreEntry } from "./api";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, ScoreEntry>();
const columns = helper.columns([
  helper.accessor("rank", {
    header: "#",
    cell: ({ getValue }) => {
      const r = getValue();
      const medal = r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : null;
      // Top three keep their glowing metal discs; everyone else a dark one.
      const fill = r === 1 ? N.sun : r === 2 ? "#B9C4CF" : r === 3 ? "#CE8639" : null;
      return (
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: fill ?? N.bgRaise,
            border: fill ? "none" : `1px solid ${N.panelEdge}`,
            boxShadow: fill ? `0 0 10px ${fill}66` : "none",
            color: fill ? N.bg : N.text,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: medal ? 18 : 15,
          }}
        >
          {medal ?? r}
        </Box>
      );
    },
  }),
  helper.accessor("nickname", {
    header: "Player",
    cell: ({ row, getValue }) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <PlayerAvatar nickname={getValue()} character={row.original.character} color={row.original.color} size={32} />
        <Stack spacing={0}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.1 }}>{getValue()}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            as {CHARACTER_LABELS[row.original.character] ?? row.original.character} · Lv {row.original.level}
          </Typography>
        </Stack>
      </Stack>
    ),
  }),
  helper.accessor("score", {
    header: "Score",
    cell: ({ getValue }) => (
      <Typography
        className="tnum"
        sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: N.kitchen }}
      >
        {getValue()}
      </Typography>
    ),
  }),
  helper.accessor("createdAt", {
    header: "When",
    cell: ({ getValue }) => formatWhen(getValue()),
  }),
]);

const EMPTY: ScoreEntry[] = [];

const MODE_ACCENT: Record<GameMode, string> = {
  kitchen: N.kitchen,
  delivery: N.delivery,
  wordle: N.wordle,
  frogger: N.frogger,
  claw: N.claw,
  racing: N.racing,
};

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ScoreTable({ mode, board, me }: { mode: GameMode; board: Board; me: string }) {
  const query = useTopScores(mode, 20, board === "daily" ? dailyKey() : undefined);
  const table = useTable({ features, columns, data: query.data ?? EMPTY });

  if (query.isPending) {
    return (
      <Stack spacing={1} sx={{ p: 2 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={44} />
        ))}
      </Stack>
    );
  }
  if (query.isError) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          <Button size="small" onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      >
        Couldn&apos;t load scores.
      </Alert>
    );
  }
  if (!query.data.length) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Box sx={{ fontSize: 56, lineHeight: 1, mb: 1 }} aria-hidden>
          {MODE_EMOJI[mode]}
        </Box>
        <Typography variant="h4">{board === "daily" ? "Nobody has played today yet" : "No scores yet"}</Typography>
        <Typography sx={{ color: "text.secondary" }}>
          {board === "daily" ? `Be the first to finish today's ${MODE_LABELS[mode]} challenge!` : `Be the first to play ${MODE_LABELS[mode]}!`}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small" aria-label={`${MODE_LABELS[mode]} ${board === "daily" ? "daily" : "all-time"} top scores`}>
        <TableHead>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableCell key={h.id} sx={{ fontWeight: 800, color: "text.secondary" }}>
                  {h.isPlaceholder ? null : <table.FlexRender header={h} />}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const mine = row.original.nickname.toLowerCase() === me.toLowerCase();
            return (
              <TableRow
                key={row.id}
                sx={{
                  bgcolor: mine ? N.bgRaise : undefined,
                  "& td": { py: 1, borderColor: "rgba(234,242,255,0.08)" },
                }}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function Scoreboard() {
  const router = useRouter();
  // The scoreboard is public (no RequirePlayer), so only read the persisted
  // nickname after hydration to keep the server and first client render equal.
  const hydrated = usePlayerHydrated();
  const storedNickname = usePlayerStore((s) => s.nickname);
  const nickname = hydrated ? storedNickname : "";
  // /scoreboard?mode=racing opens that game after mount so SSR markup stays kitchen.
  const requested = useSearchParams().get("mode");
  const [mode, setMode] = useState<GameMode>("kitchen");
  const [board, setBoard] = useState<Board>("all");
  useEffect(() => {
    if (isGameMode(requested)) setMode(requested);
  }, [requested]);
  const daily = DAILY_MODES.includes(mode);
  const accent = MODE_ACCENT[mode];
  const pickMode = (next: GameMode) => {
    setMode(next);
    if (!DAILY_MODES.includes(next)) setBoard("all");
  };

  return (
    <PageContainer maxWidth={560}>
      <Stack spacing={2} sx={{ py: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton aria-label="Back" onClick={() => router.back()}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              flex: 1,
              color: accent,
              textShadow: textGlow(accent),
            }}
          >
            Scoreboard
          </Typography>
          {nickname && <Chip label={nickname} variant="outlined" />}
        </Stack>
        <Typography sx={{ color: "text.secondary" }}>Every game, best runs first.</Typography>

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={daily ? board : "all"}
          onChange={(_, v: Board | null) => v && setBoard(v)}
          aria-label="Leaderboard period"
        >
          <ToggleButton value="all">All time</ToggleButton>
          <ToggleButton value="daily" disabled={!daily}>
            Today&apos;s challenge
          </ToggleButton>
        </ToggleButtonGroup>

        <Paper sx={{ overflow: "hidden", clipPath: CLIP.card, border: `1px solid ${accent}59` }}>
          <Box
            role="tablist"
            aria-label="Game"
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(6, 1fr)" },
              gap: 0.75,
              p: 1.25,
              borderBottom: `1px solid ${N.panelEdge}`,
            }}
          >
            {GAME_MODES.map((m) => {
              const on = m === mode;
              return (
                <ButtonBase
                  key={m}
                  role="tab"
                  aria-selected={on}
                  onClick={() => pickMode(m)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.25,
                    py: 0.9,
                    px: 0.5,
                    clipPath: CLIP.button,
                    bgcolor: on ? `${MODE_ACCENT[m]}22` : N.bgRaise,
                    border: `1px solid ${on ? MODE_ACCENT[m] : N.panelEdge}`,
                    color: on ? MODE_ACCENT[m] : N.textSoft,
                    boxShadow: on ? `0 0 10px ${MODE_ACCENT[m]}44` : "none",
                  }}
                >
                  <Box component="span" aria-hidden sx={{ fontSize: 20, lineHeight: 1 }}>
                    {MODE_EMOJI[m]}
                  </Box>
                  <Box sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {MODE_SHORT_LABELS[m]}
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
          <ScoreTable mode={mode} board={daily ? board : "all"} me={nickname} />
        </Paper>

        <Stack spacing={1}>
          <Button variant="contained" size="large" onClick={() => router.push(nickname ? "/adventure" : "/")}>
            {nickname ? "Play" : "Start playing"}
          </Button>
          {nickname && (
            <Button variant="text" onClick={() => router.push("/my-scores")}>
              My scores on this device
            </Button>
          )}
        </Stack>
      </Stack>
    </PageContainer>
  );
}
