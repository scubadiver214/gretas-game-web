/**
 * Pure game rules for the kids' word game. No React, so this file is
 * trivially unit-testable (see scoring.test.ts).
 *
 * Secret words and guesses both come from kids_wordle_words.txt (see words.ts).
 * Random letter strings are rejected. Extra hint types unlock after missed guesses.
 */

import { WORDS_BY_LENGTH, type WordLength } from "./words";

export { isAllowedGuess } from "./words";

export type LetterStatus = "correct" | "present" | "absent";

export type Rng = () => number;

export const DEFAULT_MAX_GUESSES = 6;
export const POINTS_BASE = 100;
export const POINTS_PER_EXTRA_GUESS = 15;
/** Extra points per letter beyond the shortest (3-letter) words. */
export const POINTS_LENGTH_BONUS = 10;
export const POINTS_HINT_PENALTY = 20;
export const MIN_PUZZLE_SCORE = 20;

export type WordleHintKind = "nextLetter" | "letterInWord" | "revealSpot";

export interface SpotHint {
  index: number;
  letter: string;
}

/** Next-letter fills allowed after this many committed guesses. Starts at 1; more unlock when stuck. */
export function letterFillHintsAllowed(guessesUsed: number): number {
  if (guessesUsed >= 3) return 3;
  if (guessesUsed >= 2) return 2;
  return 1;
}

/** Unlocks after two misses: tell the player a letter that is in the word. */
export function isLetterInWordHintUnlocked(guessesUsed: number): boolean {
  return guessesUsed >= 2;
}

/** Unlocks after three misses: reveal one letter in its correct spot. */
export function isRevealSpotHintUnlocked(guessesUsed: number): boolean {
  return guessesUsed >= 3;
}

/** Prefer a letter from the answer that has not been guessed yet; skip letters already known-correct. */
export function pickLetterInWordClue(
  answer: string,
  guesses: readonly string[],
  statuses: readonly LetterStatus[][],
): string | null {
  const a = answer.toLowerCase();
  const knownCorrect = new Set<string>();
  const guessed = new Set<string>();
  for (let r = 0; r < guesses.length; r++) {
    const guess = guesses[r].toLowerCase();
    const row = statuses[r] ?? [];
    for (let i = 0; i < guess.length; i++) {
      guessed.add(guess[i]);
      if (row[i] === "correct") knownCorrect.add(guess[i]);
    }
  }
  const unused = [...a].find((ch) => !guessed.has(ch));
  if (unused) return unused.toUpperCase();
  const hidden = [...a].find((ch) => !knownCorrect.has(ch));
  return hidden ? hidden.toUpperCase() : null;
}

/** First answer index that has never been marked correct. */
export function pickRevealSpot(answer: string, statuses: readonly LetterStatus[][]): SpotHint | null {
  const a = answer.toLowerCase();
  const known = new Array<boolean>(a.length).fill(false);
  for (const row of statuses) {
    for (let i = 0; i < row.length; i++) {
      if (row[i] === "correct") known[i] = true;
    }
  }
  const index = known.findIndex((already) => !already);
  if (index < 0) return null;
  return { index, letter: a[index].toUpperCase() };
}

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
