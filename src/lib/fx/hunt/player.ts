/**
 * Lakeside underscore: a slow A-minor bed for Wild Adventure Hunting.
 * Warm pad, a soft distant pulse, and sparse pentatonic bells. Calm enough
 * for younger players, with a little suspense while you wait on the ducks.
 * Scheduled ahead like the racing band so a busy frame does not wobble the tempo.
 */

const BPM = 56;
const EIGHTH = 60 / BPM / 2;
/** Eight bars of 4/4, in eighth notes. */
const LOOP_STEPS = 64;
const LOOKAHEAD_SECONDS = 0.2;
const TICK_MS = 40;
/** Level into the shared music bus. The music slider still sits on top of this. */
const BED_LEVEL = 0.8;

const A2 = 110;
const E3 = 164.81;
const A3 = 220;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392;
const A4 = 440;
const C5 = 523.25;

interface Bell {
  step: number;
  freq: number;
  dur: number;
  gain: number;
}

/** A minor pentatonic, one or two notes a bar, long decays. */
const BELLS: Bell[] = [
  { step: 0, freq: A4, dur: 2.4, gain: 0.09 },
  { step: 10, freq: E4, dur: 2.0, gain: 0.06 },
  { step: 16, freq: C5, dur: 2.6, gain: 0.055 },
  { step: 26, freq: G4, dur: 2.2, gain: 0.05 },
  { step: 32, freq: D4, dur: 2.4, gain: 0.06 },
  { step: 40, freq: A4, dur: 2.8, gain: 0.07 },
  { step: 46, freq: E4, dur: 1.8, gain: 0.045 },
  { step: 52, freq: C5, dur: 2.2, gain: 0.05 },
  { step: 58, freq: A3, dur: 3.4, gain: 0.07 },
];

let master: GainNode | null = null;
let bed: Bed | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let disposeTimer: ReturnType<typeof setTimeout> | null = null;
let ctx: AudioContext | null = null;
let step = 0;
let nextTime = 0;
let playing = false;
let stopped: AudioScheduledSourceNode[] = [];
let noiseBuf: AudioBuffer | null = null;

function noise(ac: BaseAudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 0x51ed_3c1;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    data[i] = seed / 0x80000000;
  }
  noiseBuf = buf;
  return buf;
}

function env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

interface Bed {
  dry: GainNode;
  echo: GainNode;
}

function bell(ac: BaseAudioContext, bed: Bed, t: number, freq: number, dur: number, gain: number) {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  const fifth = ac.createOscillator();
  fifth.type = "triangle";
  fifth.frequency.setValueAtTime(freq * 1.5, t);
  const g = ac.createGain();
  env(g, t, gain, 0.04, dur);
  const quiet = ac.createGain();
  quiet.gain.value = 0.35;
  osc.connect(g);
  fifth.connect(quiet).connect(g);
  g.connect(bed.dry);
  g.connect(bed.echo);
  osc.start(t);
  fifth.start(t);
  osc.stop(t + dur + 0.05);
  fifth.stop(t + dur + 0.05);
}

/** A muffled, far-off tap. Sparse on purpose, so it feels like waiting, not a clock. */
function pulse(ac: BaseAudioContext, bed: Bed, t: number, gain: number) {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(78, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.28);
  const g = ac.createGain();
  env(g, t, gain, 0.01, 0.32);
  osc.connect(g).connect(bed.dry);
  osc.start(t);
  osc.stop(t + 0.4);

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(240, t);
  const ng = ac.createGain();
  env(ng, t, gain * 0.45, 0.005, 0.14);
  src.connect(lp).connect(ng).connect(bed.dry);
  src.start(t);
  src.stop(t + 0.2);
}

function playStep(ac: BaseAudioContext, bed: Bed, index: number, t: number) {
  for (const note of BELLS) {
    if (note.step === index) bell(ac, bed, t, note.freq, note.dur, note.gain);
  }
  // Downbeat of every other bar, plus a quieter pickup just before the next one.
  if (index % 16 === 0) pulse(ac, bed, t, 0.16);
  else if (index % 16 === 14) pulse(ac, bed, t, 0.06);
  if (index % 32 === 0) {
    bell(ac, bed, t, A3, 3.6, 0.04);
    bell(ac, bed, t, E3, 3.6, 0.03);
  }
}

function tick() {
  if (!ctx || !bed) return;
  if (nextTime < ctx.currentTime - 0.05) nextTime = ctx.currentTime + 0.03;
  while (nextTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
    playStep(ctx, bed, step, nextTime);
    step = (step + 1) % LOOP_STEPS;
    nextTime += EIGHTH;
  }
}

function teardown() {
  if (timer) clearInterval(timer);
  timer = null;
  if (disposeTimer) clearTimeout(disposeTimer);
  disposeTimer = null;
  for (const n of stopped) {
    try {
      n.stop();
    } catch {
      // already stopped
    }
  }
  stopped = [];
  master?.disconnect();
  master = null;
  bed = null;
}

export function isHuntPlaying(): boolean {
  return playing;
}

/** Fade the underscore in on the music bus. */
export function startHunt(ac: AudioContext, bus: AudioNode, fadeSeconds = 1.4): void {
  if (playing) return;
  teardown();
  ctx = ac;

  const dry = ac.createGain();
  dry.gain.value = 1;
  const echoSend = ac.createGain();
  echoSend.gain.value = 1;
  const delay = ac.createDelay(1.5);
  delay.delayTime.value = 0.46;
  const feedback = ac.createGain();
  feedback.gain.value = 0.3;
  const echoFilter = ac.createBiquadFilter();
  echoFilter.type = "lowpass";
  echoFilter.frequency.value = 1500;
  const wet = ac.createGain();
  wet.gain.value = 0.5;
  echoSend.connect(delay);
  delay.connect(echoFilter).connect(feedback).connect(delay);
  echoFilter.connect(wet);

  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, ac.currentTime);
  out.gain.exponentialRampToValueAtTime(BED_LEVEL, ac.currentTime + fadeSeconds);
  dry.connect(out);
  wet.connect(out);
  out.connect(bus);

  // Two slightly detuned low sines, breathing slowly. This is the calm.
  const padFilter = ac.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 640;
  const padGain = ac.createGain();
  padGain.gain.value = 0.12;
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 0.04;
  lfo.connect(lfoDepth).connect(padGain.gain);
  for (const detune of [-6, 7]) {
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = A2;
    osc.detune.value = detune;
    osc.connect(padFilter);
    osc.start();
    stopped.push(osc);
  }
  const fifth = ac.createOscillator();
  fifth.type = "sine";
  fifth.frequency.value = E3;
  fifth.detune.value = 4;
  const fifthGain = ac.createGain();
  fifthGain.gain.value = 0.45;
  fifth.connect(fifthGain).connect(padFilter);
  fifth.start();
  padFilter.connect(padGain).connect(dry);
  lfo.start();
  stopped.push(fifth, lfo);

  bed = { dry, echo: echoSend };
  master = out;
  step = 0;
  nextTime = ac.currentTime + 0.15;
  playing = true;
  tick();
  timer = setInterval(tick, TICK_MS);
}

/** Fade out, then free the nodes. */
export function stopHunt(fadeSeconds = 0.6): void {
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
