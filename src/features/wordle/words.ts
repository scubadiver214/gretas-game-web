/**
 * Answer list for the kids' word game.
 *
 * `kids_wordle_words.txt` is the source of truth: one easy, lowercase word
 * per line. The game only draws secret words from that file.
 */

import kidsWordleWordsRaw from "./kids_wordle_words.txt";

export type WordLength = 5;

/** Parse the approved word list. Blank lines are skipped; the first copy of a word wins. */
export function parseKidsWordList(raw: string): readonly string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const word = line.trim().toLowerCase();
    if (!word || seen.has(word)) continue;
    words.push(word);
  }
  return words;
}

/** Every secret word the game is allowed to choose, in file order. */
export const KIDS_WORDS: readonly string[] = parseKidsWordList(kidsWordleWordsRaw);

export const WORDS_BY_LENGTH: Readonly<Record<WordLength, readonly string[]>> = {
  5: KIDS_WORDS,
};
