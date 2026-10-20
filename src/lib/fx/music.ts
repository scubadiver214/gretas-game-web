"use client";

/**
 * Background music powered by a real MP3 recording.
 *
 * The file is streamed through an HTMLAudioElement whose output is routed into
 * the Web Audio graph via a MediaElementAudioSourceNode, so it rides the same
 * music bus as the old procedural sequencer. Volume, muting and ducking all
 * continue to work exactly as before.
 *
 * All track ids currently play the same recording. The soundtrack is only used
 * on hub screens (character select, adventure, scores); games stay silent.
 *
 * setMusicIntensity() is kept as a no-op so the call sites throughout the game
 * don't need to change.
 */

import { getAudioContext, getMusicBus } from "./mixer";

export type MusicTrackId = "menu" | "kitchen" | "delivery" | "frogger";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let audioEl: HTMLAudioElement | null = null;
let mediaNode: MediaElementAudioSourceNode | null = null;
let gainNode: GainNode | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let currentTrack: MusicTrackId | null = null;

const MUSIC_SRC = "/music-bg.mp3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lazily create (or reuse) the HTMLAudioElement and Web Audio nodes. */
function ensureNodes(ac: AudioContext, bus: GainNode): void {
  if (audioEl && mediaNode && gainNode) return;

  // We can only create one MediaElementAudioSourceNode per element; reuse.
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.src = MUSIC_SRC;
    audioEl.loop = true;
    audioEl.preload = "auto";
    // Keep media session out of the lock screen on mobile (optional).
    audioEl.setAttribute("playsinline", "");
  }

  if (!mediaNode) {
    mediaNode = ac.createMediaElementSource(audioEl);
  }

  if (!gainNode) {
    gainNode = ac.createGain();
    gainNode.gain.value = 0.0001; // start silent; fade-in in start()
    mediaNode.connect(gainNode);
  }

  gainNode.connect(bus);
}

function cancelFade(): void {
  if (fadeTimer) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Public API  (same signatures as the old procedural sequencer)
// ---------------------------------------------------------------------------

/** Start (or switch to) a track. Fades in from silence. */
export function startMusic(id: MusicTrackId): void {
  if (currentTrack === id && audioEl && !audioEl.paused) return;

  const ac = getAudioContext();
  const bus = getMusicBus();
  if (!ac || !bus) return;

  ensureNodes(ac, bus);

  cancelFade();
  currentTrack = id;

  // Resume the AudioContext – required before any sound plays on mobile.
  if (ac.state === "suspended") void ac.resume();

  // Re-seek to the start when switching tracks so the loop restarts cleanly.
  if (audioEl!.paused || currentTrack !== id) {
    audioEl!.currentTime = 0;
  }

  void audioEl!.play().catch(() => {
    // Autoplay blocked; will retry once the user interacts (unlockAudio calls
    // getAudioContext which resumes the context, and the media element will
    // then be allowed to play too).
  });

  // Fade in over 0.8 s.
  const t = ac.currentTime;
  gainNode!.gain.cancelScheduledValues(t);
  gainNode!.gain.setValueAtTime(gainNode!.gain.value, t);
  gainNode!.gain.exponentialRampToValueAtTime(1, t + 0.8);
}

/** Stop the current track with a short fade-out. */
export function stopMusic(fadeSeconds = 0.5): void {
  if (!audioEl || !gainNode || !currentTrack) return;

  const ac = getAudioContext();
  currentTrack = null;

  if (ac && gainNode) {
    const t = ac.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), t);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + fadeSeconds);
  }

  cancelFade();
  fadeTimer = setTimeout(
    () => {
      audioEl?.pause();
    },
    (fadeSeconds + 0.05) * 1000,
  );
}

/**
 * 0..1 intensity – kept as a no-op so existing call sites compile without
 * change. Could be used to adjust playback rate in the future.
 */
export function setMusicIntensity(value: number): void {
  // no-op for recorded audio – intensity was used to speed up the old
  // procedural sequencer; with a real MP3 there's nothing to drive.
  void value;
}

export function currentMusic(): MusicTrackId | null {
  return currentTrack;
}

// ---------------------------------------------------------------------------
// Pause the audio when the tab is hidden so the browser doesn't complain.
// ---------------------------------------------------------------------------
if (typeof document !== "undefined") {
  let pausedTrack: MusicTrackId | null = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pausedTrack = currentTrack;
      stopMusic(0.1);
    } else if (pausedTrack) {
      startMusic(pausedTrack);
      pausedTrack = null;
    }
  });
}
