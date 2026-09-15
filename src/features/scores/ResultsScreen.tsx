"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import PageContainer from "@/components/PageContainer";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { MODE_LABELS } from "@/features/player/types";
import { useSubmitScore } from "./hooks";

function Inner() {
  const router = useRouter();
  const nickname = usePlayerStore((s) => s.nickname);
  const character = usePlayerStore((s) => s.character);
  const result = usePlayerStore((s) => s.lastResult);
  const submittedRounds = usePlayerStore((s) => s.submittedRounds);
  const markSubmitted = usePlayerStore((s) => s.markSubmitted);
  const submit = useSubmitScore();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!result) {
      router.replace("/adventure");
      return;
    }
    if (!character) return;
    if (submittedRounds.includes(result.roundId)) return;
    if (attempted.current === result.roundId) return;
    attempted.current = result.roundId;
    submit.mutate(
      {
        nickname,
        character,
        mode: result.mode,
        score: result.score,
        durationSeconds: result.durationSeconds,
      },
      { onSuccess: () => markSubmitted(result.roundId) },
    );
    // submit is stable enough for our purposes; we guard with attempted ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, character, nickname]);

  if (!result) return null;
  const alreadySaved = submittedRounds.includes(result.roundId);

  return (
    <PageContainer>
      <Stack spacing={2.5} sx={{ flex: 1, py: 2, justifyContent: "center" }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h3" component="p" sx={{ color: "text.secondary" }}>
            {MODE_LABELS[result.mode]}
          </Typography>
          <Typography variant="h2" component="h1">
            Great job, {nickname}!
          </Typography>
        </Box>

        <Paper
          sx={{
            p: 3,
            textAlign: "center",
            borderRadius: 6,
            background: "linear-gradient(160deg, #FFF1D6 0%, #FFFFFF 100%)",
          }}
        >
          <Typography sx={{ color: "text.secondary", fontWeight: 700 }}>Your score</Typography>
          <Typography
            sx={{
              fontSize: "5rem",
              fontWeight: 900,
              lineHeight: 1,
              color: "primary.main",
              my: 1,
              animation: "bounceIn 600ms cubic-bezier(.2,1.4,.4,1)",
              "@keyframes bounceIn": { from: { transform: "scale(0.4)", opacity: 0 }, to: { transform: "scale(1)", opacity: 1 } },
            }}
          >
            {result.score}
          </Typography>

          <Box sx={{ minHeight: 40, display: "grid", placeItems: "center" }}>
            {submit.isPending && <CircularProgress size={26} />}
            {submit.isSuccess && (
              <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }}>
                <Chip
                  color="secondary"
                  icon={<EmojiEventsRoundedIcon />}
                  label={`Rank #${submit.data.rank} on the scoreboard`}
                />
                {submit.data.isPersonalBest && <Chip color="success" label="New personal best!" />}
              </Stack>
            )}
            {!submit.isPending && !submit.isSuccess && alreadySaved && (
              <Chip label="Score saved" color="success" variant="outlined" />
            )}
            {submit.isError && (
              <Alert
                severity="warning"
                action={
                  <Button size="small" onClick={() => submit.reset()}>
                    Retry
                  </Button>
                }
              >
                Couldn&apos;t save your score right now.
              </Alert>
            )}
          </Box>
        </Paper>

        <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: "center", flexWrap: "wrap" }}>
          {result.highlights.map((h) => (
            <Chip key={h.label} label={`${h.label}: ${h.value}`} variant="outlined" />
          ))}
        </Stack>

        <Stack spacing={1.5}>
          <Button
            size="large"
            variant="contained"
            startIcon={<ReplayRoundedIcon />}
            onClick={() => router.push(`/play/${result.mode}`)}
          >
            Play again
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => router.push("/adventure")}>
            Try the other adventure
          </Button>
          <Button variant="text" startIcon={<EmojiEventsRoundedIcon />} onClick={() => router.push("/scoreboard")}>
            Scoreboard
          </Button>
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export default function ResultsScreen() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
