"use client";

import { create } from "zustand";
import { fx, music, useJuice } from "@/lib/fx";
import { seededRng } from "@/lib/rng";
import {
  evaluateGuess,
  generatePuzzleAnswers,
  scorePuzzle,
  wordleDifficultyFor,
  type LetterStatus,
  type WordleDifficulty,
} from "./scoring";

export type WordlePhase = "intro" | "countdown" | "playing" | "result" | "finished";

export interface WordleStats {
  solved: number;
  failed: number;
  totalGuesses: number;
  hints: number;
  /** Fewest guesses used to solve a word this round (0 if none solved yet). */
  bestGuesses: number;
}

export interface PuzzleState {
  answer: string;
  guesses: string[];
  statuses: LetterStatus[][];
  hintUsed: boolean;
  solved: boolean;
  failed: boolean;
}

/** How a round should be set up. `seed` makes the words deterministic (daily challenge). */
export interface RoundConfig {
  level: number;
  seed?: string;
  challengeDate?: string;
}

interface WordleState {
  phase: WordlePhase;
  config: RoundConfig;
  difficulty: WordleDifficulty;
  puzzles: PuzzleState[];
  puzzleIndex: number;
  currentGuess: string;
  score: number;
  stats: WordleStats;
  startedAt: number;
  /** Feedback line shown under the grid (e.g. "Need 4 letters", the reveal on a miss). */
  message: string | null;
  /** Bumped to retrigger the "not enough letters" shake animation. */
  shake: number;
  begin: (config: RoundConfig) => void;
  startRound: () => void;
  typeLetter: (letter: string) => void;
  backspace: () => void;
  submitGuess: () => void;
  useHint: () => void;
  reset: () => void;
}

let advanceTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = null;
}

const initialStats: WordleStats = { solved: 0, failed: 0, totalGuesses: 0, hints: 0, bestGuesses: 0 };

const initial = {
  phase: "intro" as WordlePhase,
  config: { level: 1 } as RoundConfig,
  difficulty: wordleDifficultyFor(1),
  puzzles: [] as PuzzleState[],
  puzzleIndex: 0,
  currentGuess: "",
  score: 0,
  stats: initialStats,
  startedAt: 0,
  message: null as string | null,
  shake: 0,
};

export const useWordleGame = create<WordleState>()((set, get) => ({
  ...initial,

  begin: (config) => {
    clearTimers();
    fx.unlock();
    useJuice.getState().clear();
    const difficulty = wordleDifficultyFor(config.level);
    const rng = config.seed ? seededRng(`${config.seed}:wordle`) : Math.random;
    const puzzles: PuzzleState[] = generatePuzzleAnswers(difficulty, rng).map((answer) => ({
      answer,
      guesses: [],
      statuses: [],
      hintUsed: false,
      solved: false,
      failed: false,
    }));
    set({ ...initial, config, difficulty, puzzles, phase: "countdown" });
  },

  startRound: () => {
    set({ phase: "playing", startedAt: Date.now() });
    music.play("menu");
    music.intensity(0);
  },

  typeLetter: (letter) => {
    const s = get();
    if (s.phase !== "playing") return;
    const puzzle = s.puzzles[s.puzzleIndex];
    if (!puzzle || s.currentGuess.length >= puzzle.answer.length) return;
    fx.tap();
    set({ currentGuess: s.currentGuess + letter.toUpperCase(), message: null });
  },

  backspace: () => {
    const s = get();
    if (s.phase !== "playing" || s.currentGuess.length === 0) return;
    fx.tap();
    set({ currentGuess: s.currentGuess.slice(0, -1) });
  },

  useHint: () => {
    const s = get();
    if (s.phase !== "playing") return;
    const puzzle = s.puzzles[s.puzzleIndex];
    if (!puzzle || puzzle.hintUsed || s.currentGuess.length >= puzzle.answer.length) return;
    const nextLetter = puzzle.answer[s.currentGuess.length].toUpperCase();
    const puzzles = s.puzzles.map((p, i) => (i === s.puzzleIndex ? { ...p, hintUsed: true } : p));
    fx.tick();
    useJuice.getState().popup("Hint!", "neutral", { x: 0.5, y: 0.3 });
    set({ puzzles, currentGuess: s.currentGuess + nextLetter, stats: { ...s.stats, hints: s.stats.hints + 1 } });
  },

  submitGuess: () => {
    const s = get();
    if (s.phase !== "playing") return;
    const puzzle = s.puzzles[s.puzzleIndex];
    if (!puzzle) return;
    const length = puzzle.answer.length;
    if (s.currentGuess.length !== length) {
      fx.bad();
      set({ message: `Need ${length} letters`, shake: s.shake + 1 });
      return;
    }

    const guess = s.currentGuess;
    const statuses = evaluateGuess(guess, puzzle.answer);
    const guesses = [...puzzle.guesses, guess];
    const solvedNow = guess.toLowerCase() === puzzle.answer.toLowerCase();
    const failedNow = !solvedNow && guesses.length >= s.difficulty.maxGuesses;
    const updatedPuzzle: PuzzleState = {
      ...puzzle,
      guesses,
      statuses: [...puzzle.statuses, statuses],
      solved: solvedNow,
      failed: failedNow,
    };
    const puzzles = s.puzzles.map((p, i) => (i === s.puzzleIndex ? updatedPuzzle : p));
    const juice = useJuice.getState();

    if (solvedNow) {
      const points = scorePuzzle(guesses.length, length, updatedPuzzle.hintUsed ? 1 : 0);
      fx.great();
      juice.popup(`+${points}!`, "great", { x: 0.5, y: 0.32 }, true);
      juice.flashScreen("rgba(223,255,223,0.6)");
      juice.hitStop(80);
      set({
        puzzles,
        currentGuess: "",
        phase: "result",
        score: s.score + points,
        message: guesses.length === 1 ? "First try! Amazing!" : "Nailed it! 🎉",
        stats: {
          ...s.stats,
          solved: s.stats.solved + 1,
          totalGuesses: s.stats.totalGuesses + guesses.length,
          bestGuesses: s.stats.bestGuesses === 0 ? guesses.length : Math.min(s.stats.bestGuesses, guesses.length),
        },
      });
      advance(set, get, 1500);
    } else if (failedNow) {
      fx.bad();
      juice.popup(puzzle.answer.toUpperCase(), "bad", { x: 0.5, y: 0.32 }, true);
      set({
        puzzles,
        currentGuess: "",
        phase: "result",
        message: `So close! It was "${puzzle.answer.toUpperCase()}"`,
        stats: { ...s.stats, failed: s.stats.failed + 1, totalGuesses: s.stats.totalGuesses + guesses.length },
      });
      advance(set, get, 2200);
    } else {
      fx.pop();
      set({ puzzles, currentGuess: "", message: null });
    }
  },

  reset: () => {
    clearTimers();
    music.stop();
    set({ ...initial });
  },
}));

type Set = (partial: Partial<WordleState>) => void;
type Get = () => WordleState;

/** Move to the next word (or finish the round) after a short pause. */
function advance(set: Set, get: Get, delayMs: number) {
  clearTimers();
  advanceTimer = setTimeout(() => {
    const s = get();
    const isLast = s.puzzleIndex >= s.puzzles.length - 1;
    if (isLast) {
      clearTimers();
      music.stop(0.8);
      set({ phase: "finished" });
    } else {
      set({ phase: "playing", puzzleIndex: s.puzzleIndex + 1, currentGuess: "", message: null });
    }
  }, delayMs);
}
