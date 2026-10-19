"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import RequirePlayer from "@/components/RequirePlayer";
import { CountdownOverlay, FlashOverlay, IntroCard, QuitButton, ScorePill, ScorePopups, SettingsToggles } from "@/components/HUD";
import { C, RADIUS, floatShadow } from "@/design/tokens";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { LEVEL_NAMES } from "@/features/player/progress";
import Keyboard from "./Keyboard";
import { maxScore, POINTS_HINT_PENALTY, wordleDifficultyFor, wordleStars } from "./scoring";
import { useWordleGame } from "./useWordleGame";
import WordGrid from "./WordGrid";

function Inner() {
  const router = useRouter();
  const finishRound = usePlayerStore((s) => s.finishRound);
  const setup = useRoundSetup("wordle");

  const phase = useWordleGame((s) => s.phase);
  const config = useWordleGame((s) => s.config);
  const difficulty = useWordleGame((s) => s.difficulty);
  const puzzles = useWordleGame((s) => s.puzzles);
  const puzzleIndex = useWordleGame((s) => s.puzzleIndex);
  const currentGuess = useWordleGame((s) => s.currentGuess);
  const score = useWordleGame((s) => s.score);
  const stats = useWordleGame((s) => s.stats);
  const message = useWordleGame((s) => s.message);
  const shake = useWordleGame((s) => s.shake);
  const startedAt = useWordleGame((s) => s.startedAt);
  const begin = useWordleGame((s) => s.begin);
  const startRound = useWordleGame((s) => s.startRound);
  const typeLetter = useWordleGame((s) => s.typeLetter);
  const backspace = useWordleGame((s) => s.backspace);
  const submitGuess = useWordleGame((s) => s.submitGuess);
  const useHint = useWordleGame((s) => s.useHint);
  const reset = useWordleGame((s) => s.reset);

  useEffect(() => () => reset(), [reset]);

  useEffect(() => {
    if (phase !== "finished") return;
    const answers = puzzles.map((p) => p.answer);
    finishRound({
      mode: "wordle",
      score,
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      roundId: `wordle-${startedAt}`,
      level: config.level,
      challengeDate: config.challengeDate,
      stars: wordleStars(score, answers),
      metrics: {
        words: puzzles.length,
        solved: stats.solved,
        failed: stats.failed,
        bestGuesses: stats.bestGuesses,
        hints: stats.hints,
      },
      highlights: [
        { label: "Words solved", value: `${stats.solved}/${puzzles.length}` },
        ...(stats.bestGuesses > 0
          ? [{ label: "Best guess streak", value: `${stats.bestGuesses} ${stats.bestGuesses === 1 ? "try" : "tries"}` }]
          : []),
        { label: "Max possible", value: String(maxScore(answers)) },
      ],
    });
    router.replace("/results");
  }, [phase, score, stats, startedAt, puzzles, config, finishRound, router]);

  // Physical keyboard support, in addition to the on-screen one.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (useWordleGame.getState().phase !== "playing") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        useWordleGame.getState().submitGuess();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        useWordleGame.getState().backspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        useWordleGame.getState().typeLetter(e.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onCountdownDone = useCallback(() => startRound(), [startRound]);
  const onStart = useCallback(
    () => begin({ level: setup.level, seed: setup.seed, challengeDate: setup.challengeDate }),
    [begin, setup.level, setup.seed, setup.challengeDate],
  );
  const levelLabel = setup.isDaily ? "📅 Daily challenge" : `Level ${setup.level} · ${LEVEL_NAMES[setup.level]}`;
  const puzzle = puzzles[puzzleIndex];
  const playing = phase === "playing" || phase === "result";
  const canHint = phase === "playing" && !!puzzle && !puzzle.hintUsed && currentGuess.length < puzzle.answer.length;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        bgcolor: C.sandSoft,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", p: 1.5, pt: "max(12px, env(safe-area-inset-top))" }}>
        <QuitButton onQuit={() => router.push("/adventure")} />
        <SettingsToggles size="small" />
        <Box sx={{ flex: 1 }} />
        <ScorePill score={score} />
      </Stack>

      {playing && puzzle && (
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, px: 2, alignItems: "center", justifyContent: "center", overflow: "auto" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                px: 1.25,
                height: 30,
                borderRadius: 999,
                bgcolor: C.grape,
                color: C.white,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              Word {puzzleIndex + 1}/{puzzles.length}
            </Box>
            <Box
              sx={{
                px: 1.25,
                height: 30,
                borderRadius: 999,
                bgcolor: C.white,
                boxShadow: floatShadow,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              {puzzle.guesses.length}/{difficulty.maxGuesses} guesses
            </Box>
          </Stack>

          <WordGrid puzzle={puzzle} currentGuess={currentGuess} maxGuesses={difficulty.maxGuesses} shakeToken={shake} />

          <Box sx={{ minHeight: 28, textAlign: "center" }}>
            {message && (
              <Typography sx={{ fontFamily: "var(--font-display)", fontWeight: 800, color: phase === "result" ? C.ink : C.tomato }}>
                {message}
              </Typography>
            )}
          </Box>
        </Stack>
      )}

      {playing && puzzle && (
        <Box
          sx={{
            bgcolor: C.white,
            borderRadius: `${RADIUS.panel}px ${RADIUS.panel}px 0 0`,
            boxShadow: floatShadow,
            p: 1.5,
            pb: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <Stack spacing={1} sx={{ maxWidth: 520, mx: "auto" }}>
            <Button
              size="small"
              variant="text"
              color="secondary"
              startIcon={<LightbulbRoundedIcon />}
              disabled={!canHint}
              onClick={useHint}
              sx={{ alignSelf: "center" }}
            >
              Hint (−{POINTS_HINT_PENALTY} pts)
            </Button>
            <Keyboard puzzle={puzzle} onKey={typeLetter} onEnter={submitGuess} onBackspace={backspace} disabled={phase !== "playing"} />
          </Stack>
        </Box>
      )}

      <FlashOverlay />
      <ScorePopups />
      {phase === "intro" && (
        <IntroCard
          title="🔤 Word Quest"
          badge={levelLabel}
          accent={C.grape}
          lines={[
            "Guess the secret word. Every word is 5 letters.",
            "🟩 Green = right letter, right spot.",
            "🟨 Yellow = right letter, wrong spot.",
            `You get ${wordleDifficultyFor(setup.level).maxGuesses} tries per word.`,
            "Stuck? Use a hint to reveal the next letter.",
            ...(setup.isDaily ? ["Everyone gets the same words today. Beat the world!"] : []),
          ]}
          cta="Start guessing"
          onStart={onStart}
        />
      )}
      {phase === "countdown" && <CountdownOverlay onDone={onCountdownDone} />}
    </Box>
  );
}

export default function WordleGame() {
  return (
    <RequirePlayer>
      <Inner />
    </RequirePlayer>
  );
}
