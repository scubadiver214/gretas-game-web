import { seededRng, type Rng } from "@/lib/rng";
import { AI } from "../config";
import { neutralControls, type Controls, type VehicleParams } from "../types";
import type { Track } from "../world/track";
import type { DifficultyConfig } from "./difficulty";
import { TAU, angleDiff, clamp, clamp01, damp, headingOf, lerp, wrapLoop } from "./math";
import type { VehicleState } from "./vehicle";

/** How one computer driver races, on top of the tier's skill. */
export interface AiPersonality {
  /** Top speed relative to the tier's AI pace (1 = exactly the tier pace). */
  pace: number;
  /** Added to the tier's cornering skill (0..1): positive takes bends faster. */
  cornering: number;
  /** Preferred lane, as a fraction of the road half-width (-1 left .. 1 right). */
  lane: number;
  /** How far the lane wanders back and forth (fraction of the half-width). */
  weave: number;
  /** Multiplies the tier's mistake rate. */
  mistakes: number;
  /** 0..1: how readily it fires its boost to pass the player. */
  aggression: number;
}

/** What a driver can see this step. */
export interface AiView {
  track: Track;
  params: VehicleParams;
  difficulty: DifficultyConfig;
  /** Metres the player is ahead of this car along the race (negative: the player is behind). */
  gap: number;
  /** This car has crossed the finish line. */
  finished: boolean;
  /** Every car in the race (this one included), to steer round the ones in the way. */
  cars: readonly VehicleState[];
  radii: readonly number[];
  self: number;
}

/**
 * A computer driver: pure pursuit toward a point on its lane ahead, lifting and braking
 * for the bends it can see, with a personality (pace, line, wobble, boost temper) and
 * the occasional mistake. Deterministic: its randomness is seeded, so a race replays
 * identically. It only produces Controls; the car itself obeys the same physics as the
 * player's.
 */
export class AiDriver {
  readonly controls: Controls = neutralControls();
  private rng: Rng;
  private clock = 0;
  private phase = 0;
  private mistakeT = 0;
  private mistakeSide = 1;
  /** Current sideways shift (fraction of half-width) to get round traffic. */
  private dodge = 0;

  constructor(
    readonly personality: AiPersonality,
    private readonly seed: string,
  ) {
    this.rng = seededRng(seed);
    this.reset();
  }

  reset(): void {
    this.rng = seededRng(this.seed);
    this.clock = 0;
    this.phase = this.rng() * TAU;
    this.mistakeT = 0;
    this.mistakeSide = 1;
    this.dodge = 0;
  }

  drive(v: VehicleState, view: AiView, dt: number): Controls {
    const out = this.controls;
    const p = this.personality;
    const d = view.difficulty;
    const track = view.track;
    const q = v.query;
    this.clock += dt;

    // Now and then: a wide line and a lift, as if distracted.
    if (this.mistakeT > 0) this.mistakeT -= dt;
    else if (!view.finished && this.rng() < ((d.aiMistakeFrequency * p.mistakes) / 60) * dt) {
      this.mistakeT = 0.7 + this.rng() * 0.8;
      this.mistakeSide = this.rng() < 0.5 ? -1 : 1;
    }
    const slipping = this.mistakeT > 0;

    this.dodge = damp(this.dodge, this.trafficShift(v, view), 3, dt);
    let lane = p.lane + p.weave * Math.sin(this.clock * 0.31 + this.phase) + this.dodge;
    if (slipping) lane += this.mistakeSide * 0.35;
    lane = clamp(lane, -AI.maxLane, AI.maxLane);

    // Steer at a point on the lane ahead; the faster, the further it looks.
    const speed = Math.abs(v.speed);
    const look = clamp(10 + speed * 0.6, 10, 36);
    const aim = track.sample(q.s + look);
    const lat = lane * aim.halfWidth;
    const ax = aim.x - aim.tz * lat;
    const az = aim.z + aim.tx * lat;
    const err = angleDiff(headingOf(ax - v.x, az - v.z), v.heading);
    out.steer = clamp(-err * 2.4, -1, 1);

    // How fast: the tier's pace, this driver's temperament, and where the player is.
    let pace = d.aiSpeedMultiplier * p.pace;
    const behind = view.gap > 0 ? clamp01(view.gap / AI.bandDistance) : 0;
    if (behind > 0) pace = lerp(pace, Math.max(pace, (d.aiSpeedMultiplier + AI.catchUp) * p.pace), behind);
    else pace *= 1 - AI.easeOff * clamp01(-view.gap / AI.bandDistance);
    if (view.finished) pace *= AI.cruise;
    if (slipping) pace *= 0.85;
    const top = view.params.maxSpeed * pace;

    // Slow for the bend coming up; better drivers carry more speed through it.
    const turn = Math.abs(angleDiff(track.sample(q.s + 25 + speed * 0.8).heading, track.sample(q.s + 8).heading));
    const skill = clamp01(d.aiCorneringSkill + p.cornering + AI.catchUpCornering * behind);
    const target = clamp(top - turn * lerp(58, 16, skill), 12, top);

    out.throttle = v.speed < target ? 1 : 0;
    out.brake = clamp((v.speed - target - 3) / 6, 0, 1);
    out.handbrake = false;

    // Fire the boost to pass a player just ahead on a straight; keep it lit until the bend.
    const straight = turn < AI.boostMaxTurn;
    out.boost = !view.finished && straight && (v.boosting || (v.boost >= AI.boostAt && view.gap > 0 && view.gap < AI.boostRange && this.rng() < p.aggression * dt * 1.5));
    if (out.boost) {
      out.throttle = 1;
      out.brake = 0;
    }
    return out;
  }

  /** A lane shift (fraction of half-width) that takes this car round the nearest car in its way. */
  private trafficShift(v: VehicleState, view: AiView): number {
    const track = view.track;
    const q = v.query;
    let best: number = AI.trafficLook;
    let shift = 0;
    for (let j = 0; j < view.cars.length; j++) {
      if (j === view.self) continue;
      const o = view.cars[j];
      const ahead = wrapLoop(o.query.s - q.s, track.length);
      if (ahead <= 0 || ahead >= best) continue;
      const room = view.radii[view.self] + view.radii[j] + 1.2;
      const side = o.query.lateral - q.lateral;
      if (Math.abs(side) >= room) continue;
      best = ahead;
      // Pass on the side with more road.
      const dir = side > 0 ? -1 : side < 0 ? 1 : o.query.lateral > 0 ? -1 : 1;
      shift = (dir * room) / Math.max(4, q.halfWidth);
    }
    return shift;
  }
}
