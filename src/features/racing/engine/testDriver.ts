import { neutralControls, type Controls } from "../types";
import { angleDiff, clamp, headingOf } from "./math";
import type { RaceEngine } from "./RaceEngine";

/**
 * A pure-pursuit driver for tests: aims at a point on the road ahead and
 * lifts for corners. It plays through the same `setControls` API a human
 * uses, so a test that finishes a race with it proves the whole loop works.
 * (The Phase 3 AI grows out of this idea.)
 */
export function autopilot(engine: RaceEngine, out: Controls = neutralControls(), cornerSpeed = 36): Controls {
  const v = engine.player;
  const track = engine.track;
  const s = v.query.s;
  const look = clamp(10 + Math.abs(v.speed) * 0.6, 10, 36);
  const aim = track.sample(s + look);
  const err = angleDiff(headingOf(aim.x - v.x, aim.z - v.z), v.heading);
  out.steer = clamp(-err * 2.2, -1, 1);
  const turn = Math.abs(angleDiff(track.sample(s + 60).heading, track.sample(s + 20).heading));
  const target = clamp(cornerSpeed - turn * 45, 14, cornerSpeed);
  out.throttle = v.speed < target ? 1 : 0;
  out.brake = v.speed > target + 5 ? 1 : 0;
  out.handbrake = false;
  out.boost = false;
  return out;
}

/** Runs the engine for `seconds` of game time in frames of `frame` seconds, re-deciding controls each frame. */
export function runFor(engine: RaceEngine, seconds: number, decide: (engine: RaceEngine) => Controls | null, frame = 1 / 60): void {
  const frames = Math.round(seconds / frame);
  for (let i = 0; i < frames; i++) {
    const c = decide(engine);
    if (c) engine.setControls(c);
    engine.advance(frame);
  }
}
