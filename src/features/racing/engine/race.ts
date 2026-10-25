import { RACE } from "../config";
import type { Track } from "../world/track";
import { clamp01, modLoop, wrapLoop } from "./math";

export interface RacerProgress {
  id: number;
  /** 1-based lap the racer is on. */
  lap: number;
  /** Index of the next gate this racer must pass (0 is the finish line). */
  next: number;
  /** Gates passed in the whole race, finish-line crossings included. */
  passed: number;
  /** Gate the racer last passed: where a respawn puts them. */
  lastCheckpoint: number;
  /** Arc length along the loop now and one step ago. */
  s: number;
  prevS: number;
  /** 0..1 progress between the last gate passed and the next one. */
  fraction: number;
  lapStart: number;
  lapTimes: number[];
  bestLap: number | null;
  finished: boolean;
  finishTime: number | null;
  place: number | null;
}

export type ProgressEvent =
  | { type: "checkpoint"; racer: number; index: number }
  | { type: "lap"; racer: number; lap: number; lapTime: number; best: boolean }
  | { type: "finish"; racer: number; place: number; time: number };

/**
 * Checkpoints, laps, finishing and ranking for any number of racers.
 *
 * A gate only counts when it is the *next* one in sequence, the racer moved
 * forward through it this step, and they crossed inside its width. So driving
 * backwards over the line, skipping gates or teleporting (respawns reset the
 * position without crossing anything) can never award a lap.
 */
export class RaceManager {
  readonly racers: RacerProgress[] = [];
  private finishedCount = 0;

  constructor(
    readonly track: Track,
    readonly count: number,
    readonly laps: number,
  ) {
    for (let i = 0; i < count; i++) this.racers.push(newProgress(i));
  }

  reset(starts: readonly number[]): void {
    this.finishedCount = 0;
    for (let i = 0; i < this.count; i++) {
      const r = this.racers[i];
      Object.assign(r, newProgress(i));
      r.s = r.prevS = starts[i] ?? 0;
      r.fraction = this.fractionOf(r);
    }
  }

  /** Moves a racer without crossing anything (respawn). */
  teleport(id: number, s: number): void {
    const r = this.racers[id];
    r.s = r.prevS = s;
    r.fraction = this.fractionOf(r);
  }

  /**
   * Feeds a racer's new position. `lateral` is metres from the centre line,
   * `gateScale` widens or narrows the gates relative to the road width.
   */
  update(id: number, s: number, lateral: number, time: number, gateScale: number, emit: (e: ProgressEvent) => void): void {
    const r = this.racers[id];
    const L = this.track.length;
    r.prevS = r.s;
    r.s = s;
    if (r.finished) {
      r.fraction = this.fractionOf(r);
      return;
    }
    const ds = wrapLoop(r.s - r.prevS, L);
    if (ds > 0 && ds < RACE.maxCrossingStep) {
      const g = this.track.checkpoints[r.next];
      const d0 = wrapLoop(r.prevS - g.s, L);
      const d1 = wrapLoop(r.s - g.s, L);
      if (d0 < 0 && d1 >= 0 && Math.abs(lateral) <= g.halfWidth * gateScale) this.pass(r, time, emit);
    }
    r.fraction = this.fractionOf(r);
  }

  private pass(r: RacerProgress, time: number, emit: (e: ProgressEvent) => void): void {
    const gates = this.track.checkpoints.length;
    r.passed++;
    r.lastCheckpoint = r.next;
    if (r.next !== 0) {
      emit({ type: "checkpoint", racer: r.id, index: r.next });
      r.next = (r.next + 1) % gates;
      return;
    }
    // Crossed the finish line with every gate in order: a lap.
    const lapTime = time - r.lapStart;
    r.lapStart = time;
    r.lapTimes.push(lapTime);
    const best = r.bestLap === null || lapTime < r.bestLap;
    if (best) r.bestLap = lapTime;
    emit({ type: "lap", racer: r.id, lap: r.lap, lapTime, best });
    if (r.lap >= this.laps) {
      r.finished = true;
      r.finishTime = time;
      r.place = ++this.finishedCount;
      emit({ type: "finish", racer: r.id, place: r.place, time });
    } else {
      r.lap++;
      r.next = 1 % gates;
    }
  }

  private fractionOf(r: RacerProgress): number {
    const L = this.track.length;
    const last = this.track.checkpoints[r.lastCheckpoint];
    const nxt = this.track.checkpoints[r.next];
    const seg = modLoop(nxt.s - last.s, L) || L;
    return clamp01(wrapLoop(r.s - last.s, L) / seg);
  }

  /** Racer ids from first to last. Finished racers keep the order they finished in. */
  rank(): number[] {
    return this.racers
      .slice()
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished && b.finished) return (a.place ?? 0) - (b.place ?? 0);
        if (a.lap !== b.lap) return b.lap - a.lap;
        if (a.passed !== b.passed) return b.passed - a.passed;
        return b.fraction - a.fraction;
      })
      .map((r) => r.id);
  }

  /** 1-based position of a racer. */
  positionOf(id: number): number {
    return this.rank().indexOf(id) + 1;
  }
}

function newProgress(id: number): RacerProgress {
  return { id, lap: 1, next: 1, passed: 0, lastCheckpoint: 0, s: 0, prevS: 0, fraction: 0, lapStart: 0, lapTimes: [], bestLap: null, finished: false, finishTime: null, place: null };
}
