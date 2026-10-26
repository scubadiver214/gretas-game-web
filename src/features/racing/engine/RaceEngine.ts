import { Emitter } from "@/lib/game/events";
import { AI, BUGGY, CRASH, MAX_STEPS_PER_FRAME, MPH_PER_UNIT, PICKUP, RACE, STEP_SECONDS, WEAPONS } from "../config";
import { neutralControls, type Controls, type HudSnapshot, type RaceEvent, type RacePhase, type RaceSummary, type VehicleParams, type WeaponAction, type WeaponKind } from "../types";
import type { AnimalSpec, Collectible, Obstacle, TrackContent } from "../world/content";
import { SpatialGrid } from "../world/spatial";
import type { AnimalKind, Track } from "../world/track";
import { AiDriver, type AiPersonality, type AiView } from "./ai";
import { resolveBoundary, resolveCars, resolveObstacles } from "./collision";
import { difficultyFor, playerTuning, type AssistLevel, type DifficultyConfig, type PlayerTuning } from "./difficulty";
import { angleDiff, clamp, headingOf, lerp, lerpAngle } from "./math";
import { RaceManager, type ProgressEvent } from "./race";
import { createVehicle, integrateDrive, integrateVertical, placeVehicle, snapshot, type VehicleState, type VerticalResult } from "./vehicle";
import { TrackWeather, weatherIsHeavy, weatherKindFor, type WeatherSample } from "./weather";

/** A computer-driven car: how it handles and how it drives. */
export interface RivalSetup {
  name: string;
  params: VehicleParams;
  personality: AiPersonality;
}

export interface RaceOptions {
  /** Difficulty tier 1-5. */
  tier?: number;
  assist?: AssistLevel;
  params?: VehicleParams;
  /** Computer cars to race against. None is a time trial. */
  rivals?: readonly RivalSetup[];
  /** Grid slot of the player: 0 is the front row, left. Defaults to the back of the grid. */
  playerSlot?: number;
}

/** An interpolated pose for rendering. Reused by the caller, so reading it never allocates. */
export interface RenderPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  steer: number;
  wheelSpin: number;
}

/** What an animal that crosses the road is doing. */
export type AnimalPhase = "wait" | "cross" | "rest";

/** An animal that waits at the roadside, dashes across when a car comes near, then rests on the far side. */
export interface AnimalState {
  spec: AnimalSpec;
  kind: AnimalKind;
  phase: AnimalPhase;
  x: number;
  z: number;
  heading: number;
  prevX: number;
  prevZ: number;
  prevHeading: number;
  /** 0 at spot `a`, 1 at spot `b`: where it is waiting or heading for. */
  at: 0 | 1;
  timer: number;
  /** Fraction of the way across (0..1) while crossing: drives the running animation. */
  progress: number;
  /** Bumped by a car: it bolts for the other side faster. */
  spooked: boolean;
  /** The solid circle cars bump into. */
  body: Obstacle;
}

export interface AnimalPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  running: boolean;
}

/** A blaster bolt flying in a straight line. */
export interface Bolt {
  owner: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
}

/** A mine waiting on the road. `arm` counts down before it can go off. */
export interface LaidMine {
  owner: number;
  x: number;
  y: number;
  z: number;
  arm: number;
  life: number;
}

/** An oil puddle. Cars that drive through it slide. */
export interface Slick {
  x: number;
  y: number;
  z: number;
  life: number;
}

export function newRenderPose(): RenderPose {
  return { x: 0, y: 0, z: 0, heading: 0, steer: 0, wheelSpin: 0 };
}

/** A car may not drive up a ledge taller than this (the back of a ramp). */
const STEP_UP = 0.7;
/** An animal starts across when a car is this far from the crossing (plus a speed allowance, seconds of travel). */
const ANIMAL_TRIGGER = 26;
const ANIMAL_LOOKAHEAD = 1.3;
/** A bumped animal runs this much faster. */
const SPOOKED_SPEED = 1.5;
/** How long an animal rests on the far side before it can cross again. */
const ANIMAL_REST = 2.5;
/** Wall / obstacle events closer together than this are merged (seconds). */
const HIT_COOLDOWN = 0.28;

/**
 * One race, independent of React and three.js. Call `advance(dt)` once per
 * animation frame: it runs fixed 60 Hz steps (so the car handles identically at
 * any frame rate) and exposes `pose()` to read the cars interpolated between
 * steps. The HUD subscribes through `onHud`, which only fires when a displayed
 * value changes. The player is car 0; any rivals follow, each with its own handling
 * and an AiDriver. With no rivals it is a time trial.
 */
export class RaceEngine {
  phase: RacePhase = "ready";
  readonly events = new Emitter<RaceEvent>();
  readonly track: Track;
  readonly content: TrackContent;
  readonly vehicles: VehicleState[] = [];
  /** Handling of each car, indexed like `vehicles`. */
  readonly carParams: VehicleParams[] = [];
  /** The computer driver of each car; null for the player. */
  readonly drivers: (AiDriver | null)[] = [];
  /** Each car's name: empty for the player. */
  readonly names: string[] = [];
  race: RaceManager;
  rivals: readonly RivalSetup[] = [];
  /** 1 once a collectible has been picked up this lap, indexed by Collectible.id. */
  readonly collected: Uint8Array;
  /** Charges of each toy weapon. */
  readonly ammo: Record<WeaponKind, number> = { gun: 0, mine: 0, oil: 0 };
  /** The weapon F (or the fire button) will use. */
  weapon: WeaponKind = "gun";
  /** Blaster bolts in the air. */
  readonly shots: Bolt[] = [];
  /** Mines sitting on the road. */
  readonly mines: LaidMine[] = [];
  /** Oil puddles on the road. */
  readonly slicks: Slick[] = [];
  readonly params: VehicleParams;
  readonly playerIndex = 0;
  /** Animals that cross the road. */
  readonly animals: AnimalState[] = [];
  /** Current snow/rain sample; intensity 0 is fair weather. */
  weather: WeatherSample = { kind: "none", intensity: 0, gripScale: 1, yawScale: 1 };
  private readonly weatherPlan: TrackWeather;
  private weatherHeavy = false;

  tier: number;
  assist: AssistLevel;
  tuning: PlayerTuning;
  difficulty: DifficultyConfig;

  /** Seconds since GO. */
  time = 0;
  /** Engine clock; runs in every phase so idle animation can use it. */
  clock = 0;
  /** 0..1 progress between the last two steps, for interpolation. */
  alpha = 0;
  coins = 0;
  gems = 0;
  wrongWay = false;
  stuck = false;
  /** Seconds since the player crossed the line. */
  finishedFor = 0;

  private controls: Controls = neutralControls();
  private readonly driven: Controls = neutralControls();
  private countdownT = 0;
  private goTimer = 0;
  private accumulator = 0;
  private pausedFrom: RacePhase | null = null;
  private resultsReady = false;
  private readonly playerSlot: number | undefined;
  /** Grid slot of each car. */
  private slots: number[] = [];
  private readonly radii: number[] = [];
  /** Reused every step, so driving the rivals never allocates. */
  private readonly aiView: AiView;
  private readonly hitCooldown: number[] = [];
  private readonly obstacleGrid = new SpatialGrid<Obstacle>(20);
  private readonly pickupGrid = new SpatialGrid<Collectible>(12);
  private readonly nearObstacles: Obstacle[] = [];
  private readonly nearPickups: Collectible[] = [];
  private readonly nearAnimals: Obstacle[] = [];
  /** 1 once a weapon icon has been picked up this lap. */
  private readonly crateTaken: Uint8Array;
  private readonly vertical: VerticalResult = { takeoff: false, landed: false, impact: 0 };
  private readonly onProgress = (e: ProgressEvent) => this.handleProgress(e);
  private hudListener: ((hud: HudSnapshot) => void) | null = null;
  private lastHudKey = "";

  constructor(track: Track, content: TrackContent, opts: RaceOptions = {}) {
    this.track = track;
    this.content = content;
    this.params = opts.params ?? BUGGY;
    this.tier = opts.tier ?? 1;
    this.assist = opts.assist ?? "helper";
    this.tuning = playerTuning(this.tier, this.assist);
    this.difficulty = difficultyFor(this.tier);
    this.playerSlot = opts.playerSlot;
    this.aiView = { track, params: this.params, difficulty: this.difficulty, gap: 0, finished: false, cars: this.vehicles, radii: this.radii, self: 0 };
    this.collected = new Uint8Array(content.collectibles.length);
    this.crateTaken = new Uint8Array(content.weapons.length);
    for (const o of content.obstacles) this.obstacleGrid.insert(o);
    for (const c of content.collectibles) this.pickupGrid.insert(c);
    for (const spec of content.animals) {
      this.animals.push({
        spec,
        kind: spec.kind,
        phase: "wait",
        x: spec.a.x,
        z: spec.a.z,
        heading: 0,
        prevX: spec.a.x,
        prevZ: spec.a.z,
        prevHeading: 0,
        at: 0,
        timer: 0,
        progress: 0,
        spooked: false,
        body: { x: spec.a.x, z: spec.a.z, r: spec.r, kind: "animal", bounce: 0.5, height: spec.height, y: track.hillAt(spec.s) },
      });
    }
    this.placeAnimals();
    this.race = this.buildField(opts.rivals ?? []);
    this.weatherPlan = new TrackWeather(weatherKindFor(track.def.world), track.def.seed);
    this.weather = this.weatherPlan.at(0);
    this.placeAll();
  }

  get player(): VehicleState {
    return this.vehicles[this.playerIndex];
  }

  /**
   * Changes difficulty, assist and (optionally) the rivals for the next race. Applied on
   * reset: call `reset()` straight after, which also tells the renderer the cars changed.
   */
  configure(tier: number, assist: AssistLevel, rivals: readonly RivalSetup[] = this.rivals): void {
    this.tier = tier;
    this.assist = assist;
    this.tuning = playerTuning(tier, assist);
    this.difficulty = difficultyFor(tier);
    if (rivals !== this.rivals) this.race = this.buildField(rivals);
  }

  /** Back to a fresh grid in the "ready" phase. */
  reset(): void {
    this.phase = "ready";
    this.pausedFrom = null;
    this.accumulator = 0;
    this.alpha = 0;
    this.time = 0;
    this.countdownT = 0;
    this.goTimer = 0;
    this.finishedFor = 0;
    this.resultsReady = false;
    this.coins = 0;
    this.gems = 0;
    this.wrongWay = false;
    this.stuck = false;
    this.weatherHeavy = false;
    this.weather = this.weatherPlan.at(0);
    this.controls = neutralControls();
    this.collected.fill(0);
    this.clearWeapons();
    for (const d of this.drivers) d?.reset();
    this.placeAll();
    this.placeAnimals();
    this.events.emit({ type: "reset" });
    this.pushHud();
  }

  /** Begin the 3-2-1 countdown. */
  start(): void {
    if (this.phase !== "ready") return;
    this.phase = "countdown";
    this.countdownT = 0;
    this.events.emit({ type: "countdownStart" });
    this.events.emit({ type: "countdown", n: RACE.countdownSeconds });
    this.pushHud();
  }

  /** The player's current controls (keyboard and touch merged by the caller). */
  setControls(c: Controls): void {
    this.controls = c;
  }

  pause(): void {
    if (this.phase !== "countdown" && this.phase !== "racing" && !(this.phase === "finished" && !this.resultsReady)) return;
    this.pausedFrom = this.phase;
    this.phase = "paused";
    this.events.emit({ type: "paused" });
    this.pushHud();
  }

  resume(): void {
    if (this.phase !== "paused" || !this.pausedFrom) return;
    this.phase = this.pausedFrom;
    this.pausedFrom = null;
    this.accumulator = 0;
    this.events.emit({ type: "resumed" });
    this.pushHud();
  }

  togglePause(): void {
    if (this.phase === "paused") this.resume();
    else this.pause();
  }

  /** Put the player back on the road at the last gate they passed (R key, or automatic when stuck). */
  respawn(auto = false): void {
    if (this.phase !== "racing") return;
    this.respawnPlayer(auto);
    this.pushHud();
  }

  /** Feed wall-clock time; runs as many fixed steps as fit. */
  advance(dt: number): void {
    if (this.phase === "paused") return;
    this.accumulator += clamp(dt, 0, 0.25);
    let steps = 0;
    while (this.accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
      this.step(STEP_SECONDS);
      this.accumulator -= STEP_SECONDS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.alpha = this.accumulator / STEP_SECONDS;
    this.pushHud();
  }

  /** The car's pose interpolated between the last two steps. */
  pose(index: number, out: RenderPose): RenderPose {
    const v = this.vehicles[index];
    const a = this.phase === "ready" ? 1 : this.alpha;
    out.x = lerp(v.prev.x, v.x, a);
    out.y = lerp(v.prev.y, v.y, a);
    out.z = lerp(v.prev.z, v.z, a);
    out.heading = lerpAngle(v.prev.heading, v.heading, a);
    out.steer = lerp(v.prev.steer, v.steer, a);
    out.wheelSpin = lerp(v.prev.wheelSpin, v.wheelSpin, a);
    return out;
  }

  /** An animal's pose interpolated between the last two steps. */
  animalPose(index: number, out: AnimalPose): AnimalPose {
    const a = this.animals[index];
    const k = this.phase === "ready" ? 1 : this.alpha;
    out.x = lerp(a.prevX, a.x, k);
    out.z = lerp(a.prevZ, a.z, k);
    out.y = a.body.y ?? 0;
    out.heading = lerpAngle(a.prevHeading, a.heading, k);
    out.running = a.phase === "cross";
    return out;
  }

  /** The player's race time: running while racing, frozen at the line once finished. */
  get playerTime(): number {
    const p = this.race.racers[this.playerIndex];
    return p.finishTime ?? this.time;
  }

  /** Ground speed for the speedometer: how fast the car is really moving, even when it slides sideways. */
  get speedMph(): number {
    const p = this.player;
    return Math.round(Math.hypot(p.vx, p.vz) * MPH_PER_UNIT);
  }

  /** Remaining seconds of the countdown digit currently showing (for the renderer's start lights). */
  get countdownProgress(): number {
    return this.phase === "countdown" ? this.countdownT : this.phase === "ready" ? 0 : RACE.countdownSeconds;
  }

  summary(): RaceSummary {
    const r = this.race.racers[this.playerIndex];
    return {
      trackId: this.track.def.id,
      tier: this.tier,
      laps: this.race.laps,
      place: r.place ?? this.race.positionOf(this.playerIndex),
      racers: this.race.count,
      timeSeconds: this.playerTime,
      lapTimes: r.lapTimes.slice(),
      bestLap: r.bestLap,
      coins: this.coins,
      gems: this.gems,
      finished: r.finished,
      standings: this.race.rank().map((id) => {
        const o = this.race.racers[id];
        return { racer: id, name: this.names[id], finished: o.finished, time: o.finishTime };
      }),
    };
  }

  /** How far a car has come in the race, in metres (gates are evenly spaced). */
  raceDistance(index: number): number {
    const r = this.race.racers[index];
    return ((r.passed + r.fraction) * this.track.length) / this.track.checkpoints.length;
  }

  hud(): HudSnapshot {
    const r = this.race.racers[this.playerIndex];
    let countdown: number | null = null;
    if (this.phase === "countdown") countdown = Math.max(1, RACE.countdownSeconds - Math.floor(this.countdownT));
    else if (this.goTimer > 0) countdown = 0;
    const p = this.player;
    return {
      phase: this.phase,
      countdown,
      lap: Math.min(r.lap, this.race.laps),
      laps: this.race.laps,
      rank: this.race.count > 1 ? this.race.positionOf(this.playerIndex) : 1,
      racers: this.race.count,
      coins: this.coins,
      gems: this.gems,
      boost: Math.round(p.boost * 50) / 50,
      boosting: p.boosting,
      wrongWay: this.wrongWay,
      stuck: this.stuck,
      crashed: p.wrecked > 0,
      weapon: this.weapon,
      gun: this.ammo.gun,
      mine: this.ammo.mine,
      oil: this.ammo.oil,
      finishedPlace: r.place,
      resultsReady: this.resultsReady,
    };
  }

  onHud(listener: ((hud: HudSnapshot) => void) | null): void {
    this.hudListener = listener;
    this.lastHudKey = "";
    this.pushHud();
  }

  private pushHud(): void {
    if (!this.hudListener) return;
    const h = this.hud();
    const key = `${h.phase}|${h.countdown}|${h.lap}|${h.rank}|${h.coins}|${h.gems}|${h.boost}|${h.boosting}|${h.wrongWay}|${h.stuck}|${h.crashed}|${h.weapon}|${h.gun}|${h.mine}|${h.oil}|${h.finishedPlace}|${h.resultsReady}`;
    if (key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.hudListener(h);
  }

  // ---------------------------------------------------------------------------

  /** The player plus one car per rival, and the grid they start on. Returns the race to track them. */
  private buildField(rivals: readonly RivalSetup[]): RaceManager {
    this.rivals = rivals;
    const n = 1 + rivals.length;
    this.vehicles.length = 0;
    this.carParams.length = 0;
    this.drivers.length = 0;
    this.names.length = 0;
    this.radii.length = 0;
    this.hitCooldown.length = 0;
    this.vehicles.push(createVehicle(0));
    this.carParams.push(this.params);
    this.drivers.push(null);
    this.names.push("");
    rivals.forEach((r, k) => {
      this.vehicles.push(createVehicle(k + 1));
      this.carParams.push(r.params);
      this.drivers.push(new AiDriver(r.personality, `${this.track.def.seed}:${r.name}`));
      this.names.push(r.name);
    });
    for (let i = 0; i < n; i++) {
      this.radii.push(this.carParams[i].radius);
      this.hitCooldown.push(0);
    }
    // The player starts at the back by default, so there is someone to chase.
    const mine = clamp(this.playerSlot ?? n - 1, 0, n - 1);
    this.slots = [mine];
    for (let s = 0; s < n; s++) if (s !== mine) this.slots.push(s);
    return new RaceManager(this.track, n, this.track.def.laps);
  }

  private placeAll(): void {
    const starts: number[] = [];
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const pose = this.track.gridPose(this.slots[i]);
      placeVehicle(v, pose.x, pose.z, pose.heading);
      v.boost = 0;
      v.grace = 0;
      this.track.projectGlobal(v.x, v.z, v.query);
      v.y = this.track.heightAt(v.query.s);
      snapshot(v);
      starts.push(v.query.s);
      this.hitCooldown[i] = 0;
    }
    this.race.reset(starts);
  }

  /** Back to the roadside spot each animal starts from. */
  private placeAnimals(): void {
    for (const a of this.animals) {
      const spot = a.spec.startAt === 0 ? a.spec.a : a.spec.b;
      const other = a.spec.startAt === 0 ? a.spec.b : a.spec.a;
      a.phase = "wait";
      a.at = a.spec.startAt;
      a.timer = 0;
      a.progress = 0;
      a.spooked = false;
      a.x = a.prevX = spot.x;
      a.z = a.prevZ = spot.z;
      a.heading = a.prevHeading = headingOf(other.x - spot.x, other.z - spot.z);
      a.body.x = a.x;
      a.body.z = a.z;
    }
  }

  private stepAnimals(dt: number): void {
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      a.prevX = a.x;
      a.prevZ = a.z;
      a.prevHeading = a.heading;
      const from = a.at === 0 ? a.spec.a : a.spec.b;
      const to = a.at === 0 ? a.spec.b : a.spec.a;
      if (a.phase === "wait") {
        if (this.phase !== "racing") continue;
        const v = this.player;
        const ahead = (a.spec.s - v.query.s + this.track.length) % this.track.length;
        if (ahead < ANIMAL_TRIGGER + Math.max(0, v.speed) * ANIMAL_LOOKAHEAD) {
          a.phase = "cross";
          a.heading = headingOf(to.x - from.x, to.z - from.z);
          a.prevHeading = a.heading;
        }
      } else if (a.phase === "cross") {
        const dx = to.x - a.x;
        const dz = to.z - a.z;
        const left = Math.hypot(dx, dz);
        const move = a.spec.speed * (a.spooked ? SPOOKED_SPEED : 1) * dt;
        if (left <= move) {
          a.x = to.x;
          a.z = to.z;
          a.at = a.at === 0 ? 1 : 0;
          a.phase = "rest";
          a.timer = ANIMAL_REST;
          a.progress = 0;
          a.spooked = false;
        } else {
          a.x += (dx / left) * move;
          a.z += (dz / left) * move;
          const total = Math.hypot(to.x - from.x, to.z - from.z);
          a.progress = 1 - (left - move) / total;
        }
      } else {
        a.timer -= dt;
        if (a.timer <= 0) {
          a.phase = "wait";
          const next = a.at === 0 ? a.spec.b : a.spec.a;
          a.heading = headingOf(next.x - a.x, next.z - a.z);
        }
      }
      a.body.x = a.x;
      a.body.z = a.z;
    }
  }

  /** Cars bump into animals that are on or near their path. */
  private hitAnimals(v: VehicleState, i: number, radius: number, penalty: number): void {
    const list = this.nearAnimals;
    list.length = 0;
    for (let k = 0; k < this.animals.length; k++) {
      const a = this.animals[k];
      if (Math.abs(a.x - v.x) < 6 && Math.abs(a.z - v.z) < 6) list.push(a.body);
    }
    if (list.length === 0) return;
    const hit = resolveObstacles(v, list, radius, penalty);
    if (hit > 0) {
      for (const a of this.animals) if (a.phase === "cross" && Math.hypot(a.x - v.x, a.z - v.z) < a.spec.r + radius + 0.5) a.spooked = true;
    }
    this.noteSolid(i, hit);
  }

  private step(dt: number): void {
    this.clock += dt;
    if (this.phase === "countdown") {
      const before = Math.floor(this.countdownT);
      this.countdownT += dt;
      const now = Math.floor(this.countdownT);
      if (now > before && now < RACE.countdownSeconds) this.events.emit({ type: "countdown", n: RACE.countdownSeconds - now });
      if (this.countdownT >= RACE.countdownSeconds) {
        this.phase = "racing";
        this.time = 0;
        this.goTimer = RACE.goBannerSeconds;
        this.events.emit({ type: "go" });
      }
      return;
    }
    if (this.phase !== "racing" && this.phase !== "finished") return;

    this.time += dt;
    if (this.goTimer > 0) this.goTimer -= dt;
    this.stepWeather();
    this.stepAnimals(dt);
    for (let i = 0; i < this.vehicles.length; i++) this.stepVehicle(i, dt);
    if (this.vehicles.length > 1) this.resolveTraffic();
    this.stepWeapons(dt);
    if (this.phase === "finished") {
      this.finishedFor += dt;
      if (!this.resultsReady && this.finishedFor >= RACE.resultsDelaySeconds) this.resultsReady = true;
    }
  }

  private playerControls(finished: boolean, v: VehicleState): Controls {
    const c = this.driven;
    if (finished) {
      // Past the line: coast to a stop, steered by the road.
      c.throttle = 0;
      c.brake = v.speed > 1.5 ? 0.7 : 0;
      c.steer = 0;
      c.handbrake = false;
      c.boost = false;
      return c;
    }
    const src = this.controls;
    c.throttle = this.tuning.autoAccelerate ? (src.brake > 0 ? 0 : 1) : src.throttle;
    c.brake = src.brake;
    c.steer = src.steer;
    c.handbrake = src.handbrake;
    c.boost = src.boost;
    return c;
  }

  /** Steering help: nudges toward the road ahead, fading out as the player steers harder. */
  private assistSteer(v: VehicleState, strength: number): number {
    if (strength <= 0 || v.speed < 2 || !v.grounded) return 0;
    const q = v.query;
    if (Math.abs(angleDiff(v.heading, q.heading)) > 1.4) return 0;
    const look = clamp(9 + v.speed * 0.5, 9, 30);
    const p = this.track.sample(q.s + look);
    const err = angleDiff(headingOf(p.x - v.x, p.z - v.z), v.heading);
    return strength * clamp(-err * 1.8, -1, 1) * (1 - Math.abs(v.steer));
  }

  /** A rival's controls for this step; it also tops up its boost meter, since it collects no coins. */
  private rivalControls(i: number, ai: AiDriver, finished: boolean, dt: number): Controls {
    const v = this.vehicles[i];
    if (!v.boosting && !finished) v.boost = Math.min(1, v.boost + AI.boostCharge * dt);
    const view = this.aiView;
    view.params = this.carParams[i];
    view.difficulty = this.difficulty;
    view.gap = this.raceDistance(this.playerIndex) - this.raceDistance(i);
    view.finished = finished;
    view.self = i;
    return ai.drive(v, view, dt);
  }

  private stepVehicle(i: number, dt: number): void {
    const v = this.vehicles[i];
    const p = this.carParams[i];
    const ai = this.drivers[i];
    const prog = this.race.racers[i];
    const q = v.query;
    snapshot(v);

    if (v.wrecked > 0) {
      this.tickWreck(i, dt);
      return;
    }

    const wasBoosting = v.boosting;
    const wasDrifting = v.drifting;
    const c = ai ? this.rivalControls(i, ai, prog.finished, dt) : this.playerControls(prog.finished, v);
    const assist = ai ? 0 : this.assistSteer(v, prog.finished ? 1 : this.tuning.steeringAssist);
    const slope = this.track.hills.length > 0 ? this.track.hillSlopeAt(q.s) * Math.cos(angleDiff(v.heading, q.heading)) : 0;
    integrateDrive(v, c, p, this.track.surfaceAt(q), {
      accelScale: ai ? 1 : this.tuning.accelScale,
      assistSteer: assist,
      slope,
      gripScale: this.weather.gripScale * (v.oiled > 0 ? WEAPONS.oilGrip : 1),
      yawScale: this.weather.yawScale,
    }, dt);

    this.track.project(v.x, v.z, q.index, q);
    let ground = this.track.heightAt(q.s);
    if (v.grounded && ground - v.y > STEP_UP) {
      // Ran into the back of a ramp: bounce off it.
      v.x = v.prev.x;
      v.z = v.prev.z;
      v.vx *= -0.2;
      v.vz *= -0.2;
      v.speed = 0;
      this.track.project(v.x, v.z, q.index, q);
      ground = this.track.heightAt(q.s);
      this.emitHit("bump", i, 6);
    }
    integrateVertical(v, ground, dt, this.vertical);
    if (this.vertical.takeoff) this.events.emit({ type: "takeoff", racer: i });
    if (this.vertical.landed && this.vertical.impact > 3.5) this.events.emit({ type: "land", racer: i, impact: this.vertical.impact });

    const penalty = ai ? this.difficulty.collisionPenalty : this.tuning.collisionPenalty;
    const wall = resolveBoundary(v, q, p.radius, penalty, dt);
    if (wall > 1.2) this.emitHit("wall", i, wall);
    const near = this.obstacleGrid.queryInto(this.nearObstacles, v.x, v.z, p.radius + 5);
    if (near > 0) {
      const hit = resolveObstacles(v, this.nearObstacles, p.radius, penalty);
      this.noteSolid(i, hit);
    }
    if (this.animals.length > 0) this.hitAnimals(v, i, p.radius, penalty);
    if (this.hitCooldown[i] > 0) this.hitCooldown[i] -= dt;
    if (v.grace > 0) v.grace -= dt;

    // Speed shown to HUD / physics follows the (possibly collided) velocity.
    v.speed = v.vx * Math.sin(v.heading) + v.vz * Math.cos(v.heading);

    this.race.update(i, q.s, q.lateral, this.time, ai ? AI.gateScale : this.tuning.gateScale, this.onProgress);

    if (v.boosting !== wasBoosting) this.events.emit({ type: v.boosting ? "boostStart" : "boostEnd", racer: i });
    if (v.drifting !== wasDrifting) {
      if (v.drifting) {
        v.driftCharge = 0;
        this.events.emit({ type: "driftStart", racer: i });
      } else {
        this.events.emit({ type: "driftEnd", racer: i, charge: v.driftCharge });
      }
    }

    if (ai) {
      this.watchRival(i, v, dt);
    } else if (!prog.finished) {
      this.collectPickups(v, i);
      this.collectWeapons(v);
      this.watchProgress(v, c, dt);
    }
  }

  /** Cars shove each other apart. The player's car is heavier the more help they have, so a bump never ruins a little one's race. */
  private resolveTraffic(): void {
    const n = this.vehicles.length;
    const playerWeight = 1 / Math.max(0.35, this.tuning.collisionPenalty);
    for (let i = 0; i < n; i++) {
      const a = this.vehicles[i];
      if (a.grace > 0 || a.wrecked > 0) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.vehicles[j];
        if (b.grace > 0 || b.wrecked > 0) continue;
        const ra = this.radii[i];
        const rb = this.radii[j];
        const ma = ra * ra * (i === this.playerIndex ? playerWeight : 1);
        const mb = rb * rb * (j === this.playerIndex ? playerWeight : 1);
        const hit = resolveCars(a, ra, ma, b, rb, mb);
        if (hit <= 0) continue;
        a.speed = a.vx * Math.sin(a.heading) + a.vz * Math.cos(a.heading);
        b.speed = b.vx * Math.sin(b.heading) + b.vz * Math.cos(b.heading);
        this.noteCars(i, j, hit);
      }
    }
  }

  /** A hard hit on an animal or a roadside obstacle wrecks the car. Anything softer is a bump. The boundary wall is not a crash. */
  private noteSolid(i: number, impact: number): void {
    if (impact <= 0 || this.vehicles[i].wrecked > 0) return;
    if (this.vehicles[i].grace <= 0 && impact >= this.crashMin(i, "solid")) {
      this.wreck(i);
      return;
    }
    if (impact > 1.2) this.emitHit("bump", i, impact);
  }

  /** A hard car-to-car hit wrecks both. A side nudge stays a bump. */
  private noteCars(i: number, j: number, impact: number): void {
    const wreckI = this.vehicles[i].grace <= 0 && this.vehicles[i].wrecked <= 0 && impact >= this.crashMin(i, "car");
    const wreckJ = this.vehicles[j].grace <= 0 && this.vehicles[j].wrecked <= 0 && impact >= this.crashMin(j, "car");
    if (wreckI) this.wreck(i);
    else if (impact > 2) this.emitHit("bump", i, impact);
    if (wreckJ) this.wreck(j);
    else if (impact > 2) this.emitHit("bump", j, impact);
  }

  private crashMin(i: number, kind: "solid" | "car"): number {
    const base = kind === "car" ? CRASH.carImpact : CRASH.obstacleImpact;
    if (i !== this.playerIndex) return base;
    if (this.assist === "extra") return base * CRASH.extraImpactScale;
    if (this.assist === "helper") return base * CRASH.helperImpactScale;
    return base;
  }

  private recoverFor(i: number): number {
    if (i !== this.playerIndex) return CRASH.recoverSeconds * CRASH.rivalRecoverScale;
    if (this.assist === "extra") return CRASH.recoverSeconds * CRASH.extraRecoverScale;
    if (this.assist === "helper") return CRASH.recoverSeconds * CRASH.helperRecoverScale;
    return CRASH.recoverSeconds;
  }

  /**
   * Stop the car where it crashed: a few metres back along the road, still in its lane,
   * facing the right way. It sits, then the driver has to get going again. This is not
   * a checkpoint reset.
   */
  private wreck(i: number): void {
    const v = this.vehicles[i];
    if (v.wrecked > 0 || v.grace > 0) return;
    const q = v.query;
    const back = this.track.sample(q.s - CRASH.settleBack);
    const margin = this.carParams[i].radius + 0.8;
    const limit = Math.max(1, back.halfWidth - margin);
    const lat = clamp(q.lateral, -limit, limit);
    const keepBoost = v.boost;
    placeVehicle(v, back.x - back.tz * lat, back.z + back.tx * lat, back.heading);
    v.boost = keepBoost;
    v.wrecked = this.recoverFor(i);
    v.grace = 0;
    this.track.projectGlobal(v.x, v.z, v.query);
    v.y = this.track.heightAt(v.query.s);
    snapshot(v);
    this.race.teleport(i, v.query.s);
    if (i === this.playerIndex) {
      this.stuck = false;
      this.wrongWay = false;
    }
    this.events.emit({ type: "crash", racer: i });
  }

  /** Holds a wrecked car still. When the timer ends it may drive, with a short grace so the same hit does not wreck it again. */
  private tickWreck(i: number, dt: number): void {
    const v = this.vehicles[i];
    v.wrecked = Math.max(0, v.wrecked - dt);
    v.vx = 0;
    v.vz = 0;
    v.vy = 0;
    v.speed = 0;
    v.yawRate = 0;
    v.boosting = false;
    if (v.wrecked === 0) {
      v.heading = v.query.heading;
      v.grace = CRASH.graceSeconds;
      snapshot(v);
    }
  }

  /** A rival that is stuck or facing the wrong way goes back to its last gate. */
  private watchRival(i: number, v: VehicleState, dt: number): void {
    if (this.phase !== "racing" && this.phase !== "finished") return;
    if (v.grounded && Math.abs(v.speed) < RACE.stuckSpeed) v.stuckTime += dt;
    else v.stuckTime = Math.max(0, v.stuckTime - dt * 2);
    const q = v.query;
    if (v.vx * q.tx + v.vz * q.tz < -2) v.wrongWayTime += dt;
    else v.wrongWayTime = Math.max(0, v.wrongWayTime - dt * 2);
    if (v.stuckTime > AI.stuckSeconds || v.wrongWayTime > AI.stuckSeconds) this.respawnCar(i, true);
  }

  private stepWeather(): void {
    this.weather = this.weatherPlan.at(this.time);
    if (this.weather.kind === "none") return;
    const heavy = weatherIsHeavy(this.weather.intensity);
    if (heavy === this.weatherHeavy) return;
    this.weatherHeavy = heavy;
    this.events.emit({ type: "weather", kind: this.weather.kind, heavy });
  }

  private emitHit(type: "wall" | "bump", racer: number, impact: number): void {
    if (this.hitCooldown[racer] > 0) return;
    this.hitCooldown[racer] = HIT_COOLDOWN;
    this.events.emit({ type, racer, impact });
  }

  private collectPickups(v: VehicleState, racer: number): void {
    const found = this.pickupGrid.queryInto(this.nearPickups, v.x, v.z, PICKUP.gemRadius + 1);
    for (let i = 0; i < found; i++) {
      const c = this.nearPickups[i];
      if (this.collected[c.id]) continue;
      const r = c.kind === "gem" ? PICKUP.gemRadius : PICKUP.coinRadius;
      const dx = v.x - c.x;
      const dz = v.z - c.z;
      if (dx * dx + dz * dz > r * r) continue;
      if (Math.abs(c.y - (v.y + 1.1)) > 2.4) continue;
      this.collected[c.id] = 1;
      if (c.kind === "coin") {
        this.coins += PICKUP.coinValue;
        v.boost = Math.min(1, v.boost + this.params.coinCharge);
        this.events.emit({ type: "coin", id: c.id, racer, total: this.coins });
      } else {
        this.gems += PICKUP.gemValue;
        this.events.emit({ type: "gem", id: c.id, racer, total: this.gems });
      }
    }
  }

  /** Driving over a weapon icon adds one charge and selects that weapon. */
  private collectWeapons(v: VehicleState): void {
    const list = this.content.weapons;
    const r = WEAPONS.pickupRadius;
    for (let i = 0; i < list.length; i++) {
      if (this.crateTaken[i]) continue;
      const c = list[i];
      const dx = v.x - c.x;
      const dz = v.z - c.z;
      if (dx * dx + dz * dz > r * r) continue;
      if (Math.abs(c.y - (v.y + 1.1)) > 3) continue;
      this.crateTaken[i] = 1;
      this.ammo[c.kind] = Math.min(WEAPONS.maxAmmo, this.ammo[c.kind] + 1);
      this.weapon = c.kind;
      this.events.emit({ type: "weaponPickup", id: i, kind: c.kind, ammo: this.ammo[c.kind], racer: this.playerIndex });
    }
  }

  /** Q/E or 1/2/3 select a weapon. F uses the selected one. */
  weaponAction(action: WeaponAction): void {
    if (action === "prev" || action === "next") {
      const kinds = WEAPONS.kinds;
      const i = kinds.indexOf(this.weapon);
      const step = action === "next" ? 1 : kinds.length - 1;
      this.weapon = kinds[(i + step) % kinds.length];
      this.pushHud();
      return;
    }
    if (action === "gun" || action === "mine" || action === "oil") {
      this.weapon = action;
      this.pushHud();
      return;
    }
    if (this.phase !== "racing" && this.phase !== "finished") return;
    if (this.player.wrecked > 0) return;
    const kind = this.weapon;
    if (this.ammo[kind] <= 0) {
      this.events.emit({ type: "weaponEmpty", kind });
      return;
    }
    this.ammo[kind] -= 1;
    this.deploy(kind, this.playerIndex);
    this.events.emit({ type: "weaponFire", kind, ammo: this.ammo[kind], racer: this.playerIndex });
    this.pushHud();
  }

  private deploy(kind: WeaponKind, owner: number): void {
    const v = this.vehicles[owner];
    const hx = Math.sin(v.heading);
    const hz = Math.cos(v.heading);
    if (kind === "gun") {
      if (this.shots.length >= 8) this.shots.shift();
      const nose = this.radii[owner] + 1.3;
      this.shots.push({
        owner,
        x: v.x + hx * nose,
        y: v.y + 0.85,
        z: v.z + hz * nose,
        vx: hx * WEAPONS.gunSpeed,
        vz: hz * WEAPONS.gunSpeed,
        life: WEAPONS.gunLife,
      });
      return;
    }
    const back = kind === "mine" ? WEAPONS.mineBehind : WEAPONS.oilBehind;
    const x = v.x - hx * back;
    const z = v.z - hz * back;
    if (kind === "mine") {
      if (this.mines.length >= 8) this.mines.shift();
      this.mines.push({ owner, x, y: v.y, z, arm: WEAPONS.mineArm, life: WEAPONS.mineLife });
      return;
    }
    if (this.slicks.length >= 8) this.slicks.shift();
    this.slicks.push({ x, y: v.y + 0.06, z, life: WEAPONS.oilLife });
  }

  /** Bolts, mines and oil. A bolt or an armed mine wrecks the car it touches. */
  private stepWeapons(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.z += s.vz * dt;
      const hit = this.weaponTarget(s.owner, s.x, s.y, s.z, WEAPONS.gunRadius);
      if (hit >= 0) {
        this.shots.splice(i, 1);
        this.events.emit({ type: "weaponHit", shooter: s.owner, target: hit, kind: "gun" });
        this.wreck(hit);
        continue;
      }
      if (s.life <= 0) this.shots.splice(i, 1);
    }
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.arm -= dt;
      m.life -= dt;
      if (m.life <= 0) {
        this.mines.splice(i, 1);
        continue;
      }
      if (m.arm > 0) continue;
      const hit = this.weaponTarget(-1, m.x, m.y, m.z, WEAPONS.mineRadius);
      if (hit >= 0) {
        this.mines.splice(i, 1);
        this.events.emit({ type: "weaponHit", shooter: m.owner, target: hit, kind: "mine" });
        this.wreck(hit);
      }
    }
    for (let i = this.slicks.length - 1; i >= 0; i--) {
      this.slicks[i].life -= dt;
      if (this.slicks[i].life <= 0) this.slicks.splice(i, 1);
    }
    const slickR = WEAPONS.oilRadius;
    for (let c = 0; c < this.vehicles.length; c++) {
      const v = this.vehicles[c];
      let onSlick = false;
      for (let i = 0; i < this.slicks.length; i++) {
        const sl = this.slicks[i];
        const dx = v.x - sl.x;
        const dz = v.z - sl.z;
        if (dx * dx + dz * dz <= slickR * slickR) {
          onSlick = true;
          break;
        }
      }
      if (onSlick) {
        if (v.oiled <= 0 && c === this.playerIndex) this.events.emit({ type: "oil", racer: c });
        v.oiled = WEAPONS.oilSeconds;
      } else if (v.oiled > 0) {
        v.oiled = Math.max(0, v.oiled - dt);
      }
    }
  }

  /** The first car close to a point, skipping the owner (pass -1 to include every car) and cars that are already safe or wrecked. */
  private weaponTarget(owner: number, x: number, y: number, z: number, extra: number): number {
    for (let c = 0; c < this.vehicles.length; c++) {
      if (c === owner) continue;
      const v = this.vehicles[c];
      if (v.grace > 0 || v.wrecked > 0) continue;
      if (Math.abs(v.y - y) > 2.4) continue;
      const dx = v.x - x;
      const dz = v.z - z;
      const rad = this.radii[c] + extra;
      if (dx * dx + dz * dz <= rad * rad) return c;
    }
    return -1;
  }

  private clearWeapons(): void {
    this.ammo.gun = 0;
    this.ammo.mine = 0;
    this.ammo.oil = 0;
    this.weapon = "gun";
    this.shots.length = 0;
    this.mines.length = 0;
    this.slicks.length = 0;
    this.crateTaken.fill(0);
  }

  /** Stuck rescue and wrong-way warning for the player. */
  private watchProgress(v: VehicleState, c: Controls, dt: number): void {
    const trying = c.throttle > 0 || c.brake > 0;
    if (this.phase === "racing" && trying && v.grounded && Math.abs(v.speed) < RACE.stuckSpeed) v.stuckTime += dt;
    else v.stuckTime = Math.max(0, v.stuckTime - dt * 2);
    if (v.stuckTime > RACE.stuckSeconds) {
      if (this.tuning.autoRecover) {
        this.respawnPlayer(true);
        return;
      }
      this.stuck = true;
    } else if (v.stuckTime < 0.2) {
      this.stuck = false;
    }

    const q = v.query;
    const along = v.vx * q.tx + v.vz * q.tz;
    if (along < -3) v.wrongWayTime += dt;
    else v.wrongWayTime = Math.max(0, v.wrongWayTime - dt * 2);
    this.wrongWay = v.wrongWayTime > RACE.wrongWaySeconds;
  }

  private respawnPlayer(auto: boolean): void {
    this.respawnCar(this.playerIndex, auto);
    this.stuck = false;
    this.wrongWay = false;
  }

  private respawnCar(i: number, auto: boolean): void {
    const v = this.vehicles[i];
    const r = this.race.racers[i];
    const pose = this.track.respawnPose(r.lastCheckpoint, r.passed > 0, this.slots[i]);
    const keepBoost = v.boost;
    placeVehicle(v, pose.x, pose.z, pose.heading);
    v.boost = keepBoost;
    this.track.projectGlobal(v.x, v.z, v.query);
    v.y = this.track.heightAt(v.query.s);
    snapshot(v);
    this.race.teleport(i, v.query.s);
    v.grace = RACE.respawnGraceSeconds;
    this.events.emit({ type: "respawn", racer: i, auto });
  }

  private handleProgress(e: ProgressEvent): void {
    switch (e.type) {
      case "checkpoint":
        this.events.emit({ type: "checkpoint", racer: e.racer, index: e.index });
        break;
      case "lap":
        this.events.emit({ type: "lap", racer: e.racer, lap: e.lap, lapTime: e.lapTime, best: e.best });
        // Pickups come back every lap.
        if (e.racer === this.playerIndex && e.lap < this.race.laps) {
          this.collected.fill(0);
          this.crateTaken.fill(0);
          this.events.emit({ type: "coinsReset" });
          this.events.emit({ type: "weaponsReset" });
        }
        break;
      case "finish":
        this.events.emit({ type: "finish", racer: e.racer, place: e.place, time: e.time });
        if (e.racer === this.playerIndex) {
          this.phase = "finished";
          this.finishedFor = 0;
          this.stuck = false;
          this.wrongWay = false;
        }
        break;
    }
  }
}
