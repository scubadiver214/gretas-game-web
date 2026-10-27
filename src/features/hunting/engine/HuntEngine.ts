import { Emitter } from "@/lib/game/events";
import { seededRng, type Rng } from "@/lib/rng";
import { AIM, CAMERA_ZOOMS, COUNTDOWN_SECONDS, EYE, FLIGHT, SCORE, SHOTGUN, STEP } from "../config";
import { EXPLORE_LEVEL, type LevelDef, type SpawnFrom } from "../levels";
import type { Animal, Duck, HudSnapshot, HuntEvent, HuntSummary, Phase, Tool, WeaponState } from "../types";
import { clampAim, dirFromAim, aimFromDir, fovFor, type Aim } from "./aim";
import { NO_BOOST, type AdaptiveBoost, type DifficultyPreset } from "./difficulty";
import { isAirborne, spawnDuck, spawnOrigin, startle, stepDuck, type FlightTuning } from "./flight";
import { evaluatePhoto, type PhotoSubject } from "./photo";
import { comboMultiplier, endBonuses, hitPoints, multiBonus, starsFor } from "./scoring";
import { assistTarget, pelletDirections, raySphere, rayPointDistance, resolveShot } from "./shooting";
import { animalCenter, createWildlife, startleNear, stepWildlife } from "./wildlife";
import { clamp, dist, wrapAngle } from "./vec";

export interface EngineOptions {
  level: LevelDef;
  difficulty: DifficultyPreset;
  boost?: AdaptiveBoost;
  /** The player's aim-assist toggle (on top of the difficulty's strength). */
  assist?: boolean;
  seed?: string;
}

const ACTION_POSES = new Set(["fly", "hover", "dive", "hop", "strike"]);
const between = (rng: Rng, r: readonly [number, number]) => r[0] + (r[1] - r[0]) * rng();

/** Flocks that cross the sky behind the menu and in Explorer mode. */
function ambientTuning(level: LevelDef): FlightTuning {
  const base = level.activity === "explore" ? level.duck : EXPLORE_LEVEL.duck;
  return { ...base, hitRadius: FLIGHT.baseHitRadius };
}

/**
 * The whole hunt as plain data: no React, no three.js. The renderer reads `aim`,
 * `ducks`, `wildlife` and the weapon fields every frame; the UI gets a HUD
 * snapshot when something it shows changes, and sounds/effects come from `events`.
 */
export class HuntEngine {
  readonly events = new Emitter<HuntEvent>();

  level!: LevelDef;
  difficulty!: DifficultyPreset;
  boost: AdaptiveBoost = NO_BOOST;
  private assistOn = true;
  private tuning!: FlightTuning;
  private ambient!: FlightTuning;
  private rng: Rng;

  phase: Phase = "ready";
  private pausedFrom: Phase = "playing";
  aim: Aim = { yaw: 0, pitch: AIM.restPitch };
  tool: Tool = "shotgun";
  ads = false;
  zoomIndex = 0;

  mag: number = SHOTGUN.magazine;
  reserve: number | null = null;
  weapon: WeaponState = "ready";
  weaponT = 0;
  weaponLen = 0;
  private pendingTool: Tool = "shotgun";
  private queuedFire = false;
  private ejected = false;
  private pumped = false;
  private photoCooldown = 0;

  ducks: Duck[] = [];
  wildlife: Animal[] = [];
  /** Seconds since construction; drives idle animation in the renderer. */
  clock = 0;
  elapsed = 0;
  timeLimit: number | null = null;

  score = 0;
  shots = 0;
  hitShots = 0;
  hits = 0;
  streak = 0;
  bestStreak = 0;
  doubles = 0;
  multiShots = 0;
  escaped = 0;
  spawned = 0;
  photos = 0;
  protectedHits = 0;

  onTarget = false;
  private framing: HudSnapshot["framing"] = null;
  private framingT = 0;
  private flightSize = new Map<number, number>();
  private flightHits = new Map<number, number>();
  private doubledFlights = new Set<number>();
  private hitDucks = new Set<number>();
  private waveIndex = 0;
  private waveDelay = 0;
  private spawnTimer = 0;
  private nextFlight = 1;
  private nextDuckId = 1;
  private countdownLeft = 0;
  private lastCount = 0;
  private warned = false;
  private objectiveAnnounced = false;
  private endTimer = -1;
  private outOfAmmo = false;
  private lastLook = -10;
  private stick = { x: 0, y: 0 };
  private aspect = 16 / 9;
  private acc = 0;
  private result: HuntSummary | null = null;
  private hudCb: ((h: HudSnapshot) => void) | null = null;
  private lastHudKey = "";

  constructor(opts: EngineOptions) {
    this.rng = seededRng(opts.seed ?? `${Date.now()}:${Math.random()}`);
    this.configure(opts);
  }

  /** Swap level / difficulty and go back to the idle menu state. */
  configure(opts: EngineOptions): void {
    this.level = opts.level;
    this.difficulty = opts.difficulty;
    this.boost = opts.boost ?? NO_BOOST;
    this.assistOn = opts.assist ?? true;
    const d = this.difficulty;
    const b = this.boost;
    const L = this.level.duck;
    const explore = this.level.activity === "explore";
    this.tuning = {
      ...L,
      speed: L.speed * (explore ? 1 : d.speedMul * b.speedMul),
      size: L.size * (explore ? 1 : d.sizeMul * b.sizeMul),
      jink: L.jink * (explore ? 1 : d.jinkMul * b.jinkMul),
      hitRadius: FLIGHT.baseHitRadius * L.size * d.hitMul * b.sizeMul,
    };
    this.ambient = ambientTuning(this.level);
    this.reset();
  }

  get assistStrength(): number {
    return this.assistOn ? clamp(this.difficulty.assist + this.boost.assistAdd, 0, 1) : 0;
  }

  get explore(): boolean {
    return this.level.activity === "explore";
  }

  get zoom(): number {
    return this.tool === "camera" ? CAMERA_ZOOMS[this.zoomIndex] : 1;
  }

  /** Vertical FOV (degrees) the camera should use right now. */
  get fov(): number {
    return fovFor(this.zoom, this.tool === "shotgun" && this.ads);
  }

  setAssist(on: boolean): void {
    this.assistOn = on;
  }

  setViewport(aspect: number): void {
    if (aspect > 0 && Number.isFinite(aspect)) this.aspect = aspect;
  }

  onHud(cb: ((h: HudSnapshot) => void) | null): void {
    this.hudCb = cb;
    this.lastHudKey = "";
    if (cb) this.pushHud();
  }

  /** Idle state behind the menus: wildlife going about its day, the odd flock passing. */
  reset(): void {
    this.phase = "ready";
    this.ducks = [];
    this.wildlife = createWildlife(this.rng, { explore: this.explore });
    this.clearStats();
    this.spawnTimer = 2 + this.rng() * 4;
    this.pushHud();
  }

  private clearStats(): void {
    const d = this.difficulty;
    const b = this.boost;
    this.timeLimit = this.level.timeLimit === null ? null : Math.round(this.level.timeLimit * d.timeMul * b.timeMul);
    this.reserve = this.level.reserve === null ? null : this.level.reserve + d.reserveBonus;
    this.mag = SHOTGUN.magazine;
    this.weapon = "ready";
    this.weaponT = 0;
    this.weaponLen = 0;
    this.queuedFire = false;
    this.tool = this.explore ? "camera" : "shotgun";
    this.pendingTool = this.tool;
    this.ads = false;
    this.zoomIndex = 0;
    this.aim = { yaw: 0, pitch: AIM.restPitch };
    this.elapsed = 0;
    this.score = 0;
    this.shots = 0;
    this.hitShots = 0;
    this.hits = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.doubles = 0;
    this.multiShots = 0;
    this.escaped = 0;
    this.spawned = 0;
    this.photos = 0;
    this.protectedHits = 0;
    this.flightSize.clear();
    this.flightHits.clear();
    this.doubledFlights.clear();
    this.hitDucks.clear();
    this.waveIndex = 0;
    this.waveDelay = this.level.flights.kind === "waves" ? this.level.flights.waves[0]?.delay ?? 1 : 0;
    this.spawnTimer = this.level.flights.kind === "continuous" ? (this.explore ? 3 : 0.8) : 0;
    this.warned = false;
    this.objectiveAnnounced = false;
    this.endTimer = -1;
    this.outOfAmmo = false;
    this.result = null;
    this.framing = null;
    this.onTarget = false;
  }

  /** Start (or restart) the level: countdown, then ducks. Explorer mode skips the countdown. */
  start(): void {
    this.ducks = [];
    this.clearStats();
    if (this.explore) {
      this.phase = "playing";
      this.events.emit({ type: "go" });
    } else {
      this.phase = "countdown";
      this.countdownLeft = COUNTDOWN_SECONDS;
      this.lastCount = 3;
      this.events.emit({ type: "countdown", n: 3 });
    }
    this.pushHud();
  }

  pause(): void {
    if (this.phase !== "playing" && this.phase !== "countdown") return;
    this.pausedFrom = this.phase;
    this.phase = "paused";
    this.stick = { x: 0, y: 0 };
    this.pushHud();
  }

  resume(): void {
    if (this.phase !== "paused") return;
    this.phase = this.pausedFrom;
    this.pushHud();
  }

  togglePause(): void {
    if (this.phase === "paused") this.resume();
    else this.pause();
  }

  private get canAct(): boolean {
    return this.phase === "playing" || this.phase === "countdown";
  }

  /** Turn the view by radians (input already applied sensitivity). Zoom slows it down. */
  look(dYaw: number, dPitch: number): void {
    if (!this.canAct) return;
    let k = this.fov / fovFor(1, false);
    if (this.onTarget && this.assistStrength > 0) k *= 1 - 0.45 * this.assistStrength;
    this.aim = clampAim({ yaw: this.aim.yaw + dYaw * k, pitch: this.aim.pitch + dPitch * k });
    this.lastLook = this.clock;
  }

  /** Held keys / virtual stick, -1..1 on each axis (x right, y up). */
  setStick(x: number, y: number): void {
    this.stick = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
  }

  setAds(on: boolean): void {
    if (this.tool !== "shotgun") return;
    const next = on && this.canAct;
    if (next === this.ads) return;
    this.ads = next;
    this.events.emit({ type: "ads", on: next });
  }

  setZoom(index: number): void {
    if (this.tool !== "camera") return;
    const i = clamp(Math.round(index), 0, CAMERA_ZOOMS.length - 1);
    if (i === this.zoomIndex) return;
    this.zoomIndex = i;
    this.events.emit({ type: "zoom", zoom: CAMERA_ZOOMS[i] });
    this.pushHud();
  }

  cycleZoom(): void {
    this.setZoom((this.zoomIndex + 1) % CAMERA_ZOOMS.length);
  }

  swapTool(to?: Tool): void {
    if (this.explore || !this.canAct || this.weapon === "swapping") return;
    const target = to ?? (this.tool === "shotgun" ? "camera" : "shotgun");
    if (target === this.tool) return;
    this.ads = false;
    this.zoomIndex = 0;
    this.queuedFire = false;
    this.weapon = "swapping";
    this.weaponT = 0;
    this.weaponLen = SHOTGUN.swapTime;
    this.pendingTool = target;
    this.pushHud();
  }

  private get canReload(): boolean {
    return this.mag < SHOTGUN.magazine && (this.reserve === null || this.reserve > 0);
  }

  reload(): void {
    if (this.phase !== "playing" || this.tool !== "shotgun" || this.weapon !== "ready" || !this.canReload) return;
    this.weapon = "reloading";
    this.weaponT = 0;
    this.weaponLen = SHOTGUN.reloadStart + SHOTGUN.reloadPerShell;
    this.events.emit({ type: "reloadStart" });
    this.pushHud();
  }

  /** Pull the trigger (shotgun) or press the shutter (camera). */
  fire(): void {
    if (this.phase !== "playing" || this.weapon === "swapping") return;
    if (this.tool === "camera") {
      this.takePhoto();
      return;
    }
    if (this.weapon === "pumping") {
      if (this.weaponLen - this.weaponT <= SHOTGUN.fireBuffer) this.queuedFire = true;
      return;
    }
    if (this.weapon === "reloading") {
      if (this.mag <= 0) return;
      this.weapon = "ready";
      this.events.emit({ type: "reloadDone" });
    }
    if (this.mag <= 0) {
      this.events.emit({ type: "dryFire" });
      this.reload();
      return;
    }
    this.mag--;
    this.shots++;
    const dir = dirFromAim(this.aim);
    const cone = (this.ads ? SHOTGUN.adsSpread : SHOTGUN.spread) * this.difficulty.spreadMul;
    const pellets = pelletDirections(dir, SHOTGUN.pellets, cone, this.rng);
    const live = this.ducks.filter((d) => d.target && isAirborne(d));
    const hitIds = resolveShot(EYE, pellets, live.map((d) => ({ id: d.id, pos: d.pos, radius: d.radius })), SHOTGUN.range);
    this.events.emit({ type: "shot", tool: "shotgun" });
    this.weapon = "pumping";
    this.weaponT = 0;
    this.weaponLen = SHOTGUN.pumpTime;
    this.ejected = false;
    this.pumped = false;

    if (hitIds.length > 0) this.registerHits(hitIds);
    else {
      this.streak = 0;
      if (!this.checkProtected(pellets)) this.events.emit({ type: "miss" });
    }
    for (const d of live) {
      if (!this.hitDucks.has(d.id) && rayPointDistance(EYE, dir, d.pos) < FLIGHT.startleDistance) startle(d, this.rng, this.tuning);
    }
    startleNear(this.wildlife, EYE, dir, this.rng, (e) => this.events.emit(e));
    this.checkAmmo();
    this.pushHud();
  }

  private registerHits(ids: number[]): void {
    this.hitShots++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    let total = 0;
    let last = EYE;
    for (const id of ids) {
      const duck = this.ducks.find((d) => d.id === id);
      if (!duck) continue;
      const distance = dist(EYE, duck.pos);
      const points = hitPoints(distance, this.streak);
      total += points;
      this.hits++;
      this.hitDucks.add(id);
      duck.phase = "hit";
      duck.phaseT = 0;
      last = duck.pos;
      const n = (this.flightHits.get(duck.flight) ?? 0) + 1;
      this.flightHits.set(duck.flight, n);
      if (n >= 2 && !this.doubledFlights.has(duck.flight)) {
        this.doubledFlights.add(duck.flight);
        this.doubles++;
      }
      this.events.emit({ type: "hit", duckId: id, pos: { ...duck.pos }, points, streak: this.streak, multiplier: comboMultiplier(this.streak), long: distance >= SCORE.longDistance });
    }
    if (ids.length >= 2) {
      const bonus = multiBonus(ids.length);
      total += bonus;
      this.multiShots++;
      this.events.emit({ type: "multi", count: ids.length, points: bonus, pos: { ...last } });
    }
    this.score += total;
    this.checkObjective();
  }

  /** A pellet that found protected wildlife (and no duck) gets a gentle telling-off. */
  private checkProtected(pellets: readonly { x: number; y: number; z: number }[]): boolean {
    for (const a of this.wildlife) {
      if (!a.visible) continue;
      const c = animalCenter(a);
      for (const p of pellets) {
        const t = raySphere(EYE, p, c, a.radius);
        if (t !== null && t <= SHOTGUN.range) {
          const penalty = Math.min(this.score, this.difficulty.protectedPenalty);
          this.score -= penalty;
          this.protectedHits++;
          this.events.emit({ type: "protected", species: a.species, pos: c, penalty });
          return true;
        }
      }
    }
    return false;
  }

  get objectiveProgress(): number {
    const o = this.level.objective;
    return o.kind === "hits" ? this.hits : o.kind === "doubles" ? this.doubles : 0;
  }

  get objectiveMet(): boolean {
    const o = this.level.objective;
    return o.kind === "none" || this.objectiveProgress >= o.count;
  }

  private checkObjective(): void {
    if (this.objectiveAnnounced || this.level.objective.kind === "none" || !this.objectiveMet) return;
    this.objectiveAnnounced = true;
    this.events.emit({ type: "objective" });
  }

  private checkAmmo(): void {
    if (this.outOfAmmo || this.reserve === null) return;
    if (this.reserve <= 0 && this.mag <= 0) {
      this.outOfAmmo = true;
      this.events.emit({ type: "outOfAmmo" });
      if (this.endTimer < 0) this.endTimer = 1.4;
    }
  }

  private photoSubjects(): PhotoSubject[] {
    const out: PhotoSubject[] = [];
    for (const a of this.wildlife) {
      if (a.visible) out.push({ species: a.species, center: animalCenter(a), radius: a.radius, action: ACTION_POSES.has(a.action) });
    }
    for (const d of this.ducks) {
      if (isAirborne(d)) out.push({ species: "mallard", center: d.pos, radius: 0.45 * d.size, action: true });
    }
    return out;
  }

  private takePhoto(): void {
    if (this.photoCooldown > 0) return;
    this.photoCooldown = SHOTGUN.photoCooldown;
    this.photos++;
    const result = evaluatePhoto(EYE, this.aim, (this.fov * Math.PI) / 180, this.aspect, this.photoSubjects());
    this.events.emit({ type: "shot", tool: "camera" });
    this.events.emit({ type: "photo", result });
    this.pushHud();
  }

  /** Explorer mode has no clock: the player ends it from the pause menu. */
  finishExplore(): void {
    if (!this.explore || (this.phase !== "playing" && this.phase !== "paused")) return;
    this.finish();
  }

  private spawnFlight(size: number, from: SpawnFrom, target: boolean): void {
    const tuning = target ? this.tuning : this.ambient;
    const kind = from === "any" ? (this.rng() < 0.5 ? "reeds" : "side") : from;
    const side = this.rng() < 0.5 ? 1 : -1;
    const origin = spawnOrigin(kind, this.rng, side);
    const flight = this.nextFlight++;
    const size0 = target ? tuning.size : this.ambient.size;
    const leader = spawnDuck({ id: this.nextDuckId++, flight, from: kind, rng: this.rng, tuning, target, origin, side, size: size0 });
    this.ducks.push(leader);
    for (let i = 1; i < size; i++) {
      this.ducks.push(spawnDuck({ id: this.nextDuckId++, flight, from: kind, rng: this.rng, tuning, target, origin, side, leader, slot: i, size: size0 }));
    }
    this.flightSize.set(flight, size);
    if (target) this.spawned += size;
    if (kind === "reeds") this.events.emit({ type: "takeoff", pos: { x: origin.x, y: 0, z: origin.z } });
  }

  private stepSpawns(h: number): void {
    const plan = this.level.flights;
    if (this.phase === "done") return;
    if (this.phase === "ready") {
      this.spawnTimer -= h;
      if (this.spawnTimer <= 0) {
        this.spawnFlight(2 + Math.floor(this.rng() * 3), "side", false);
        this.spawnTimer = between(this.rng, FLIGHT.ambientInterval);
      }
      return;
    }
    if (this.phase !== "playing") return;
    const target = !this.explore;
    if (plan.kind === "waves") {
      const active = this.ducks.some((d) => d.target && d.phase !== "gone");
      if (active) return;
      if (this.waveIndex < plan.waves.length) {
        this.waveDelay -= h;
        if (this.waveDelay <= 0) {
          const w = plan.waves[this.waveIndex++];
          this.spawnFlight(w.size, w.from, target);
          this.waveDelay = plan.waves[this.waveIndex]?.delay ?? 0;
        }
      } else if (this.endTimer < 0) this.endTimer = 1.1;
      return;
    }
    this.spawnTimer -= h;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = between(this.rng, plan.interval);
    const airborne = this.ducks.filter((d) => d.target === target && isAirborne(d)).length;
    const room = Math.min(plan.maxAirborne - airborne, plan.maxDucks - this.spawned);
    if (room <= 0) return;
    const want = Math.round(between(this.rng, [plan.size[0], plan.size[1]]));
    this.spawnFlight(Math.max(1, Math.min(want, room)), plan.from, target);
  }

  private stepWeapon(h: number): void {
    this.photoCooldown = Math.max(0, this.photoCooldown - h);
    if (this.weapon === "ready") return;
    this.weaponT += h;
    if (this.weapon === "pumping") {
      if (!this.pumped && this.weaponT >= 0.09) {
        this.pumped = true;
        this.events.emit({ type: "pump" });
      }
      if (!this.ejected && this.weaponT >= 0.17) {
        this.ejected = true;
        this.events.emit({ type: "eject" });
      }
      if (this.weaponT >= this.weaponLen) {
        this.weapon = "ready";
        if (this.queuedFire) {
          this.queuedFire = false;
          this.fire();
        } else if (this.mag === 0 && this.canReload) this.reload();
      }
    } else if (this.weapon === "reloading") {
      if (this.weaponT >= this.weaponLen) {
        this.mag++;
        if (this.reserve !== null) this.reserve--;
        this.events.emit({ type: "shellIn" });
        if (this.canReload) {
          this.weaponT = 0;
          this.weaponLen = SHOTGUN.reloadPerShell;
        } else {
          this.weapon = "ready";
          this.events.emit({ type: "reloadDone" });
        }
      }
    } else if (this.weapon === "swapping") {
      if (this.tool !== this.pendingTool && this.weaponT >= this.weaponLen / 2) {
        this.tool = this.pendingTool;
        this.events.emit({ type: "swap", tool: this.tool });
      }
      if (this.weaponT >= this.weaponLen) this.weapon = "ready";
    }
  }

  private stepAim(h: number): void {
    if (this.phase === "ready") {
      this.aim = { yaw: 0.3 * Math.sin(this.clock * 0.06), pitch: AIM.restPitch + 0.035 * Math.sin(this.clock * 0.09) };
      return;
    }
    if (this.phase === "done") {
      // Drift back to the lake view behind the results card.
      const k = Math.min(1, h * 1.2);
      this.aim = { yaw: this.aim.yaw * (1 - k), pitch: this.aim.pitch + (AIM.restPitch - this.aim.pitch) * k };
      return;
    }
    if (!this.canAct) return;
    if (this.stick.x !== 0 || this.stick.y !== 0) this.look(-this.stick.x * AIM.stick * h, this.stick.y * AIM.stick * h);
    const dir = dirFromAim(this.aim);
    const targets = this.ducks.filter((d) => d.target && isAirborne(d)).map((d) => ({ id: d.id, pos: d.pos, radius: d.radius }));
    this.onTarget = this.tool === "shotgun" && targets.some((t) => {
      const hit = raySphere(EYE, dir, t.pos, t.radius * 1.15);
      return hit !== null && hit <= SHOTGUN.range;
    });
    const strength = this.assistStrength;
    if (strength > 0 && this.tool === "shotgun" && this.phase === "playing" && this.clock - this.lastLook < AIM.assistWindow) {
      const t = assistTarget(EYE, dir, targets, AIM.assistCone * (0.6 + strength * 0.6));
      if (t) {
        const want = aimFromDir(t.dir);
        const k = Math.min(1, strength * 1.5 * h);
        this.aim = clampAim({ yaw: this.aim.yaw + wrapAngle(want.yaw - this.aim.yaw) * k, pitch: this.aim.pitch + (want.pitch - this.aim.pitch) * k });
      }
    }
    if (this.tool === "camera") {
      this.framingT -= h;
      if (this.framingT <= 0) {
        this.framingT = 0.15;
        const r = evaluatePhoto(EYE, this.aim, (this.fov * Math.PI) / 180, this.aspect, this.photoSubjects());
        this.framing = r.species ? { species: r.species, stars: r.stars } : null;
      }
    } else this.framing = null;
  }

  private stepDucks(h: number): void {
    const byId = (id: number) => this.ducks.find((d) => d.id === id);
    for (const d of this.ducks) {
      stepDuck(d, h, this.rng, d.target ? this.tuning : this.ambient, byId);
      if (d.quackIn <= 0) {
        d.quackIn = 3 + this.rng() * 5;
        if (d.leader === null && isAirborne(d) && dist(EYE, d.pos) < 70) this.events.emit({ type: "quack", pos: { ...d.pos } });
      }
    }
    if (this.ducks.some((d) => d.phase === "gone")) {
      for (const d of this.ducks) {
        if (d.phase === "gone" && d.target && !this.hitDucks.has(d.id)) {
          this.escaped++;
          this.events.emit({ type: "escaped", duckId: d.id });
        }
      }
      this.ducks = this.ducks.filter((d) => d.phase !== "gone");
    }
  }

  private step(h: number): void {
    this.clock += h;
    stepWildlife(this.wildlife, h, this.rng, (e) => this.events.emit(e), { explore: this.explore });
    this.stepAim(h);
    this.stepDucks(h);

    if (this.phase === "countdown") {
      this.countdownLeft -= h;
      const n = Math.ceil(this.countdownLeft / (COUNTDOWN_SECONDS / 3));
      if (n !== this.lastCount && n > 0) {
        this.lastCount = n;
        this.events.emit({ type: "countdown", n });
      }
      if (this.countdownLeft <= 0) {
        this.phase = "playing";
        this.events.emit({ type: "go" });
      }
      return;
    }

    this.stepSpawns(h);
    if (this.phase !== "playing") return;
    this.elapsed += h;
    this.stepWeapon(h);

    if (this.timeLimit !== null) {
      const left = this.timeLimit - this.elapsed;
      if (!this.warned && left <= 10) {
        this.warned = true;
        this.events.emit({ type: "timeWarning" });
      }
      if (left <= 0) {
        this.finish();
        return;
      }
    }
    if (this.endTimer >= 0) {
      this.endTimer -= h;
      if (this.endTimer <= 0) this.finish();
    }
  }

  advance(dt: number): void {
    if (this.phase !== "paused") {
      this.acc += Math.min(Math.max(dt, 0), 0.1);
      while (this.acc >= STEP) {
        this.step(STEP);
        this.acc -= STEP;
      }
    }
    this.pushHud();
  }

  private finish(): void {
    if (this.phase === "done") return;
    this.phase = "done";
    this.weapon = "ready";
    this.ads = false;
    this.stick = { x: 0, y: 0 };
    for (const d of this.ducks) {
      if (isAirborne(d)) {
        d.target = false;
        if (d.phase !== "exit") startle(d, this.rng, this.tuning);
      }
    }
    const accuracy = this.shots > 0 ? this.hitShots / this.shots : 0;
    const met = this.objectiveMet;
    const waves = this.level.flights.kind === "waves";
    const perfect = met && waves && this.escaped === 0 && this.hits === this.spawned && this.shots > 0 && this.shots === this.hitShots;
    const limited = this.reserve !== null;
    const shellsLeft = limited ? this.mag + (this.reserve ?? 0) : 0;
    const bonuses = this.explore ? [] : endBonuses({ objectiveMet: met, perfect, accuracy, shellsLeft, limitedAmmo: limited });
    for (const b of bonuses) this.score += b.points;
    const stars = this.explore ? 0 : starsFor(this.score, met, this.level.starScores);
    this.result = {
      levelId: this.level.id,
      levelNumber: this.level.number,
      activity: this.level.activity,
      success: met,
      score: this.score,
      stars,
      hits: this.hits,
      shots: this.shots,
      hitShots: this.hitShots,
      accuracy,
      bestStreak: this.bestStreak,
      doubles: this.doubles,
      multiShots: this.multiShots,
      ducks: this.spawned,
      escaped: this.escaped,
      timeSeconds: this.elapsed,
      photos: this.photos,
      protectedHits: this.protectedHits,
      bonuses,
      outOfAmmo: this.outOfAmmo,
    };
    this.events.emit({ type: "done", success: met });
    this.pushHud();
  }

  summary(): HuntSummary | null {
    return this.result;
  }

  hud(): HudSnapshot {
    const o = this.level.objective;
    return {
      phase: this.phase,
      countdown: this.phase === "countdown" ? Math.max(1, this.lastCount) : 0,
      activity: this.level.activity,
      levelNumber: this.level.number,
      levelName: this.level.name,
      score: this.score,
      starScores: this.level.starScores,
      hits: this.hits,
      goal: o.count,
      goalKind: o.kind,
      progress: this.objectiveProgress,
      objectiveMet: this.objectiveMet,
      timeLeft: this.timeLimit === null ? null : Math.max(0, Math.ceil(this.timeLimit - this.elapsed)),
      tool: this.tool,
      mag: this.mag,
      magSize: SHOTGUN.magazine,
      reserve: this.reserve,
      weapon: this.weapon,
      reloadProgress: this.weaponLen > 0 ? Math.round(clamp(this.weaponT / this.weaponLen, 0, 1) * 10) / 10 : 0,
      streak: this.streak,
      multiplier: comboMultiplier(this.streak),
      zoom: this.zoom,
      ads: this.ads,
      photos: this.photos,
      onTarget: this.onTarget,
      framing: this.framing,
    };
  }

  private pushHud(): void {
    if (!this.hudCb) return;
    const h = this.hud();
    const f = h.framing;
    const key = [h.phase, h.countdown, h.score, h.hits, h.progress, h.timeLeft, h.tool, h.mag, h.reserve, h.weapon, h.reloadProgress, h.streak, h.zoom, h.ads, h.photos, h.onTarget, f ? `${f.species}${f.stars}` : "-", h.levelName].join("|");
    if (key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.hudCb(h);
  }
}
