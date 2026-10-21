/**
 * Pure game rules for the kids' word game. No React, so this file is
 * trivially unit-testable (see scoring.test.ts).
 *
 * Secret words come only from kids_wordle_words.txt (see words.ts).
 * Unlike the original Wordle, guesses only need to match the secret word's
 * length - there is no "not in word list" rejection. That keeps things
 * forgiving for younger players who are still building their vocabulary.
 */

import { WORDS_BY_LENGTH, type WordLength } from "./words";

export type LetterStatus = "correct" | "present" | "absent";

export type Rng = () => number;

export const DEFAULT_MAX_GUESSES = 6;
export const POINTS_BASE = 100;
export const POINTS_PER_EXTRA_GUESS = 15;
/** Extra points per letter beyond the shortest (3-letter) words. */
export const POINTS_LENGTH_BONUS = 10;
export const POINTS_HINT_PENALTY = 20;
export const MIN_PUZZLE_SCORE = 20;

/** Knobs that scale with the player's level, mirroring kitchen/delivery difficulty. */
export interface WordleDifficulty {
  level: number;
  /** Puzzles (secret words) in the round. */
  wordCount: number;
  minLength: WordLength;
  maxLength: WordLength;
  maxGuesses: number;
}

const WORD_LENGTH: WordLength = 5;
const WORD_COUNT_BY_LEVEL: readonly number[] = [3, 3, 4, 4, 5];
const MAX_GUESSES_BY_LEVEL: readonly number[] = [6, 6, 6, 5, 5];

export function wordleDifficultyFor(level: number): WordleDifficulty {
  const i = Math.max(1, Math.min(5, Math.floor(level))) - 1;
  return {
    level: i + 1,
    wordCount: WORD_COUNT_BY_LEVEL[i],
    minLength: WORD_LENGTH,
    maxLength: WORD_LENGTH,
    maxGuesses: MAX_GUESSES_BY_LEVEL[i],
  };
}

/** Secret word length for the puzzle at `index`. Every word is 5 letters. */
export function lengthForPuzzle(difficulty: WordleDifficulty, index: number): WordLength {
  const { minLength, maxLength, wordCount } = difficulty;
  if (maxLength <= minLength || wordCount <= 1) return minLength;
  const span = maxLength - minLength;
  const step = Math.min(span, Math.floor((index * (span + 1)) / wordCount));
  return (minLength + step) as WordLength;
}

export function pickWord(length: WordLength, rng: Rng, exclude: ReadonlySet<string> = new Set()): string {
  const all = WORDS_BY_LENGTH[length];
  const pool = all.filter((w) => !exclude.has(w));
  const list = pool.length > 0 ? pool : all;
  return list[Math.floor(rng() * list.length)];
}

/** One 5-letter secret word per puzzle in the round, never repeating. */
export function generatePuzzleAnswers(difficulty: WordleDifficulty, rng: Rng = Math.random): string[] {
  const used = new Set<string>();
  const answers: string[] = [];
  for (let i = 0; i < difficulty.wordCount; i++) {
    const word = pickWord(lengthForPuzzle(difficulty, i), rng, used);
    used.add(word);
    answers.push(word);
  }
  return answers;
}

/**
 * Classic two-pass Wordle grading: exact matches first, then leftover letters
 * (respecting duplicate-letter counts) are marked "present".
 */
export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const g = guess.toLowerCase();
  const a = answer.toLowerCase();
  const len = a.length;
  const statuses: LetterStatus[] = new Array(len).fill("absent");
  const leftover = new Map<string, number>();

  for (let i = 0; i < len; i++) {
    if (g[i] === a[i]) {
      statuses[i] = "correct";
    } else {
      leftover.set(a[i], (leftover.get(a[i]) ?? 0) + 1);
    }
  }
  for (let i = 0; i < len; i++) {
    if (statuses[i] === "correct") continue;
    const remaining = leftover.get(g[i]) ?? 0;
    if (remaining > 0) {
      statuses[i] = "present";
      leftover.set(g[i], remaining - 1);
    }
  }
  return statuses;
}

/** Points for solving a puzzle: fewer guesses and longer words pay more; hints cost points. */
export function scorePuzzle(guessesUsed: number, wordLength: number, hintsUsed = 0): number {
  const lengthBonus = (wordLength - 3) * POINTS_LENGTH_BONUS;
  const raw = POINTS_BASE + lengthBonus - (guessesUsed - 1) * POINTS_PER_EXTRA_GUESS - hintsUsed * POINTS_HINT_PENALTY;
  return Math.max(MIN_PUZZLE_SCORE, raw);
}

/** Best possible score for a word (solved first try, no hints). */
export function bestPuzzleScore(wordLength: number): number {
  return scorePuzzle(1, wordLength);
}

/** Best possible score for a whole round (used for the results screen and star rating). */
export function maxScore(answers: readonly string[]): number {
  return answers.reduce((sum, a) => sum + bestPuzzleScore(a.length), 0);
}

/** 0-3 stars for a round, from the share of the best possible score. */
export function wordleStars(score: number, answers: readonly string[]): number {
  const max = maxScore(answers);
  if (max <= 0) return 0;
  const ratio = score / max;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.45) return 1;
  return 0;
}
