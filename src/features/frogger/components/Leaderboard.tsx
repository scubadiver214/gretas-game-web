"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PlayerAvatar from "@/components/PlayerAvatar";
import { N } from "@/design/neon";
import { useTopScores } from "@/features/scores/hooks";

/** Compact top-N Frogger board for the main menu. */
export default function Leaderboard({ me, limit = 5, date }: { me: string; limit?: number; date?: string }) {
  const query = useTopScores("frogger", limit, date);

  if (query.isPending) {
    return (
      <Stack spacing={0.75}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={34} />
        ))}
      </Stack>
    );
  }
  if (query.isError) {
    return <Typography sx={{ color: N.textSoft, fontSize: "0.9rem" }}>Ranks are offline right now.</Typography>;
  }
  if (!query.data.length) {
    return <Typography sx={{ color: N.textSoft, fontSize: "0.9rem" }}>No frogs home yet. Be the first!</Typography>;
  }
  return (
    <Stack component="ol" spacing={0.5} sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Top Frogger scores">
      {query.data.map((row) => {
        const mine = row.nickname.toLowerCase() === me.toLowerCase();
        return (
          <Stack
            key={`${row.rank}-${row.nickname}-${row.createdAt}`}
            component="li"
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", px: 1, py: 0.5, borderRadius: 1, bgcolor: mine ? N.bgRaise : undefined }}
          >
            <Box sx={{ width: 22, fontFamily: "var(--font-arcade)", fontWeight: 700, color: row.rank <= 3 ? N.sun : N.textSoft }}>
              {row.rank}
            </Box>
            <PlayerAvatar nickname={row.nickname} character={row.character} color={row.color} size={24} />
            <Typography sx={{ flex: 1, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.nickname}
            </Typography>
            <Typography variant="caption" sx={{ color: N.textSoft }}>
              Lv {row.level}
            </Typography>
            <Typography className="tnum" sx={{ fontFamily: "var(--font-arcade)", fontWeight: 700, color: N.frogger }}>
              {row.score}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}
