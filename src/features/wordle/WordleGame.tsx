"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import AbcRoundedIcon from "@mui/icons-material/AbcRounded";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import PinDropRoundedIcon from "@mui/icons-material/PinDropRounded";
import { useRoundMusic } from "@/components/MusicDirector";
import RequirePlayer from "@/components/RequirePlayer";
import { CountdownOverlay, FlashOverlay, IntroCard, QuitButton, ScorePill, ScorePopups, SettingsToggles } from "@/components/HUD";
import { CLIP, N } from "@/design/neon";
import { usePlayerStore } from "@/features/player/store";
import { useRoundSetup } from "@/features/player/useRoundConfig";
import { LEVEL_NAMES } from "@/features/player/progress";
import Keyboard from "./Keyboard";
import {
  isLetterInWordHintUnlocked,
  isRevealSpotHintUnlocked,
  letterFillHintsAllowed,
  maxScore,
  POINTS_HINT_PENALTY,
  wordleDifficultyFor,
  wordleStars,
} from "./scoring";
import { useWordleGame } from "./useWordleGame";
import WordGrid from "./WordGrid";

function Inner() {
  const router = useRouter();
  const finishRound = usePlayerStore((s) => s.finishRound);
  const setup = useRoundSetup("wordle");

  const phase = useWordleGame((s) => s.phase);
  useRoundMusic(phase === "countdown" || phase === "playing" || phase === "result");
  const config = useWordleGame((s) => s.config);
  const difficulty = useWordleGame((s) => s.difficulty);
  const puzzles = useWordleGame((s) => s.puzzles);
  const puzzleIndex = useWordleGame((s) => s.puzzleIndex);
  const currentGuess = useWordleGame((s) => s.currentGuess);
  const score = useWordleGame((s) => s.score);
  const stats = useWordleGame((s) => s.stats);
  const message = useWordleGame((s) => s.message);
  const messageTone = useWordleGame((s) => s.messageTone);
  const shake = useWordleGame((s) => s.shake);
  const startedAt = useWordleGame((s) => s.startedAt);
  const begin = useWordleGame((s) => s.begin);
  const startRound = useWordleGame((s) => s.startRound);
  const typeLetter = useWordleGame((s) => s.typeLetter);
  const backspace = useWordleGame((s) => s.backspace);
  const submitGuess = useWordleGame((s) => s.submitGuess);
  const applyHint = useWordleGame((s) => s.applyHint);
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
  const letterFillsLeft = puzzle
    ? letterFillHintsAllowed(puzzle.guesses.length) - puzzle.letterFillHintsUsed
    : 0;
  const canNextLetter =
    phase === "playing" && !!puzzle && letterFillsLeft > 0 && currentGuess.length < puzzle.answer.length;
  const letterHintUnlocked = !!puzzle && isLetterInWordHintUnlocked(puzzle.guesses.length);
  const spotHintUnlocked = !!puzzle && isRevealSpotHintUnlocked(puzzle.guesses.length);
  const canLetterClue = phase === "playing" && letterHintUnlocked && !!puzzle && !puzzle.letterClue;
  const canRevealSpot = phase === "playing" && spotHintUnlocked && !!puzzle && !puzzle.spotHint;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        bgcolor: N.bg,
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
                clipPath: CLIP.button,
                bgcolor: N.panel,
                border: `1px solid ${N.wordle}59`,
                color: N.text,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-arcade)",
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
                clipPath: CLIP.button,
                bgcolor: N.panel,
                border: `1px solid ${N.wordle}59`,
                color: N.text,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-arcade)",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              {puzzle.guesses.length}/{difficulty.maxGuesses} guesses
            </Box>
          </Stack>

          <WordGrid puzzle={puzzle} currentGuess={currentGuess} maxGuesses={difficulty.maxGuesses} shakeToken={shake} />

          {(puzzle.letterClue || puzzle.spotHint) && (
            <Stack direction="row" spacing={0.75} sx={{ justifyContent: "center", flexWrap: "wrap", rowGap: 0.75 }}>
              {puzzle.letterClue && (
                <Chip
                  size="small"
                  label={`Has a ${puzzle.letterClue}`}
                  sx={{ bgcolor: N.panel, color: N.text, border: `1px solid ${N.wordle}59`, fontWeight: 800 }}
                />
              )}
              {puzzle.spotHint && (
                <Chip
                  size="small"
                  label={`Letter ${puzzle.spotHint.index + 1} is ${puzzle.spotHint.letter}`}
                  sx={{ bgcolor: N.panel, color: N.text, border: `1px solid ${N.wordle}59`, fontWeight: 800 }}
                />
              )}
            </Stack>
          )}

          <Box sx={{ minHeight: 28, textAlign: "center" }}>
            {message && (
              <Typography
                sx={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  color: phase === "result" || messageTone === "info" ? N.text : N.kitchen,
                }}
              >
                {message}
              </Typography>
            )}
          </Box>
        </Stack>
      )}

      {playing && puzzle && (
        <Box
          sx={{
            bgcolor: N.panel,
            borderTop: `1px solid ${N.panelEdge}`,
            p: 1.5,
            pb: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <Stack spacing={1} sx={{ maxWidth: 520, mx: "auto" }}>
            <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center", flexWrap: "wrap", rowGap: 0.5 }}>
              <Button
                size="small"
                variant="text"
                color="secondary"
                startIcon={<LightbulbRoundedIcon />}
                disabled={!canNextLetter}
                onClick={() => applyHint("nextLetter")}
              >
                Next letter (−{POINTS_HINT_PENALTY})
              </Button>
              {letterHintUnlocked && (
                <Button
                  size="small"
                  variant="text"
                  color="secondary"
                  startIcon={<AbcRoundedIcon />}
                  disabled={!canLetterClue}
                  onClick={() => applyHint("letterInWord")}
                >
                  A letter in it (−{POINTS_HINT_PENALTY})
                </Button>
              )}
              {spotHintUnlocked && (
                <Button
                  size="small"
                  variant="text"
                  color="secondary"
                  startIcon={<PinDropRoundedIcon />}
                  disabled={!canRevealSpot}
                  onClick={() => applyHint("revealSpot")}
                >
                  Show a spot (−{POINTS_HINT_PENALTY})
                </Button>
              )}
            </Stack>
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
          accent={N.wordle}
          lines={[
            "Guess the secret word. Every word is 5 letters, from our kids list.",
            "🟩 Green = right letter, right spot.",
            "🟨 Yellow = right letter, wrong spot.",
            `You get ${wordleDifficultyFor(setup.level).maxGuesses} tries per word.`,
            "Stuck? Hints unlock as you go — next letter, a letter in the word, or a spot.",
            ...(setup.isDaily ? ["Everyone gets the same words today. Beat the world!"] : []),
          ]}
          cta="Start guessing"
          onStart={onStart}
          onClose={() => router.push("/adventure")}
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
