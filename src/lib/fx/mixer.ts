"use client";

/**
 * Shared Web Audio graph for the game.
 *
 *   sfx  ─┐
 *         ├─▶ master ─▶ destination
 *   music ┘
 *
 * The context is created lazily on the first call (must be inside a user
 * gesture on iOS). Volumes are smoothed so toggles never click. `duck()` dips
 * the music bus briefly so big sound effects cut through.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let musicDuck: GainNode | null = null;

export interface MixerLevels {
  master: number;
  sfx: number;
  music: number;
}

const levels: MixerLevels = { master: 1, sfx: 1, music: 0.6 };

function build(ac: AudioContext) {
  master = ac.createGain();
  master.gain.value = levels.master;

  // Soft limiter so stacked effects never clip.
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 12;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.12;

  sfx = ac.createGain();
  sfx.gain.value = levels.sfx;
  music = ac.createGain();
  music.gain.value = levels.music;
  musicDuck = ac.createGain();
  musicDuck.gain.value = 1;

  sfx.connect(master);
  music.connect(musicDuck).connect(master);
  master.connect(limiter).connect(ac.destination);
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    build(ctx);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** True once an AudioContext exists (i.e. the player has interacted). */
export function isAudioReady(): boolean {
  return ctx !== null && ctx.state === "running";
}

export function getSfxBus(): GainNode | null {
  return getAudioContext() ? sfx : null;
}

export function getMusicBus(): GainNode | null {
  return getAudioContext() ? music : null;
}

function ramp(node: GainNode | null, value: number, seconds = 0.08) {
  if (!node || !ctx) return;
  const t = ctx.currentTime;
  node.gain.cancelScheduledValues(t);
  node.gain.setValueAtTime(node.gain.value, t);
  node.gain.linearRampToValueAtTime(Math.max(0, value), t + seconds);
}

export function setLevels(next: Partial<MixerLevels>): void {
  Object.assign(levels, next);
  ramp(master, levels.master);
  ramp(sfx, levels.sfx);
  ramp(music, levels.music, 0.25);
}

export function getLevels(): MixerLevels {
  return { ...levels };
}

/** Dip the music for a moment so a big effect (fanfare, combo) stands out. */
export function duckMusic(amount = 0.35, holdSeconds = 0.25, releaseSeconds = 0.6): void {
  if (!musicDuck || !ctx) return;
  const t = ctx.currentTime;
  musicDuck.gain.cancelScheduledValues(t);
  musicDuck.gain.setValueAtTime(musicDuck.gain.value, t);
  musicDuck.gain.linearRampToValueAtTime(1 - amount, t + 0.03);
  musicDuck.gain.setValueAtTime(1 - amount, t + 0.03 + holdSeconds);
  musicDuck.gain.linearRampToValueAtTime(1, t + 0.03 + holdSeconds + releaseSeconds);
}
