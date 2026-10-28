"use client";

import { getAudioContext, getSfxBus } from "@/lib/fx/mixer";
import type { ExplosionKind } from "./types";

/**
 * The racing booms. Built here, not in the shared sound bank, so each blast can
 * carry its own loudness (a mine up the road is quieter than the one under you)
 * and so the three strengths can stay different: a slide, a bomb, a gun.
 */

interface BoomSpec {
  /** Sharp crack at the front. */
  crackGain: number;
  crackDur: number;
  /** The body of the blast: filtered noise. */
  noiseGain: number;
  noiseDur: number;
  noiseFrom: number;
  noiseTo: number;
  /** Low sine that makes it a boom rather than a pop. */
  rumbleGain: number;
  rumbleDur: number;
  rumbleFrom: number;
  rumbleTo: number;
  /** Even lower tail. 0 skips it. */
  subGain: number;
  subDur: number;
  /** A quieter copy a moment later, so the boom has a little room. */
  echoGain: number;
  echoAt: number;
  /** Chance of a short metallic tick in the debris. */
  debrisChance: number;
}

const SPECS: Record<ExplosionKind, BoomSpec> = {
  oil: {
    crackGain: 0.1,
    crackDur: 0.05,
    noiseGain: 0.2,
    noiseDur: 0.34,
    noiseFrom: 900,
    noiseTo: 150,
    rumbleGain: 0.2,
    rumbleDur: 0.42,
    rumbleFrom: 96,
    rumbleTo: 40,
    subGain: 0.1,
    subDur: 0.36,
    echoGain: 0.07,
    echoAt: 0.07,
    debrisChance: 0.35,
  },
  collision: {
    crackGain: 0.16,
    crackDur: 0.06,
    noiseGain: 0.22,
    noiseDur: 0.36,
    noiseFrom: 1100,
    noiseTo: 140,
    rumbleGain: 0.22,
    rumbleDur: 0.4,
    rumbleFrom: 110,
    rumbleTo: 38,
    subGain: 0.12,
    subDur: 0.38,
    echoGain: 0.08,
    echoAt: 0.06,
    debrisChance: 0.75,
  },
  mine: {
    crackGain: 0.24,
    crackDur: 0.06,
    noiseGain: 0.3,
    noiseDur: 0.52,
    noiseFrom: 1500,
    noiseTo: 100,
    rumbleGain: 0.32,
    rumbleDur: 0.58,
    rumbleFrom: 170,
    rumbleTo: 32,
    subGain: 0.2,
    subDur: 0.62,
    echoGain: 0.11,
    echoAt: 0.09,
    debrisChance: 0.5,
  },
  gun: {
    crackGain: 0.3,
    crackDur: 0.07,
    noiseGain: 0.34,
    noiseDur: 0.74,
    noiseFrom: 1800,
    noiseTo: 80,
    rumbleGain: 0.36,
    rumbleDur: 0.86,
    rumbleFrom: 190,
    rumbleTo: 26,
    subGain: 0.26,
    subDur: 0.95,
    echoGain: 0.13,
    echoAt: 0.11,
    debrisChance: 0.6,
  },
};

let noiseBuffer: AudioBuffer | null = null;
let lastBoom = 0;

function noise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const frames = ac.sampleRate;
  noiseBuffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function tone(ac: AudioContext, out: AudioNode, pitch: number, from: number, to: number, start: number, duration: number, gain: number, type: OscillatorType = "sine") {
  const t0 = ac.currentTime + start;
  const t1 = t0 + duration;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, from * pitch), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * pitch), t1);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(amp).connect(out);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function burst(ac: AudioContext, out: AudioNode, pitch: number, start: number, duration: number, gain: number, from: number, to: number, type: BiquadFilterType) {
  const t0 = ac.currentTime + start;
  const t1 = t0 + duration;
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(Math.max(40, from * pitch), t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, to * pitch), t1);
  const amp = ac.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t1);
  src.connect(filter).connect(amp).connect(out);
  src.start(t0);
  src.stop(t1 + 0.02);
}

/** One boom at `volume` (0..1). A second blast in the same instant is quieter, so they don't pile into a wall of noise. */
export function playRacingBoom(kind: ExplosionKind, volume: number): void {
  const ac = getAudioContext();
  const bus = getSfxBus();
  if (!ac || !bus || volume < 0.02) return;
  const now = ac.currentTime;
  const stacked = now - lastBoom < 0.12;
  lastBoom = now;
  const level = volume * (stacked ? 0.45 : 1);
  try {
    const pitch = 0.93 + Math.random() * 0.14;
    const spec = SPECS[kind];
    const out = ac.createGain();
    out.gain.value = level;
    out.connect(bus);
    burst(ac, out, pitch, 0, spec.crackDur, spec.crackGain, 2800, 900, "highpass");
    burst(ac, out, pitch, 0, spec.noiseDur, spec.noiseGain, spec.noiseFrom, spec.noiseTo, "lowpass");
    tone(ac, out, pitch, spec.rumbleFrom, spec.rumbleTo, 0, spec.rumbleDur, spec.rumbleGain, "sine");
    if (spec.subGain > 0) tone(ac, out, pitch, spec.rumbleFrom * 0.45, Math.max(22, spec.rumbleTo * 0.7), 0.01, spec.subDur, spec.subGain, "sine");
    tone(ac, out, pitch * 0.97, spec.rumbleFrom * 0.8, spec.rumbleTo, spec.echoAt, spec.rumbleDur * 0.7, spec.echoGain, "sine");
    burst(ac, out, pitch, spec.echoAt, spec.noiseDur * 0.55, spec.echoGain, spec.noiseFrom * 0.7, spec.noiseTo, "lowpass");
    if (Math.random() < spec.debrisChance) {
      const tick = 900 + Math.random() * 1600;
      tone(ac, out, pitch, tick, tick * 0.55, 0.02 + Math.random() * 0.05, 0.09, 0.05, "triangle");
      tone(ac, out, pitch, tick * 1.4, tick * 0.4, 0.06 + Math.random() * 0.06, 0.07, 0.03, "square");
    }
  } catch {
    // Audio is best-effort; a missing boom must not stop the race.
  }
}
