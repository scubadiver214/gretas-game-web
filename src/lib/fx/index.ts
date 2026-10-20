"use client";

import type confettiFn from "canvas-confetti";
import { useSettingsStore } from "@/features/settings/store";
import { playSound, unlockAudio, type SoundId } from "./audio";
import { vibrate, type HapticId } from "./haptics";
import { duckMusic, setLevels } from "./mixer";
import { currentMusic, setMusicIntensity, startMusic, stopMusic, type MusicTrackId } from "./music";

export { useJuice, isFrozen, shakeOffset, type Popup, type PopupTone } from "./juice";
export type { SoundId } from "./audio";
export type { MusicTrackId } from "./music";

function fire(sound: SoundId, haptic?: HapticId, duck = 0) {
  const { soundOn, hapticsOn } = useSettingsStore.getState();
  if (soundOn) {
    playSound(sound);
    if (duck > 0) duckMusic(duck);
  }
  if (hapticsOn && haptic) vibrate(haptic);
}

/** Game feedback: one call per gameplay event, respects the player's settings. */
export const fx = {
  tap: () => fire("tap", "light"),
  pop: () => fire("pop", "light"),
  good: () => fire("good", "light"),
  great: () => fire("great", "success", 0.3),
  bad: () => fire("bad", "error"),
  whoosh: () => fire("whoosh"),
  sizzle: () => fire("sizzle"),
  ding: () => fire("ding", "light"),
  tick: () => fire("tick"),
  go: () => fire("go", "heavy"),
  bell: () => fire("bell", "light"),
  jump: () => fire("jump", "light"),
  land: () => fire("land"),
  splash: () => fire("splash", "error"),
  crash: () => fire("crash", "error", 0.2),
  combo: () => fire("combo", "success", 0.35),
  powerup: () => fire("powerup", "success", 0.3),
  shield: () => fire("shield", "heavy"),
  hurry: () => fire("hurry"),
  fanfare: () => fire("fanfare", "success", 0.5),
  best: () => fire("best", "success", 0.5),
  levelup: () => fire("levelup", "success", 0.5),
  /** Achievement / cosmetic unlocked. */
  unlocked: () => fire("unlock", "success", 0.3),
  hop: () => fire("hop"),
  home: () => fire("home", "success", 0.25),
  levelClear: () => fire("levelclear", "success", 0.5),
  gameOver: () => fire("gameover", "heavy", 0.5),
  /** Call from a user gesture (e.g. the Start button) so iOS allows audio. */
  unlock: () => unlockAudio(),
};

/** Background music control; respects the music toggle. */

// Tracks the last track a screen *wanted* to play, even if sound was off at
// the time. The settings-store subscriber uses this to resume when the player
// turns sound back on mid-session.
let lastWanted: MusicTrackId | null = null;

export const music = {
  play: (track: MusicTrackId) => {
    lastWanted = track; // remember even when currently muted
    const { soundOn, musicOn } = useSettingsStore.getState();
    if (!soundOn || !musicOn) return;
    startMusic(track);
  },
  stop: (fade = 0.5) => {
    lastWanted = null;
    stopMusic(fade);
  },
  /** 0..1 – no-op for recorded audio, kept for call-site compatibility. */
  intensity: (v: number) => setMusicIntensity(v),
  current: () => currentMusic(),
};

// Keep the mixer in sync with the settings store. Music is stopped when the
// player turns it (or all sound) off, and resumes automatically when they
// turn it back on as long as a screen has called music.play() recently.
useSettingsStore.subscribe((s) => {
  setLevels({ master: s.soundOn ? 1 : 0, sfx: s.sfxVolume, music: s.musicOn ? s.musicVolume : 0 });
  const playing = currentMusic();
  if ((!s.soundOn || !s.musicOn) && playing) {
    stopMusic(0.3);
  } else if (s.soundOn && s.musicOn && !playing && lastWanted) {
    startMusic(lastWanted);
  }
});

let confettiPromise: Promise<typeof confettiFn> | null = null;

/** Fire a celebratory confetti burst; bigger when `big` is set (new personal best). */
export async function celebrate(big = false): Promise<void> {
  if (typeof window === "undefined") return;
  confettiPromise ??= import("canvas-confetti").then((m) => m.default);
  const confetti = await confettiPromise;
  const colors = ["#F2542D", "#FDE68A", "#3FA34D", "#0E9594", "#E85D9A", "#3B82F6"];
  confetti({ particleCount: big ? 160 : 90, spread: 75, origin: { y: 0.6 }, colors, disableForReducedMotion: true });
  if (big) {
    setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }), 400);
  }
}
