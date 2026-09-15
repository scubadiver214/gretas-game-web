"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  sortFn_datetime,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import PageContainer from "@/components/PageContainer";
import PlayerAvatar from "@/components/PlayerAvatar";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { LEVEL_NAMES, levelForRounds } from "@/features/player/progress";
import { MODE_LABELS, type GameMode, type RoundRecord } from "@/features/player/types";
import { formatWhen } from "./Scoreboard";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, datetime: sortFn_datetime },
});
const helper = createColumnHelper<typeof features, RoundRecord>();
const columns = helper.columns([
  helper.accessor("playedAt", {
    header: "When",
    sortFn: "datetime",
    cell: ({ getValue, row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Typography variant="body2">{formatWhen(getValue())}</Typography>
        {row.original.challengeDate && <TodayRoundedIcon fontSize="inherit" color="secondary" titleAccess="Daily challenge" />}
      </Stack>
    ),
  }),
  helper.accessor("score", {
    header: "Score",
    sortFn: "basic",
    cell: ({ getValue, row }) => (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Typography sx={{ fontWeight: 900, color: "primary.main" }}>{getValue()}</Typography>
        {row.original.personalBest && <Chip label="PB" size="small" color="success" sx={{ height: 18, fontSize: 10, fontWeight: 900 }} />}
      </Stack>
    ),
  }),
  helper.accessor("level", {
    header: "Level",
    sortFn: "basic",
    cell: ({ getValue }) => `Lv ${getValue()}`,
  }),
  helper.accessor("rank", {
    header: "Rank",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ getValue }) => {
      const r = getValue();
      return r === undefined ? "—" : `#${r}`;
    },
  }),
]);

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character)!;
  const color = usePlayerStore((s) => s.color);
  const history = usePlayerStore((s) => s.history);
  const roundsPlayed = usePlayerStore((s) => s.roundsPlayed);
  const clearHistory = usePlayerStore((s) => s.clearHistory);
  const [mode, setMode] = useState<GameMode>("kitchen");
  const [sorting, setSorting] = useState<SortingState>([{ id: "playedAt", desc: true }]);

  const rows = useMemo(() => history.filter((h) => h.mode === mode), [history, mode]);
  const best = rows.reduce((m, r) => Math.max(m, r.score), 0);
  const level = levelForRounds(roundsPlayed[mode] ?? 0);

  const table = useTable({
    features,
    columns,
    data: rows,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <PageContainer maxWidth={560}>
      <Stack spacing={2} sx={{ py: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton aria-label="Back" onClick={() => router.back()}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography variant="h2" component="h1" sx={{ flex: 1 }}>
            My scores
          </Typography>
          <PlayerAvatar nickname={nickname} character={character} color={color} />
        </Stack>
        <Typography sx={{ color: "text.secondary" }}>Rounds played on this device. Scores also live on the global scoreboard.</Typography>

        <Paper sx={{ overflow: "hidden" }}>
          <Tabs value={mode} onChange={(_, v: GameMode) => setMode(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
            <Tab value="kitchen" label="Kitchen" sx={{ minHeight: 52 }} />
            <Tab value="delivery" label="Delivery" sx={{ minHeight: 52 }} />
          </Tabs>

          <Stack direction="row" spacing={1} useFlexGap sx={{ p: 1.5, flexWrap: "wrap" }}>
            <Chip label={`${rows.length} ${rows.length === 1 ? "round" : "rounds"}`} />
            <Chip label={`Best: ${best}`} color="primary" variant="outlined" />
            <Chip label={`Level ${level} · ${LEVEL_NAMES[level]}`} color="secondary" variant="outlined" />
          </Stack>

          {rows.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h4">No rounds yet</Typography>
              <Typography sx={{ color: "text.secondary" }}>Play {MODE_LABELS[mode]} and your rounds will show up here.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" aria-label={`My ${MODE_LABELS[mode]} rounds`}>
                <TableHead>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => {
                        const sorted = h.column.getIsSorted();
                        return (
                          <TableCell key={h.id} sortDirection={sorted || false} sx={{ fontWeight: 800, color: "text.secondary" }}>
                            <TableSortLabel
                              active={!!sorted}
                              direction={sorted || "desc"}
                              onClick={h.column.getToggleSortingHandler()}
                            >
                              <table.FlexRender header={h} />
                            </TableSortLabel>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} sx={{ "& td": { py: 1, borderColor: "#F1E9DE" } }}>
                      {row.getAllCells().map((cell) => (
                        <TableCell key={cell.id}>
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Stack spacing={1}>
          <Button variant="contained" size="large" onClick={() => router.push(`/play/${mode}`)}>
            Play {MODE_LABELS[mode]}
          </Button>
          {history.length > 0 && (
            <Button variant="text" color="inherit" onClick={() => clearHistory()}>
              Clear history on this device
            </Button>
          )}
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export default function MyScores() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
