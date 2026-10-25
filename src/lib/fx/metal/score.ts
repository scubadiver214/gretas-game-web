/**
 * "Throttle Thunder": the racing soundtrack as plain data.
 *
 * 168 BPM, E minor, 16 bars (about 23 s) that loop. Bars 0-7 are the riff and
 * drums on their own. Bars 8-15 repeat the riff with a twin-guitar-style lead
 * on top and a darker turnaround. Everything is MIDI note numbers and sixteenth
 * note steps, so it is easy to test and has no Web Audio in it.
 */

export const BPM = 168;
export const STEPS_PER_BAR = 16;
export const BARS = 16;
export const LOOP_STEPS = STEPS_PER_BAR * BARS;
/** Length of one sixteenth note. */
export const STEP_SECONDS = 60 / BPM / 4;
export const LOOP_SECONDS = LOOP_STEPS * STEP_SECONDS;

const E2 = 40;
const C2 = 36;
const D2 = 38;
const G2 = 43;
const A2 = 45;
const BB2 = 46;

/**
 * Rhythm guitar, one character per sixteenth.
 *   X  accented chord, rings for two steps
 *   x  palm-muted chug
 *   P  short stab
 *   .  rest
 */
type RiffName = "gallop" | "gallopFill" | "chug" | "chugStab";

const RIFFS: Record<RiffName, string> = {
  gallop: "X.xxx.xxx.xxx.xx",
  gallopFill: "X.xxx.xxx.xxxxxx",
  chug: "XxxxXxxxXxxxXxxx",
  chugStab: "XxxxXxxxXxxxP.P.",
};

interface BarDef {
  root: number;
  riff: RiffName;
}

const PHRASE_A: readonly BarDef[] = [
  { root: E2, riff: "gallop" },
  { root: E2, riff: "gallop" },
  { root: G2, riff: "gallop" },
  { root: A2, riff: "gallopFill" },
  { root: E2, riff: "chug" },
  { root: E2, riff: "chug" },
  { root: C2, riff: "chug" },
  { root: D2, riff: "chugStab" },
];

/** Same bones as A, but bar 3 drops to the tritone for a darker turn. */
const PHRASE_B: readonly BarDef[] = PHRASE_A.map((bar, i) => (i === 3 ? { root: BB2, riff: "gallopFill" as const } : bar));

const BAR_DEFS: readonly BarDef[] = [...PHRASE_A, ...PHRASE_B];

/** Lead notes for phrase B: [step, midi, lengthInSteps]. One list per bar. */
const LEAD: readonly (readonly (readonly [number, number, number])[])[] = [
  [[0, 76, 6], [6, 74, 2], [8, 71, 6], [14, 74, 2]],
  [[0, 76, 8], [8, 79, 4], [12, 76, 4]],
  [[0, 74, 4], [4, 79, 4], [8, 76, 8]],
  [[0, 76, 4], [4, 74, 4], [8, 70, 4], [12, 69, 4]],
  [[0, 83, 4], [4, 79, 4], [8, 76, 4], [12, 79, 4]],
  [[0, 83, 6], [6, 79, 2], [8, 76, 8]],
  [[0, 79, 4], [4, 76, 4], [8, 72, 8]],
  [[0, 74, 4], [4, 71, 4], [8, 69, 4], [12, 71, 4]],
];

export interface GuitarHit {
  /** MIDI notes of the power chord (root, fifth, octave). */
  notes: number[];
  steps: number;
  muted: boolean;
  accent: boolean;
}

export interface StepEvents {
  guitar: GuitarHit | null;
  bass: { note: number; steps: number } | null;
  kick: boolean;
  snare: boolean;
  hat: "closed" | "open" | null;
  crash: boolean;
  lead: { note: number; steps: number } | null;
}

/** Everything that happens on one sixteenth-note step. `step` wraps around the loop. */
export function stepEvents(step: number): StepEvents {
  const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const bar = Math.floor(s / STEPS_PER_BAR);
  const inBar = s % STEPS_PER_BAR;
  const def = BAR_DEFS[bar];
  const riff = RIFFS[def.riff];
  const hit = riff[inBar];
  const active = hit !== ".";
  const isChug = def.riff === "chug";
  const lastBarOfPhrase = bar % 8 === 7;

  let guitar: GuitarHit | null = null;
  if (active) {
    const accent = hit === "X" || hit === "P";
    guitar = {
      notes: [def.root, def.root + 7, def.root + 12],
      steps: hit === "X" ? 2 : 1,
      muted: hit === "x",
      accent,
    };
  }

  const bass = active ? { note: def.root, steps: hit === "X" ? 2 : 1 } : null;

  // Double-kick under the chugging bars, gallop-locked kick everywhere else.
  const kick = isChug ? !(lastBarOfPhrase && inBar >= 12 && inBar % 2 === 1) : active;

  let snare = inBar === 4 || inBar === 12;
  if (lastBarOfPhrase && inBar >= 12) snare = true; // four-step roll into the loop point
  if (def.riff === "gallopFill" && (inBar === 14 || inBar === 15)) snare = true;

  let hat: StepEvents["hat"] = null;
  if (inBar % 2 === 0) hat = isChug && inBar % 8 === 0 ? "open" : "closed";
  if (snare) hat = null;

  const crash = inBar === 0 && (bar === 0 || bar === 8 || bar === 12);

  let lead: StepEvents["lead"] = null;
  if (bar >= 8) {
    const note = LEAD[bar - 8].find(([at]) => at === inBar);
    if (note) lead = { note: note[1], steps: note[2] };
  }

  return { guitar, bass, kick, snare, hat, crash, lead };
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
