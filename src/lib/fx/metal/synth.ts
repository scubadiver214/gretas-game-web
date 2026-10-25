/**
 * The band. Builds one Web Audio graph and plays a single sixteenth-note step
 * of the score on request. It takes a BaseAudioContext so the same code runs
 * live and in an OfflineAudioContext (handy for checking levels).
 *
 *   guitar L ─┐   (two double-tracked, hard-panned, distorted layers)
 *   guitar R ─┤
 *   bass ─────┼─▶ glue compressor ─▶ destination
 *   drums ────┤
 *   lead ─────┘   (lighter drive, plus a dotted-eighth echo)
 */

import { STEP_SECONDS, midiToHz, stepEvents } from "./score";

export interface MetalKit {
  /** Schedule everything that happens on `step`, starting at audio time `time`. */
  playStep(step: number, time: number): void;
  dispose(): void;
}

function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(n);
  const norm = Math.tanh(amount);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.tanh(x * amount) / norm;
  }
  return curve;
}

function noiseBuffer(ac: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * seconds), ac.sampleRate);
  const data = buffer.getChannelData(0);
  // Seeded so offline checks are repeatable.
  let seed = 0x2f6e2b1;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    data[i] = (seed / 0x80000000) * 0.9;
  }
  return buffer;
}

export function createMetalKit(ac: BaseAudioContext, destination: AudioNode): MetalKit {
  const nodes: AudioNode[] = [];
  const keep = <T extends AudioNode>(node: T): T => {
    nodes.push(node);
    return node;
  };

  // --- Master glue ----------------------------------------------------------
  const glue = keep(ac.createDynamicsCompressor());
  glue.threshold.value = -16;
  glue.knee.value = 10;
  glue.ratio.value = 4;
  glue.attack.value = 0.004;
  glue.release.value = 0.12;
  glue.connect(destination);

  // --- Guitars --------------------------------------------------------------
  const crunch = driveCurve(9);
  function guitarChain(pan: number): GainNode {
    const input = keep(ac.createGain());
    const hp = keep(ac.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = 90;
    const shaper = keep(ac.createWaveShaper());
    shaper.curve = crunch;
    shaper.oversample = "4x";
    const lp = keep(ac.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    lp.Q.value = 0.8;
    // Scoop a little mud out of the low mids.
    const scoop = keep(ac.createBiquadFilter());
    scoop.type = "peaking";
    scoop.frequency.value = 380;
    scoop.gain.value = -4;
    scoop.Q.value = 0.9;
    const panner = keep(ac.createStereoPanner());
    panner.pan.value = pan;
    const level = keep(ac.createGain());
    level.gain.value = 0.3;
    input.connect(hp).connect(shaper).connect(lp).connect(scoop).connect(panner).connect(level).connect(glue);
    return input;
  }
  const guitarL = guitarChain(-0.7);
  const guitarR = guitarChain(0.7);

  // --- Bass -----------------------------------------------------------------
  const bassBus = keep(ac.createGain());
  bassBus.gain.value = 0.42;
  const bassLp = keep(ac.createBiquadFilter());
  bassLp.type = "lowpass";
  bassLp.frequency.value = 520;
  bassBus.connect(bassLp).connect(glue);

  // --- Drums ----------------------------------------------------------------
  const drums = keep(ac.createGain());
  drums.gain.value = 0.8;
  drums.connect(glue);
  const noise = noiseBuffer(ac, 2);

  // --- Lead -----------------------------------------------------------------
  const leadIn = keep(ac.createGain());
  const leadShaper = keep(ac.createWaveShaper());
  leadShaper.curve = driveCurve(3.2);
  leadShaper.oversample = "2x";
  const leadLp = keep(ac.createBiquadFilter());
  leadLp.type = "lowpass";
  leadLp.frequency.value = 5200;
  const leadLevel = keep(ac.createGain());
  leadLevel.gain.value = 0.15;
  const echo = keep(ac.createDelay(1));
  echo.delayTime.value = STEP_SECONDS * 6; // dotted eighth
  const echoFeedback = keep(ac.createGain());
  echoFeedback.gain.value = 0.32;
  const echoWet = keep(ac.createGain());
  echoWet.gain.value = 0.3;
  leadIn.connect(leadShaper).connect(leadLp).connect(leadLevel);
  leadLevel.connect(glue);
  leadLevel.connect(echo);
  echo.connect(echoFeedback).connect(echo);
  echo.connect(echoWet).connect(glue);

  // One shared vibrato for every lead note.
  const vibrato = ac.createOscillator();
  vibrato.frequency.value = 5.4;
  const vibratoDepth = keep(ac.createGain());
  vibratoDepth.gain.value = 14; // cents
  vibrato.connect(vibratoDepth);
  vibrato.start();

  // --- Voices ---------------------------------------------------------------
  function guitarHit(notes: number[], time: number, steps: number, muted: boolean, accent: boolean): void {
    const level = accent ? 1 : 0.82;
    const length = steps * STEP_SECONDS;
    const layers: [GainNode, number][] = [
      [guitarL, -9],
      [guitarR, 9],
    ];
    for (const [bus, detune] of layers) {
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(level, time + 0.004);
      let end: number;
      if (muted) {
        // Palm mute: a short, dead thump.
        end = time + 0.085;
        env.gain.exponentialRampToValueAtTime(0.0001, end);
      } else {
        env.gain.exponentialRampToValueAtTime(level * 0.55, time + length);
        end = time + length + 0.05;
        env.gain.linearRampToValueAtTime(0.0001, end);
      }
      env.connect(bus);
      for (const note of notes) {
        const osc = ac.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = midiToHz(note);
        osc.detune.value = detune;
        osc.connect(env);
        osc.start(time);
        osc.stop(end + 0.02);
      }
    }
  }

  function bassHit(note: number, time: number, steps: number): void {
    const end = time + steps * STEP_SECONDS * 0.9;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(1, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, end + 0.04);
    env.connect(bassBus);
    const body = ac.createOscillator();
    body.type = "sawtooth";
    body.frequency.value = midiToHz(note);
    body.connect(env);
    const sub = ac.createOscillator();
    sub.type = "sine";
    sub.frequency.value = midiToHz(note - 12);
    const subLevel = ac.createGain();
    subLevel.gain.value = 0.7;
    sub.connect(subLevel).connect(env);
    body.start(time);
    sub.start(time);
    body.stop(end + 0.06);
    sub.stop(end + 0.06);
  }

  function kick(time: number): void {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(165, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.07);
    const env = ac.createGain();
    env.gain.setValueAtTime(1, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.13);
    osc.connect(env).connect(drums);
    osc.start(time);
    osc.stop(time + 0.15);
    // Beater click so the double kick stays clear under the guitars.
    const click = ac.createOscillator();
    click.type = "square";
    click.frequency.value = 2400;
    const clickEnv = ac.createGain();
    clickEnv.gain.setValueAtTime(0.16, time);
    clickEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);
    click.connect(clickEnv).connect(drums);
    click.start(time);
    click.stop(time + 0.02);
  }

  function noiseHit(time: number, filter: BiquadFilterType, freq: number, q: number, peak: number, decay: number): void {
    const src = ac.createBufferSource();
    src.buffer = noise;
    const f = ac.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const env = ac.createGain();
    env.gain.setValueAtTime(peak, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    src.connect(f).connect(env).connect(drums);
    src.start(time, (time * 7.31) % 1.5);
    src.stop(time + decay + 0.02);
  }

  function snare(time: number): void {
    noiseHit(time, "bandpass", 1900, 0.7, 0.85, 0.17);
    const body = ac.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(220, time);
    body.frequency.exponentialRampToValueAtTime(150, time + 0.08);
    const env = ac.createGain();
    env.gain.setValueAtTime(0.5, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
    body.connect(env).connect(drums);
    body.start(time);
    body.stop(time + 0.12);
  }

  function leadNote(note: number, time: number, steps: number): void {
    const length = steps * STEP_SECONDS;
    const end = time + length * 0.95;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(1, time + 0.012);
    env.gain.setValueAtTime(1, Math.max(time + 0.012, end - 0.05));
    env.gain.linearRampToValueAtTime(0.0001, end + 0.04);
    env.connect(leadIn);
    for (const detune of [-6, 6]) {
      const osc = ac.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = midiToHz(note);
      osc.detune.value = detune;
      vibratoDepth.connect(osc.detune);
      osc.connect(env);
      osc.start(time);
      osc.stop(end + 0.06);
    }
  }

  return {
    playStep(step, time) {
      const e = stepEvents(step);
      if (e.kick) kick(time);
      if (e.snare) snare(time);
      if (e.hat === "closed") noiseHit(time, "highpass", 7500, 0.5, 0.22, 0.035);
      if (e.hat === "open") noiseHit(time, "highpass", 6500, 0.5, 0.24, 0.2);
      if (e.crash) noiseHit(time, "highpass", 4200, 0.4, 0.4, 1.4);
      if (e.guitar) guitarHit(e.guitar.notes, time, e.guitar.steps, e.guitar.muted, e.guitar.accent);
      if (e.bass) bassHit(e.bass.note, time, e.bass.steps);
      if (e.lead) leadNote(e.lead.note, time, e.lead.steps);
    },
    dispose() {
      try {
        vibrato.stop();
      } catch {
        // Already stopped.
      }
      vibrato.disconnect();
      for (const node of nodes) node.disconnect();
    },
  };
}
