"use client";

/**
 * Soundtrack. A shuffled playlist of the files in public/music streams
 * through an HTMLAudioElement into the music bus, so volume, mute, and ducking
 * still apply.
 *
 * Menus and the kitchen shift play music. Delivery, frogger, and wordle stay
 * silent during a round. Racing and hunting bring their own synthesised
 * scores. A new visit (after the music has been stopped) shuffles again and
 * avoids opening with the track that just played.
 */

import { isHuntPlaying, startHunt, stopHunt } from "./hunt/player";
import { isMetalPlaying, startMetal, stopMetal } from "./metal/player";
import { getAudioContext, getMusicBus } from "./mixer";
import { KITCHEN_BED, SHOP_TRACKS, shuffleShopTracks, type ShopTrack } from "./shopTracks";

/** Kitchen bed sits under SFX at about a third of menu loudness. */
const KITCHEN_BED_GAIN = 0.32;

/** "racing" and "hunting" are synthesized; the rest stream from public/music. */
export type MusicTrackId = "menu" | "kitchen" | "delivery" | "frogger" | "racing" | "hunting";

let audioEl: HTMLAudioElement | null = null;
let mediaNode: MediaElementAudioSourceNode | null = null;
/** Per-track loudness match. Independent of the fade envelope. */
let levelNode: GainNode | null = null;
let gainNode: GainNode | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;
let currentTrack: MusicTrackId | null = null;
let queue: ShopTrack[] = [];
let queueIndex = 0;
/** Last track that actually started, so the next shuffle does not open with it. */
let lastTrackId: string | null = null;

function ensureNodes(ac: AudioContext, bus: GainNode): void {
  if (audioEl && mediaNode && levelNode && gainNode) return;

  if (!audioEl) {
    audioEl = new Audio();
    audioEl.loop = false;
    audioEl.preload = "auto";
    audioEl.setAttribute("playsinline", "");
    audioEl.addEventListener("ended", onTrackEnded);
  }

  if (!mediaNode) {
    mediaNode = ac.createMediaElementSource(audioEl);
  }

  if (!levelNode) {
    levelNode = ac.createGain();
    levelNode.gain.value = 1;
  }

  if (!gainNode) {
    gainNode = ac.createGain();
    gainNode.gain.value = 0.0001;
    mediaNode.connect(levelNode);
    levelNode.connect(gainNode);
  }

  gainNode.connect(bus);
}

function gainFor(src: string): number {
  return SHOP_TRACKS.find((track) => src.endsWith(track.src))?.gain ?? 1;
}

/** Apply the track's loudness match. Smooth only when music is already audible. */
function setTrackLevel(src: string, smooth: boolean): void {
  const ac = getAudioContext();
  if (!levelNode || !ac) return;
  const gain = gainFor(src);
  const t = ac.currentTime;
  levelNode.gain.cancelScheduledValues(t);
  levelNode.gain.setValueAtTime(levelNode.gain.value, t);
  if (smooth) levelNode.gain.linearRampToValueAtTime(gain, t + 0.05);
  else levelNode.gain.setValueAtTime(gain, t);
}

function cancelFade(): void {
  if (fadeTimer) {
    clearTimeout(fadeTimer);
    fadeTimer = null;
  }
}

function ensureQueue(): ShopTrack {
  if (queue.length === 0 || queueIndex >= queue.length) {
    queue = shuffleShopTracks(Math.random, lastTrackId);
    queueIndex = 0;
  }
  return queue[queueIndex];
}

function playSrc(src: string, restart: boolean): void {
  if (!audioEl) return;
  setTrackLevel(src, currentTrack !== null && gainNode !== null && gainNode.gain.value > 0.05);
  const nextUrl = new URL(src, window.location.origin).href;
  if (audioEl.src !== nextUrl) {
    audioEl.src = nextUrl;
    audioEl.currentTime = 0;
  } else if (restart) {
    audioEl.currentTime = 0;
  }
  void audioEl.play().catch(() => {
    // Autoplay blocked until the next pointer; MusicDirector retries.
  });
}

function onTrackEnded(): void {
  if (!currentTrack || !audioEl) return;
  if (currentTrack === "kitchen") {
    playSrc(KITCHEN_BED.src, true);
    return;
  }
  queueIndex += 1;
  const track = ensureQueue();
  lastTrackId = track.id;
  playSrc(track.src, true);
}

function fadeIn(ac: AudioContext, target = 1): void {
  if (!gainNode) return;
  const t = ac.currentTime;
  gainNode.gain.cancelScheduledValues(t);
  gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), t);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), t + 0.8);
}

function parkPlaylist(ac: AudioContext): void {
  if (!audioEl || !gainNode) return;
  const t = ac.currentTime;
  gainNode.gain.cancelScheduledValues(t);
  gainNode.gain.setValueAtTime(Math.max(0.0001, gainNode.gain.value), t);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  const parked = audioEl;
  fadeTimer = setTimeout(() => parked.pause(), 350);
}

function synthAlready(id: MusicTrackId): boolean {
  if (currentTrack !== id) return false;
  if (id === "racing") return isMetalPlaying();
  if (id === "hunting") return isHuntPlaying();
  return !!audioEl && !audioEl.paused;
}

/** Start a track, or keep playing if that same track is already going. */
export function startMusic(id: MusicTrackId): void {
  if (synthAlready(id)) return;

  const ac = getAudioContext();
  const bus = getMusicBus();
  if (!ac || !bus) return;

  cancelFade();

  if (id === "racing" || id === "hunting") {
    // The score replaces the playlist: park the file stream and bring the amps up.
    parkPlaylist(ac);
    if (id !== "racing" && isMetalPlaying()) stopMetal(0.3);
    if (id !== "hunting" && isHuntPlaying()) stopHunt(0.3);
    currentTrack = id;
    if (ac.state === "suspended") void ac.resume();
    if (id === "racing") startMetal(ac, bus);
    else startHunt(ac, bus);
    return;
  }

  if (isMetalPlaying()) stopMetal(0.3);
  if (isHuntPlaying()) stopHunt(0.3);
  ensureNodes(ac, bus);
  currentTrack = id;

  if (ac.state === "suspended") void ac.resume();

  if (id === "kitchen") {
    audioEl!.loop = true;
    const resume = audioEl!.src.endsWith(KITCHEN_BED.src) && audioEl!.currentTime > 0;
    playSrc(KITCHEN_BED.src, !resume);
    fadeIn(ac, KITCHEN_BED_GAIN);
    return;
  }

  audioEl!.loop = false;
  const track = ensureQueue();
  lastTrackId = track.id;
  // Resume mid-song after a tab hide; a fresh queue starts at the beginning.
  const resume = audioEl!.src.endsWith(track.src) && audioEl!.currentTime > 0;
  playSrc(track.src, !resume);
  fadeIn(ac);
}

/** Stop the playlist. The next start shuffles again unless `keepQueue` is set. */
export function stopMusic(fadeSeconds = 0.5, keepQueue = false): void {
  if (currentTrack === "racing") {
    currentTrack = null;
    stopMetal(fadeSeconds);
    return;
  }
  if (currentTrack === "hunting") {
    currentTrack = null;
    stopHunt(fadeSeconds);
    return;
  }
  if (!audioEl || !gainNode || !currentTrack) {
    if (!keepQueue) {
      queue = [];
      queueIndex = 0;
    }
    return;
  }

  const ac = getAudioContext();
  currentTrack = null;
  if (!keepQueue) {
    queue = [];
    queueIndex = 0;
  }

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

/** Kept so older call sites compile. Recorded tracks do not change with intensity. */
export function setMusicIntensity(value: number): void {
  void value;
}

export function currentMusic(): MusicTrackId | null {
  return currentTrack;
}

if (typeof document !== "undefined") {
  let pausedTrack: MusicTrackId | null = null;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pausedTrack = currentTrack;
      stopMusic(0.1, true);
    } else if (pausedTrack) {
      const resume = pausedTrack;
      pausedTrack = null;
      startMusic(resume);
    }
  });
}
