import { describe, expect, it } from "vitest";
import {
  bestPuzzleScore,
  evaluateGuess,
  generatePuzzleAnswers,
  lengthForPuzzle,
  maxScore,
  pickWord,
  scorePuzzle,
  wordleDifficultyFor,
  wordleStars,
} from "./scoring";
import { readFileSync } from "node:fs";
import { KIDS_WORDS, parseKidsWordList } from "./words";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("wordleDifficultyFor", () => {
  it("keeps every word at 5 letters and ramps word count and guesses with level", () => {
    const l1 = wordleDifficultyFor(1);
    const l5 = wordleDifficultyFor(5);
    expect(l1).toEqual({ level: 1, wordCount: 3, minLength: 5, maxLength: 5, maxGuesses: 6 });
    expect(l5).toEqual({ level: 5, wordCount: 5, minLength: 5, maxLength: 5, maxGuesses: 5 });
    expect(l5.wordCount).toBeGreaterThan(l1.wordCount);
    expect(l5.maxGuesses).toBeLessThan(l1.maxGuesses);
  });
  it("clamps out-of-range levels", () => {
    expect(wordleDifficultyFor(0)).toEqual(wordleDifficultyFor(1));
    expect(wordleDifficultyFor(99)).toEqual(wordleDifficultyFor(5));
  });
});

describe("lengthForPuzzle", () => {
  it("is 5 letters for every puzzle at every level", () => {
    for (let level = 1; level <= 5; level++) {
      const d = wordleDifficultyFor(level);
      for (let i = 0; i < d.wordCount; i++) expect(lengthForPuzzle(d, i)).toBe(5);
    }
  });
});

describe("kids word list", () => {
  it("is the kids_wordle_words.txt file, one 5-letter word per line", () => {
    const raw = readFileSync(new URL("./kids_wordle_words.txt", import.meta.url), "utf8");
    expect(KIDS_WORDS).toEqual(parseKidsWordList(raw));
    expect(KIDS_WORDS.length).toBeGreaterThan(0);
    expect(KIDS_WORDS.every((word) => /^[a-z]{5}$/.test(word))).toBe(true);
    expect(new Set(KIDS_WORDS).size).toBe(KIDS_WORDS.length);
  });
});

describe("pickWord / generatePuzzleAnswers", () => {
  it("picks a 5-letter word from the kids list", () => {
    const w = pickWord(5, seeded(5));
    expect(w).toHaveLength(5);
    expect(KIDS_WORDS).toContain(w);
  });
  it("never repeats an answer within the same round", () => {
    for (let level = 1; level <= 5; level++) {
      const answers = generatePuzzleAnswers(wordleDifficultyFor(level), seeded(level * 11 + 3));
      expect(new Set(answers).size).toBe(answers.length);
      expect(answers.every((word) => word.length === 5 && KIDS_WORDS.includes(word))).toBe(true);
    }
  });
  it("is deterministic for the same seed (daily challenge)", () => {
    const a = generatePuzzleAnswers(wordleDifficultyFor(3), seeded(42));
    const b = generatePuzzleAnswers(wordleDifficultyFor(3), seeded(42));
    expect(a).toEqual(b);
  });
});

describe("evaluateGuess", () => {
  it("marks exact matches as correct", () => {
    expect(evaluateGuess("cats", "cats")).toEqual(["correct", "correct", "correct", "correct"]);
  });
  it("marks letters in the wrong spot as present", () => {
    expect(evaluateGuess("acts", "cats")).toEqual(["present", "present", "correct", "correct"]);
  });
  it("marks letters not in the word as absent", () => {
    expect(evaluateGuess("frog", "cats")).toEqual(["absent", "absent", "absent", "absent"]);
  });
  it("handles duplicate letters without over-crediting", () => {
    // guess "sappy" vs answer "apple": the middle "p" lines up (correct); the
    // leading "a" and trailing "p" are in the word but in the wrong spot.
    expect(evaluateGuess("sappy", "apple")).toEqual(["absent", "present", "correct", "present", "absent"]);
    // guess "poppy" has three "p"s but "apple" only has two: one lines up
    // (correct), one is elsewhere in the word (present), and the extra one
    // that the word has already "used up" is absent.
    expect(evaluateGuess("poppy", "apple")).toEqual(["present", "absent", "correct", "absent", "absent"]);
  });
  it("is case-insensitive", () => {
    expect(evaluateGuess("CAT", "cat")).toEqual(["correct", "correct", "correct"]);
  });
});

describe("scorePuzzle / bestPuzzleScore / maxScore", () => {
  it("pays more for longer words and fewer guesses", () => {
    expect(scorePuzzle(1, 3)).toBe(100);
    expect(scorePuzzle(1, 5)).toBe(120);
    expect(scorePuzzle(2, 3)).toBe(85);
    expect(scorePuzzle(6, 3)).toBeGreaterThanOrEqual(20);
  });
  it("never scores below the floor even with many guesses or hints", () => {
    expect(scorePuzzle(6, 3, 3)).toBe(20);
  });
  it("charges a penalty per hint used", () => {
    expect(scorePuzzle(1, 3, 1)).toBe(80);
  });
  it("bestPuzzleScore matches a first-try, no-hint solve", () => {
    expect(bestPuzzleScore(4)).toBe(scorePuzzle(1, 4, 0));
  });
  it("sums the best possible score across every puzzle", () => {
    expect(maxScore(["cat", "frog", "apple"])).toBe(bestPuzzleScore(3) + bestPuzzleScore(4) + bestPuzzleScore(5));
  });
});

describe("wordleStars", () => {
  const answers = ["frog", "kite", "seed", "moon"];
  it("grades against the best possible score", () => {
    const max = maxScore(answers);
    expect(wordleStars(max, answers)).toBe(3);
    expect(wordleStars(Math.ceil(max * 0.7), answers)).toBe(2);
    expect(wordleStars(Math.ceil(max * 0.45), answers)).toBe(1);
    expect(wordleStars(0, answers)).toBe(0);
  });
  it("is 0 for an empty round", () => {
    expect(wordleStars(0, [])).toBe(0);
  });
});
