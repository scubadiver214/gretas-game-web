"use client";

/**
 * Plays the metal score live. A short timer looks ~150 ms ahead and hands each
 * sixteenth-note step to the synth with a sample-accurate start time, so the
 * groove stays tight even when the main thread is busy rendering the race.
 */

import { LOOP_STEPS, STEP_SECONDS } from "./score";
import { createMetalKit, type MetalKit } from "./synth";

const LOOKAHEAD_SECONDS = 0.15;
const TICK_MS = 30;
/**
 * Level of the whole band before the shared music bus. Rendered offline, the
 * loop sits at about -21.5 dB RMS, which is where the loudness-matched shop
 * tracks land, so the music slider feels the same across the game.
 */
const BAND_LEVEL = 0.38;

let kit: MetalKit | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let disposeTimer: ReturnType<typeof setTimeout> | null = null;
let ctx: AudioContext | null = null;
let step = 0;
let nextTime = 0;
let playing = false;

function tick(): void {
  if (!ctx || !kit) return;
  // Fell behind (tab was busy or the context was suspended): resync, don't burst.
  if (nextTime < ctx.currentTime - 0.05) nextTime = ctx.currentTime + 0.03;
  while (nextTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
    kit.playStep(step, nextTime);
    step = (step + 1) % LOOP_STEPS;
    nextTime += STEP_SECONDS;
  }
}

function teardown(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if (disposeTimer) clearTimeout(disposeTimer);
  disposeTimer = null;
  kit?.dispose();
  master?.disconnect();
  kit = null;
  master = null;
}

export function isMetalPlaying(): boolean {
  return playing;
}

/** Start the band from the top of the loop and fade it in. */
export function startMetal(ac: AudioContext, bus: AudioNode, fadeSeconds = 0.8): void {
  if (playing) return;
  teardown();
  ctx = ac;
  master = ac.createGain();
  master.gain.setValueAtTime(0.0001, ac.currentTime);
  master.gain.exponentialRampToValueAtTime(BAND_LEVEL, ac.currentTime + fadeSeconds);
  master.connect(bus);
  kit = createMetalKit(ac, master);
  step = 0;
  nextTime = ac.currentTime + 0.12;
  playing = true;
  tick();
  timer = setInterval(tick, TICK_MS);
}

/** Fade out, then free the audio nodes. */
export function stopMetal(fadeSeconds = 0.5): void {
  if (!playing || !ctx || !master) return;
  playing = false;
  if (timer) clearInterval(timer);
  timer = null;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
  master.gain.exponentialRampToValueAtTime(0.0001, t + fadeSeconds);
  disposeTimer = setTimeout(teardown, (fadeSeconds + 0.4) * 1000);
}
