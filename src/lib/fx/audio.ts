"use client";

/**
 * Tiny synthesised sound effects built on the Web Audio API so the game ships
 * with no audio assets. Every sound is a short envelope over one or two
 * oscillators. The AudioContext is created lazily on the first play() call,
 * which must happen inside a user gesture on iOS.
 */

export type SoundId =
  | "tap" // UI tap / topping placed
  | "good" // points earned
  | "great" // perfect bake / combo
  | "bad" // wrong topping / obstacle
  | "whoosh" // pizza slides into the oven / lane change
  | "tick" // countdown 3-2-1
  | "go" // countdown Go!
  | "fanfare"; // results screen

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  from: number;
  to?: number;
  start?: number;
  duration: number;
  gain?: number;
}

function tone(ac: AudioContext, o: ToneOpts) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  const t0 = ac.currentTime + (o.start ?? 0);
  const t1 = t0 + o.duration;
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.from, t0);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, t1);
  const g = o.gain ?? 0.18;
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function noiseBurst(ac: AudioContext, duration: number, gain = 0.12) {
  const frames = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  const amp = ac.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(ac.destination);
  src.start();
}

const SOUNDS: Record<SoundId, (ac: AudioContext) => void> = {
  tap: (ac) => tone(ac, { type: "triangle", from: 520, to: 660, duration: 0.07, gain: 0.12 }),
  good: (ac) => {
    tone(ac, { from: 660, duration: 0.09 });
    tone(ac, { from: 990, duration: 0.14, start: 0.07 });
  },
  great: (ac) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, { from: f, duration: 0.14, start: i * 0.07, gain: 0.16 }));
  },
  bad: (ac) => {
    tone(ac, { type: "sawtooth", from: 220, to: 110, duration: 0.22, gain: 0.1 });
    noiseBurst(ac, 0.12, 0.06);
  },
  whoosh: (ac) => noiseBurst(ac, 0.28, 0.14),
  tick: (ac) => tone(ac, { type: "square", from: 880, duration: 0.06, gain: 0.07 }),
  go: (ac) => {
    tone(ac, { type: "square", from: 660, to: 1320, duration: 0.25, gain: 0.1 });
  },
  fanfare: (ac) => {
    const notes = [523, 523, 523, 659, 784, 659, 784];
    const starts = [0, 0.12, 0.24, 0.36, 0.55, 0.8, 0.95];
    notes.forEach((f, i) => tone(ac, { type: "triangle", from: f, duration: i === notes.length - 1 ? 0.5 : 0.16, start: starts[i], gain: 0.15 }));
  },
};

/** Play a synthesised sound. Silently no-ops without Web Audio support. */
export function playSound(id: SoundId): void {
  const ac = getContext();
  if (!ac) return;
  try {
    SOUNDS[id](ac);
  } catch {
    // Audio is best-effort; never let it break gameplay.
  }
}

/** Warm the context up inside a user gesture so later sounds are instant on iOS. */
export function unlockAudio(): void {
  getContext();
}
