"use client";

import { useSettingsStore } from "@/features/settings/store";
import { duckMusic, getAudioContext, getSfxBus } from "@/lib/fx/mixer";

/**
 * Hunting sounds, all synthesised (no audio files): shotgun blast with a lake
 * echo, pump and shell clicks, quacks, wing flutter, splashes, the camera
 * shutter, friendly chimes, and a looping lake ambience. Routed through the
 * shared SFX bus so the global sound and volume settings apply.
 */

interface Out {
  ac: AudioContext;
  out: AudioNode;
}

function out(): Out | null {
  if (!useSettingsStore.getState().soundOn) return null;
  const ac = getAudioContext();
  const bus = getSfxBus();
  return ac && bus ? { ac, out: bus } : null;
}

let noiseBuffer: AudioBuffer | null = null;
function noise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

let echoIn: GainNode | null = null;
let echoCtx: AudioContext | null = null;
/** A soft slap-back off the far shore. */
function echo(o: Out): AudioNode {
  if (echoIn && echoCtx === o.ac) return echoIn;
  const input = o.ac.createGain();
  const delay = o.ac.createDelay(1);
  delay.delayTime.value = 0.34;
  const fb = o.ac.createGain();
  fb.gain.value = 0.3;
  const lp = o.ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  const wet = o.ac.createGain();
  wet.gain.value = 0.45;
  input.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(wet).connect(o.out);
  echoIn = input;
  echoCtx = o.ac;
  return input;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function burst(o: Out, opts: { at?: number; dur: number; type: BiquadFilterType; freq: number; freqTo?: number; q?: number; gain: number; attack?: number; dest?: AudioNode; pan?: number }) {
  const t = o.ac.currentTime + (opts.at ?? 0);
  const src = o.ac.createBufferSource();
  src.buffer = noise(o.ac);
  const f = o.ac.createBiquadFilter();
  f.type = opts.type;
  f.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t + opts.dur);
  f.Q.value = opts.q ?? 0.8;
  const g = o.ac.createGain();
  env(g, t, opts.gain, opts.attack ?? 0.003, opts.dur);
  let node: AudioNode = src.connect(f).connect(g);
  if (opts.pan !== undefined && o.ac.createStereoPanner) {
    const p = o.ac.createStereoPanner();
    p.pan.value = opts.pan;
    node = node.connect(p);
  }
  node.connect(opts.dest ?? o.out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + opts.dur + 0.1);
  return g;
}

function tone(o: Out, opts: { at?: number; dur: number; type: OscillatorType; freq: number; freqTo?: number; gain: number; attack?: number; dest?: AudioNode; pan?: number }) {
  const t = o.ac.currentTime + (opts.at ?? 0);
  const osc = o.ac.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.freqTo) osc.frequency.exponentialRampToValueAtTime(opts.freqTo, t + opts.dur);
  const g = o.ac.createGain();
  env(g, t, opts.gain, opts.attack ?? 0.005, opts.dur);
  let node: AudioNode = osc.connect(g);
  if (opts.pan !== undefined && o.ac.createStereoPanner) {
    const p = o.ac.createStereoPanner();
    p.pan.value = opts.pan;
    node = node.connect(p);
  }
  node.connect(opts.dest ?? o.out);
  osc.start(t);
  osc.stop(t + opts.dur + 0.1);
}

const NOTES = [1046.5, 1318.5, 1568, 2093, 2637];

export const huntSfx = {
  shotgun() {
    const o = out();
    if (!o) return;
    const e = echo(o);
    const body = burst(o, { dur: 0.42, type: "lowpass", freq: 5200, freqTo: 380, q: 0.6, gain: 0.95, attack: 0.002 });
    body.connect(e);
    burst(o, { dur: 0.05, type: "highpass", freq: 3000, gain: 0.5, attack: 0.001 });
    tone(o, { dur: 0.2, type: "sine", freq: 120, freqTo: 42, gain: 0.9, attack: 0.002 });
  },
  pump() {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.035, type: "bandpass", freq: 2400, q: 3, gain: 0.45 });
    tone(o, { dur: 0.025, type: "square", freq: 900, gain: 0.05 });
    burst(o, { at: 0.12, dur: 0.04, type: "bandpass", freq: 1700, q: 3, gain: 0.5 });
    tone(o, { at: 0.12, dur: 0.03, type: "square", freq: 620, gain: 0.06 });
  },
  shellIn() {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.06, type: "lowpass", freq: 1800, gain: 0.18 });
    burst(o, { at: 0.05, dur: 0.025, type: "bandpass", freq: 3200, q: 4, gain: 0.4 });
  },
  dryFire() {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.02, type: "bandpass", freq: 2200, q: 5, gain: 0.35 });
  },
  /** Shoulder the gun, or lower it. A short slide, quiet enough to repeat. */
  aim(on: boolean) {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.06, type: "bandpass", freq: on ? 1500 : 900, q: 1.6, gain: 0.16, attack: 0.006 });
    tone(o, { dur: 0.08, type: "sine", freq: on ? 480 : 360, freqTo: on ? 720 : 240, gain: 0.045 });
  },
  /** The spent shell leaving the port. */
  eject() {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.018, type: "highpass", freq: 3800, gain: 0.2, attack: 0.001 });
    tone(o, { at: 0.012, dur: 0.025, type: "square", freq: 1600, gain: 0.028 });
  },
  rustle() {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.16, type: "bandpass", freq: 1300, q: 0.7, gain: 0.12, attack: 0.03 });
  },
  hit(streak: number) {
    const o = out();
    if (!o) return;
    const lift = Math.min(4, Math.floor((streak - 1) / 2));
    [0, 1, 2].forEach((i) => tone(o, { at: i * 0.055, dur: 0.22, type: "triangle", freq: NOTES[Math.min(NOTES.length - 1, i + lift)] * (lift > 2 ? 1.06 : 1), gain: 0.22 }));
    burst(o, { dur: 0.25, type: "highpass", freq: 7000, gain: 0.12, attack: 0.01 });
    tone(o, { dur: 0.07, type: "sine", freq: 520, freqTo: 1040, gain: 0.25 });
  },
  multi() {
    const o = out();
    if (!o) return;
    NOTES.forEach((f, i) => tone(o, { at: 0.12 + i * 0.06, dur: 0.3, type: "triangle", freq: f, gain: 0.2 }));
    tone(o, { at: 0.12, dur: 0.9, type: "sine", freq: 2093, gain: 0.12 });
  },
  quack(pan: number, volume: number) {
    const o = out();
    if (!o || volume <= 0.02) return;
    const times = 2 + Math.floor(Math.random() * 2);
    const base = 360 + Math.random() * 80;
    for (let i = 0; i < times; i++) {
      const at = i * (0.19 + Math.random() * 0.04);
      const t = o.ac.currentTime + at;
      const osc = o.ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(base * 1.15, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.82, t + 0.13);
      const f1 = o.ac.createBiquadFilter();
      f1.type = "bandpass";
      f1.frequency.value = 1150;
      f1.Q.value = 2.2;
      const f2 = o.ac.createBiquadFilter();
      f2.type = "bandpass";
      f2.frequency.value = 2500;
      f2.Q.value = 3.5;
      const g = o.ac.createGain();
      env(g, t, 0.55 * volume, 0.015, 0.13);
      const p = o.ac.createStereoPanner();
      p.pan.value = pan;
      osc.connect(f1).connect(g);
      osc.connect(f2).connect(g);
      g.connect(p).connect(o.out);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  },
  flutter(pan: number, volume: number) {
    const o = out();
    if (!o) return;
    const t = o.ac.currentTime;
    const src = o.ac.createBufferSource();
    src.buffer = noise(o.ac);
    const f = o.ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 850;
    f.Q.value = 0.9;
    const am = o.ac.createGain();
    am.gain.value = 0;
    const lfo = o.ac.createOscillator();
    lfo.type = "square";
    lfo.frequency.setValueAtTime(15, t);
    lfo.frequency.linearRampToValueAtTime(10, t + 1);
    const depth = o.ac.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(am.gain);
    const g = o.ac.createGain();
    env(g, t, 0.5 * volume, 0.02, 1.1);
    const p = o.ac.createStereoPanner();
    p.pan.value = pan;
    src.connect(f).connect(am).connect(g).connect(p).connect(o.out);
    src.start(t);
    lfo.start(t);
    src.stop(t + 1.2);
    lfo.stop(t + 1.2);
  },
  splash(big: boolean, pan = 0, volume = 1) {
    const o = out();
    if (!o) return;
    burst(o, { dur: big ? 0.45 : 0.25, type: "lowpass", freq: big ? 2200 : 1600, freqTo: 400, gain: (big ? 0.4 : 0.22) * volume, attack: 0.01, pan });
    tone(o, { at: 0.03, dur: 0.06, type: "sine", freq: 700, freqTo: 1300, gain: 0.06 * volume, pan });
  },
  shutter() {
    const o = out();
    if (!o) return;
    burst(o, { dur: 0.018, type: "highpass", freq: 2600, gain: 0.5, attack: 0.001 });
    tone(o, { at: 0.02, dur: 0.1, type: "sawtooth", freq: 180, freqTo: 120, gain: 0.04 });
    burst(o, { at: 0.09, dur: 0.02, type: "highpass", freq: 3200, gain: 0.4, attack: 0.001 });
  },
  zoom() {
    const o = out();
    if (!o) return;
    tone(o, { dur: 0.05, type: "sine", freq: 1500, gain: 0.08 });
    burst(o, { dur: 0.08, type: "bandpass", freq: 600, q: 2, gain: 0.05, attack: 0.02 });
  },
  gentleWarn() {
    const o = out();
    if (!o) return;
    tone(o, { dur: 0.16, type: "sine", freq: 660, gain: 0.18 });
    tone(o, { at: 0.16, dur: 0.22, type: "sine", freq: 494, gain: 0.18 });
  },
  discovery() {
    const o = out();
    if (!o) return;
    duckMusic(0.5, 0.35, 0.8);
    [523.3, 659.3, 784, 987.8, 1174.7, 1568].forEach((f, i) => {
      tone(o, { at: i * 0.08, dur: 0.45, type: "sine", freq: f, gain: 0.16 });
      tone(o, { at: i * 0.08, dur: 0.3, type: "triangle", freq: f * 2, gain: 0.05 });
    });
  },
};

/**
 * Lake ambience: wind, lapping water, birdsong and the odd far-off quack.
 * Started from a user gesture; volume follows `setLevel`.
 */
export class LakeAmbience {
  private gain: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private level = 0.7;
  private nextBird = 0;
  private nextLap = 0;
  private nextQuack = 0;

  start(): void {
    if (this.gain) return;
    const o = out();
    if (!o) return;
    const g = o.ac.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(this.level, o.ac.currentTime + 1.5);
    g.connect(o.out);
    this.gain = g;

    const wind = o.ac.createBufferSource();
    wind.buffer = noise(o.ac);
    wind.loop = true;
    const lp = o.ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const wg = o.ac.createGain();
    wg.gain.value = 0.06;
    const lfo = o.ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoDepth = o.ac.createGain();
    lfoDepth.gain.value = 0.035;
    lfo.connect(lfoDepth).connect(wg.gain);
    wind.connect(lp).connect(wg).connect(g);
    wind.start();
    lfo.start();
    this.nodes.push(wind, lfo);

    const now = performance.now();
    this.nextBird = now + 800;
    this.nextLap = now + 300;
    this.nextQuack = now + 6000;
    this.timer = setInterval(() => this.tick(), 120);
  }

  private tick(): void {
    const o = out();
    if (!o || !this.gain) return;
    const now = performance.now();
    if (now >= this.nextLap) {
      this.nextLap = now + 1300 + Math.random() * 2200;
      burst(o, { dur: 0.7 + Math.random() * 0.5, type: "bandpass", freq: 300 + Math.random() * 200, q: 0.6, gain: 0.07, attack: 0.25, dest: this.gain });
    }
    if (now >= this.nextBird) {
      this.nextBird = now + 1800 + Math.random() * 4500;
      const pan = Math.random() * 1.6 - 0.8;
      const base = 2600 + Math.random() * 2200;
      const notes = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++) {
        tone(o, { at: i * (0.09 + Math.random() * 0.05), dur: 0.07, type: "sine", freq: base * (1 + Math.random() * 0.25), freqTo: base * (0.75 + Math.random() * 0.6), gain: 0.05, pan, dest: this.gain });
      }
    }
    if (now >= this.nextQuack) {
      this.nextQuack = now + 12000 + Math.random() * 14000;
      huntSfx.quack(Math.random() * 1.4 - 0.7, 0.12);
    }
  }

  setLevel(v: number): void {
    this.level = v;
    const ac = this.gain?.context;
    if (this.gain && ac) {
      this.gain.gain.cancelScheduledValues(ac.currentTime);
      this.gain.gain.setValueAtTime(this.gain.gain.value, ac.currentTime);
      this.gain.gain.linearRampToValueAtTime(v, ac.currentTime + 0.6);
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {
        // already stopped
      }
    }
    this.nodes = [];
    this.gain?.disconnect();
    this.gain = null;
  }
}
