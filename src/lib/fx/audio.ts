"use client";

/**
 * Sound bank for the game.
 *
 * Every sound has a synthesised version (layered oscillators, filtered noise,
 * short envelopes) so the game ships with no audio assets. If a recorded
 * sample exists under /sounds (see SAMPLES below) it is loaded once and used
 * instead - drop files in public/sounds to upgrade any effect without code
 * changes. Repeated sounds get a little random pitch variation so rapid taps
 * never sound robotic.
 */

import { getAudioContext, getSfxBus } from "./mixer";

export type SoundId =
  | "tap" // UI tap
  | "pop" // topping lands on the pizza
  | "good" // points earned
  | "great" // perfect bake / big win
  | "bad" // wrong topping / generic miss
  | "whoosh" // pizza slides into the oven
  | "sizzle" // oven running
  | "ding" // oven timer / perfect zone
  | "tick" // countdown 3-2-1
  | "go" // countdown Go!
  | "bell" // bike bell (lane change)
  | "jump" // bike hop
  | "land" // bike lands
  | "splash" // puddle
  | "crash" // cone / barrier
  | "combo" // combo bonus
  | "powerup" // picked up a power-up
  | "shield" // shield absorbed a hit
  | "hurry" // order timer running out
  | "fanfare" // results screen
  | "best" // new personal best sting
  | "levelup" // level unlocked
  | "unlock" // achievement / cosmetic unlocked
  | "hop" // frog hop
  | "home" // frog reached a home bay
  | "levelclear" // all five bays filled
  | "gameover"; // last life lost

/**
 * Optional recorded samples. Paths are relative to /public. Provide one or
 * more alternates per sound; a random one is picked per play. Missing files
 * are ignored and the synth version is used.
 */
export const SAMPLES: Partial<Record<SoundId, string[]>> = {};

let bank: Partial<Record<SoundId, AudioBuffer[]>> = {};
let bankLoading: Promise<void> | null = null;

/** Fetch and decode any recorded samples listed in SAMPLES (once). */
export function loadSoundBank(): Promise<void> {
  if (bankLoading) return bankLoading;
  const ac = getAudioContext();
  if (!ac) return Promise.resolve();
  bankLoading = (async () => {
    const entries = Object.entries(SAMPLES) as [SoundId, string[]][];
    await Promise.all(
      entries.map(async ([id, urls]) => {
        const buffers: AudioBuffer[] = [];
        for (const url of urls) {
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            buffers.push(await ac.decodeAudioData(await res.arrayBuffer()));
          } catch {
            // best effort; the synth fallback covers it
          }
        }
        if (buffers.length) bank = { ...bank, [id]: buffers };
      }),
    );
  })();
  return bankLoading;
}

// ---------------------------------------------------------------------------
// Synth building blocks
// ---------------------------------------------------------------------------

interface ToneOpts {
  type?: OscillatorType;
  from: number;
  to?: number;
  start?: number;
  duration: number;
  gain?: number;
  /** Attack in seconds. */
  attack?: number;
  /** Detune in cents (applied on top of the random pitch variation). */
  detune?: number;
  /** Optional low-pass cutoff to soften square/saw voices. */
  lowpass?: number;
}

interface Voice {
  ac: AudioContext;
  out: AudioNode;
  /** Pitch multiplier for this play (random variation). */
  pitch: number;
}

function tone(v: Voice, o: ToneOpts) {
  const { ac } = v;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const t0 = ac.currentTime + (o.start ?? 0);
  const t1 = t0 + o.duration;
  osc.type = o.type ?? "sine";
  osc.detune.value = o.detune ?? 0;
  osc.frequency.setValueAtTime(o.from * v.pitch, t0);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * v.pitch), t1);
  const g = o.gain ?? 0.18;
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(g, t0 + (o.attack ?? 0.012));
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);
  let head: AudioNode = osc;
  if (o.lowpass) {
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.lowpass;
    head.connect(lp);
    head = lp;
  }
  head.connect(amp).connect(v.out);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

interface NoiseOpts {
  duration: number;
  gain?: number;
  start?: number;
  type?: BiquadFilterType;
  frequency?: number;
  /** Sweep the filter to this frequency over the duration. */
  to?: number;
  q?: number;
  attack?: number;
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const frames = ac.sampleRate; // 1 s of white noise, reused for every burst
  noiseBuffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function noise(v: Voice, o: NoiseOpts) {
  const { ac } = v;
  const t0 = ac.currentTime + (o.start ?? 0);
  const t1 = t0 + o.duration;
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = o.type ?? "bandpass";
  filter.frequency.setValueAtTime((o.frequency ?? 900) * v.pitch, t0);
  if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to * v.pitch, t1);
  filter.Q.value = o.q ?? 0.7;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(o.gain ?? 0.12, t0 + (o.attack ?? 0.005));
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);
  src.connect(filter).connect(amp).connect(v.out);
  src.start(t0);
  src.stop(t1 + 0.02);
}

/** Short plucked note (mandolin-ish): bright attack that darkens quickly. */
function pluck(v: Voice, freq: number, start: number, duration: number, gain = 0.16) {
  tone(v, { type: "triangle", from: freq, start, duration, gain, attack: 0.004 });
  tone(v, { type: "square", from: freq * 2, start, duration: duration * 0.35, gain: gain * 0.25, attack: 0.002, lowpass: 3200 });
}

function chord(v: Voice, freqs: number[], start: number, duration: number, gain = 0.12, type: OscillatorType = "triangle") {
  freqs.forEach((f) => tone(v, { type, from: f, start, duration, gain, attack: 0.01 }));
}

// ---------------------------------------------------------------------------
// The sounds
// ---------------------------------------------------------------------------

const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880, B5 = 987.77, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

/** Alternates are picked at random per play; `variation` is max pitch change (fraction). */
const SYNTH: Record<SoundId, { variation: number; alternates: ((v: Voice) => void)[] }> = {
  tap: {
    variation: 0.06,
    alternates: [
      (v) => tone(v, { type: "triangle", from: 520, to: 660, duration: 0.07, gain: 0.12 }),
      (v) => tone(v, { type: "triangle", from: 560, to: 700, duration: 0.06, gain: 0.11 }),
    ],
  },
  pop: {
    variation: 0.12,
    alternates: [
      (v) => {
        tone(v, { type: "sine", from: 420, to: 880, duration: 0.09, gain: 0.2, attack: 0.003 });
        noise(v, { duration: 0.04, gain: 0.05, frequency: 2400, q: 1.2 });
      },
      (v) => {
        tone(v, { type: "sine", from: 380, to: 760, duration: 0.1, gain: 0.2, attack: 0.003 });
        noise(v, { duration: 0.04, gain: 0.05, frequency: 2000, q: 1.2 });
      },
    ],
  },
  good: {
    variation: 0.04,
    alternates: [
      (v) => {
        pluck(v, E5, 0, 0.12, 0.16);
        pluck(v, B5, 0.07, 0.16, 0.14);
      },
      (v) => {
        pluck(v, G5, 0, 0.12, 0.16);
        pluck(v, C6, 0.07, 0.16, 0.14);
      },
    ],
  },
  great: {
    variation: 0.02,
    alternates: [
      (v) => {
        [C5, E5, G5, C6].forEach((f, i) => pluck(v, f, i * 0.07, 0.18, 0.15));
        chord(v, [C6, E6, G6], 0.28, 0.5, 0.05, "sine");
        noise(v, { duration: 0.5, start: 0.28, gain: 0.03, type: "highpass", frequency: 6000 });
      },
    ],
  },
  bad: {
    variation: 0.05,
    alternates: [
      (v) => {
        tone(v, { type: "sawtooth", from: 220, to: 110, duration: 0.22, gain: 0.09, lowpass: 1200 });
        tone(v, { type: "square", from: 233, to: 116, duration: 0.2, gain: 0.05, lowpass: 900 });
        noise(v, { duration: 0.12, gain: 0.06, frequency: 700 });
      },
      (v) => {
        tone(v, { type: "sawtooth", from: 196, to: 98, duration: 0.24, gain: 0.09, lowpass: 1200 });
        noise(v, { duration: 0.1, gain: 0.06, frequency: 600 });
      },
    ],
  },
  whoosh: {
    variation: 0.08,
    alternates: [(v) => noise(v, { duration: 0.32, gain: 0.16, frequency: 500, to: 2400, q: 0.8, attack: 0.08 })],
  },
  sizzle: {
    variation: 0.03,
    alternates: [
      (v) => {
        noise(v, { duration: 0.9, gain: 0.05, type: "highpass", frequency: 3500, attack: 0.05 });
        noise(v, { duration: 0.9, gain: 0.03, frequency: 1200, q: 0.4, attack: 0.1 });
      },
    ],
  },
  ding: {
    variation: 0.01,
    alternates: [
      (v) => {
        tone(v, { type: "sine", from: 1760, duration: 0.6, gain: 0.14, attack: 0.002 });
        tone(v, { type: "sine", from: 1760 * 2.76, duration: 0.25, gain: 0.05, attack: 0.002 });
        tone(v, { type: "sine", from: 1760 * 1.5, duration: 0.4, gain: 0.04, attack: 0.002 });
      },
    ],
  },
  tick: {
    variation: 0,
    alternates: [(v) => tone(v, { type: "square", from: 880, duration: 0.06, gain: 0.07, lowpass: 3000 })],
  },
  go: {
    variation: 0,
    alternates: [
      (v) => {
        tone(v, { type: "square", from: 660, to: 1320, duration: 0.25, gain: 0.09, lowpass: 4000 });
        chord(v, [C5, E5, G5], 0.05, 0.3, 0.06);
      },
    ],
  },
  bell: {
    variation: 0.04,
    alternates: [
      (v) => {
        tone(v, { type: "sine", from: 2093, duration: 0.18, gain: 0.12, attack: 0.002 });
        tone(v, { type: "sine", from: 2093 * 2.4, duration: 0.09, gain: 0.05, attack: 0.002 });
        tone(v, { type: "sine", from: 2637, start: 0.06, duration: 0.16, gain: 0.1, attack: 0.002 });
      },
    ],
  },
  jump: {
    variation: 0.06,
    alternates: [
      (v) => {
        tone(v, { type: "square", from: 300, to: 900, duration: 0.18, gain: 0.08, lowpass: 2500 });
        noise(v, { duration: 0.08, gain: 0.04, frequency: 1500 });
      },
    ],
  },
  land: {
    variation: 0.08,
    alternates: [
      (v) => {
        tone(v, { type: "sine", from: 140, to: 60, duration: 0.12, gain: 0.16, attack: 0.002 });
        noise(v, { duration: 0.06, gain: 0.06, type: "lowpass", frequency: 800 });
      },
    ],
  },
  splash: {
    variation: 0.08,
    alternates: [
      (v) => {
        noise(v, { duration: 0.35, gain: 0.14, frequency: 1800, to: 500, q: 0.6, attack: 0.004 });
        tone(v, { type: "sine", from: 520, to: 180, duration: 0.2, gain: 0.08 });
        for (let i = 0; i < 5; i++) tone(v, { type: "sine", from: 1400 + i * 260, start: 0.05 + i * 0.04, duration: 0.05, gain: 0.03 });
      },
    ],
  },
  crash: {
    variation: 0.06,
    alternates: [
      (v) => {
        noise(v, { duration: 0.25, gain: 0.18, type: "lowpass", frequency: 2200, to: 300, attack: 0.002 });
        tone(v, { type: "sawtooth", from: 180, to: 70, duration: 0.22, gain: 0.1, lowpass: 1000 });
        tone(v, { type: "square", from: 90, to: 45, duration: 0.18, gain: 0.08, lowpass: 600 });
      },
    ],
  },
  combo: {
    variation: 0.02,
    alternates: [
      (v) => {
        [E5, G5, B5, E6].forEach((f, i) => pluck(v, f, i * 0.06, 0.16, 0.14));
        chord(v, [E6, G6], 0.24, 0.4, 0.05, "sine");
      },
      (v) => {
        [D5, F5, A5, D5 * 2].forEach((f, i) => pluck(v, f, i * 0.06, 0.16, 0.14));
        chord(v, [D5 * 2, A5 * 2], 0.24, 0.4, 0.05, "sine");
      },
    ],
  },
  powerup: {
    variation: 0.02,
    alternates: [
      (v) => {
        for (let i = 0; i < 8; i++) tone(v, { type: "square", from: 440 * Math.pow(1.1225, i), start: i * 0.04, duration: 0.09, gain: 0.07, lowpass: 5000 });
        chord(v, [A5, C6 * 1.0595, E6], 0.3, 0.5, 0.06, "sine");
      },
    ],
  },
  shield: {
    variation: 0.03,
    alternates: [
      (v) => {
        tone(v, { type: "sine", from: 900, to: 300, duration: 0.3, gain: 0.12 });
        tone(v, { type: "triangle", from: 1800, to: 600, duration: 0.3, gain: 0.06 });
        noise(v, { duration: 0.2, gain: 0.04, type: "highpass", frequency: 4000 });
      },
    ],
  },
  hurry: {
    variation: 0,
    alternates: [
      (v) => {
        tone(v, { type: "square", from: 1046, duration: 0.05, gain: 0.05, lowpass: 3000 });
        tone(v, { type: "square", from: 784, start: 0.09, duration: 0.05, gain: 0.05, lowpass: 3000 });
      },
    ],
  },
  fanfare: {
    variation: 0,
    alternates: [
      (v) => {
        const notes = [C5, C5, C5, E5, G5, E5, G5];
        const starts = [0, 0.12, 0.24, 0.36, 0.55, 0.8, 0.95];
        notes.forEach((f, i) => {
          const last = i === notes.length - 1;
          pluck(v, f, starts[i], last ? 0.6 : 0.16, 0.15);
          tone(v, { type: "square", from: f / 2, start: starts[i], duration: last ? 0.6 : 0.14, gain: 0.04, lowpass: 900 });
        });
        chord(v, [C5, E5, G5, C6], 0.95, 0.9, 0.06, "sine");
        noise(v, { duration: 0.9, start: 0.95, gain: 0.03, type: "highpass", frequency: 5000, attack: 0.05 });
      },
    ],
  },
  best: {
    variation: 0,
    alternates: [
      (v) => {
        [G5, C6, E6, G6].forEach((f, i) => pluck(v, f, i * 0.09, 0.3, 0.15));
        chord(v, [C6, E6, G6, C6 * 2], 0.36, 1.1, 0.06, "sine");
        for (let i = 0; i < 6; i++) tone(v, { type: "sine", from: 2093 + i * 330, start: 0.4 + i * 0.05, duration: 0.25, gain: 0.03 });
      },
    ],
  },
  levelup: {
    variation: 0,
    alternates: [
      (v) => {
        [C5, D5, E5, G5, C6].forEach((f, i) => pluck(v, f, i * 0.08, 0.2, 0.14));
        chord(v, [C5, E5, G5, C6, E6], 0.42, 1.0, 0.06);
        tone(v, { type: "square", from: C5 / 2, start: 0.42, duration: 1.0, gain: 0.04, lowpass: 700 });
      },
    ],
  },
  unlock: {
    variation: 0,
    alternates: [
      (v) => {
        tone(v, { type: "sine", from: 1568, duration: 0.5, gain: 0.1, attack: 0.002 });
        tone(v, { type: "sine", from: 2093, start: 0.12, duration: 0.6, gain: 0.1, attack: 0.002 });
        tone(v, { type: "sine", from: 2637, start: 0.24, duration: 0.8, gain: 0.08, attack: 0.002 });
      },
    ],
  },
  hop: {
    variation: 0.08,
    alternates: [
      (v) => tone(v, { type: "square", from: 380, to: 760, duration: 0.07, gain: 0.06, lowpass: 2600, attack: 0.003 }),
      (v) => tone(v, { type: "square", from: 420, to: 820, duration: 0.065, gain: 0.06, lowpass: 2600, attack: 0.003 }),
    ],
  },
  home: {
    variation: 0.01,
    alternates: [
      (v) => {
        [G5, C6, E6].forEach((f, i) => pluck(v, f, i * 0.07, 0.2, 0.14));
        tone(v, { type: "sine", from: 2093, start: 0.2, duration: 0.4, gain: 0.05, attack: 0.002 });
      },
    ],
  },
  levelclear: {
    variation: 0,
    alternates: [
      (v) => {
        [C5, E5, G5, C6, G5, C6, E6].forEach((f, i) => pluck(v, f, i * 0.09, i === 6 ? 0.6 : 0.16, 0.15));
        chord(v, [C5, E5, G5, C6], 0.63, 0.9, 0.06, "sine");
        noise(v, { duration: 0.8, start: 0.63, gain: 0.03, type: "highpass", frequency: 5000, attack: 0.05 });
      },
    ],
  },
  gameover: {
    variation: 0,
    alternates: [
      (v) => {
        [G5, E5, C5, G5 / 2].forEach((f, i) => {
          tone(v, { type: "triangle", from: f, start: i * 0.2, duration: i === 3 ? 0.7 : 0.22, gain: 0.13 });
          tone(v, { type: "square", from: f / 2, start: i * 0.2, duration: i === 3 ? 0.7 : 0.2, gain: 0.03, lowpass: 900 });
        });
      },
    ],
  },
};

function playSample(ac: AudioContext, out: AudioNode, buffers: AudioBuffer[], variation: number) {
  const src = ac.createBufferSource();
  src.buffer = buffers[Math.floor(Math.random() * buffers.length)];
  src.playbackRate.value = 1 + (Math.random() * 2 - 1) * variation;
  const amp = ac.createGain();
  amp.gain.value = 0.9;
  src.connect(amp).connect(out);
  src.start();
}

/** Play a sound effect. Silently no-ops without Web Audio support. */
export function playSound(id: SoundId): void {
  const ac = getAudioContext();
  const out = getSfxBus();
  if (!ac || !out) return;
  try {
    const spec = SYNTH[id];
    const recorded = bank[id];
    if (recorded?.length) {
      playSample(ac, out, recorded, spec.variation);
      return;
    }
    const pitch = 1 + (Math.random() * 2 - 1) * spec.variation;
    const alt = spec.alternates[Math.floor(Math.random() * spec.alternates.length)];
    alt({ ac, out, pitch });
  } catch {
    // Audio is best-effort; never let it break gameplay.
  }
}

/** Warm the context up inside a user gesture so later sounds are instant on iOS. */
export function unlockAudio(): void {
  if (getAudioContext()) void loadSoundBank();
}
