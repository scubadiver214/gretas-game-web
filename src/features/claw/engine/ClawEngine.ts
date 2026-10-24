import { Emitter } from "@/lib/game/events";
import { seededRng, type Rng } from "@/lib/rng";
import { ASSIST, CHUTE, CLAW, MAX_STEPS_PER_FRAME, PHYSICS, POINTS, STEP_SECONDS, levelStars } from "../config";
import { RAIL_BOUNDS, clampX, clampZ, createClaw, moveToward, stepSwing, tipPosition, tipY } from "./claw";
import { assistBumps, withAssist } from "./difficulty";
import { easiestToy, resolveGrab, slipPoint } from "./grab";
import { bumpToys, layoutPedestal, layoutPile, pickTemplates, pileBoundsFor, stepPile, stopDropFor } from "./pile";
import type { ClawEvent, ClawState, DifficultyVars, EnginePhase, HintDir, HudSnapshot, LevelSetup, LevelSummary, MoveDir, ToyState, ToyTemplate } from "./types";

function randomSeed(): string {
  return `claw:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

/** Seconds the empty claw hangs after a slip before the player gets control back. */
const SLIP_SECONDS = 0.6;

/**
 * The whole claw machine, independent of React and three.js. Call
 * `advance(dt)` once per animation frame; it runs fixed 120 Hz steps so the
 * claw, the swing and the pile behave identically at any frame rate.
 * Renderers read the public fields; the HUD subscribes via `onHud`, which
 * only fires when a displayed value changes.
 */
export class ClawEngine {
  phase: EnginePhase = "ready";
  level = 1;
  goal = 1;
  depthControl = false;
  mystery = false;
  toys: ToyState[] = [];
  claw: ClawState = createClaw();
  successes = 0;
  grabs = 0;
  misses = 0;
  missStreak = 0;
  points = 0;
  prizes: string[] = [];
  /** Difficulty with the current assist bumps applied. */
  vars: DifficultyVars;
  hintToy: number | null = null;
  /** Engine clock; keeps running in "ready" so idle animations move. */
  time = 0;
  /** Active play time (excludes pauses and the menu). */
  playSeconds = 0;
  /** Seconds spent in the current timed phase. */
  phaseTime = 0;
  /** Last grab outcome, for the renderer and tests. */
  lastChance = 0;

  readonly events = new Emitter<ClawEvent>();

  private setup: LevelSetup;
  private readonly templates: Readonly<Record<string, ToyTemplate>>;
  private base: DifficultyVars;
  private seed: string;
  private rng: Rng;
  private accumulator = 0;
  private pausedFrom: EnginePhase | null = null;
  private moveX = 0;
  private moveZ = 0;
  private autoTarget: { x: number; z: number } | null = null;
  private lastVX = 0;
  private lastVZ = 0;
  private sweepDir = 1;
  private easyToyGiven = false;
  private carryLength = 1;
  private hudListener: ((hud: HudSnapshot) => void) | null = null;
  private lastHudKey = "";

  constructor(setup: LevelSetup, templates: Readonly<Record<string, ToyTemplate>>) {
    this.templates = templates;
    this.setup = setup;
    this.base = setup.difficulty;
    this.vars = setup.difficulty;
    this.seed = setup.seed ?? randomSeed();
    this.rng = seededRng(`${this.seed}:grab`);
    this.build();
  }

  /** Back to a fresh machine in the "ready" phase, optionally for another level. */
  reset(setup: LevelSetup = this.setup): void {
    this.setup = setup;
    this.base = setup.difficulty;
    this.seed = setup.seed ?? randomSeed();
    this.rng = seededRng(`${this.seed}:grab`);
    this.phase = "ready";
    this.pausedFrom = null;
    this.accumulator = 0;
    this.successes = 0;
    this.grabs = 0;
    this.misses = 0;
    this.missStreak = 0;
    this.points = 0;
    this.prizes = [];
    this.playSeconds = 0;
    this.phaseTime = 0;
    this.moveX = 0;
    this.moveZ = 0;
    this.autoTarget = null;
    this.easyToyGiven = false;
    this.hintToy = null;
    this.events.emit({ type: "reset" });
    this.build();
    this.pushHud();
  }

  start(): void {
    if (this.phase !== "ready") return;
    this.phase = "positioning";
    this.events.emit({ type: "started" });
    this.pushHud();
  }

  /** Held rail input: -1, 0 or 1. The cabinet joystick follows these while a direction is down. */
  get stickX(): number {
    return this.moveX;
  }
  get stickZ(): number {
    return this.moveZ;
  }

  /** Hold or release a direction (keyboard key or on-screen button). */
  move(dir: MoveDir, pressed: boolean): void {
    if (this.mystery) return;
    const sign = dir === "left" || dir === "back" ? -1 : 1;
    const axis = dir === "left" || dir === "right" ? "x" : "z";
    if (axis === "z" && !this.depthControl) return;
    const was = axis === "x" ? this.moveX : this.moveZ;
    let next: number;
    if (pressed) next = sign;
    else next = was === sign ? 0 : was;
    if (axis === "x") this.moveX = next;
    else this.moveZ = next;
    if (pressed) this.autoTarget = null;
    if (this.phase !== "positioning") return;
    if (was === 0 && next !== 0) this.events.emit({ type: "moveStart" });
    if (was !== 0 && next === 0 && this.moveX === 0 && this.moveZ === 0) this.events.emit({ type: "moveStop" });
  }

  /** Stick-style input: -1..1 on each axis. */
  setMove(x: number, z: number): void {
    if (this.mystery) return;
    const nx = Math.abs(x) < 0.2 ? 0 : Math.sign(x);
    const nz = !this.depthControl || Math.abs(z) < 0.2 ? 0 : Math.sign(z);
    const wasMoving = this.moveX !== 0 || this.moveZ !== 0;
    this.moveX = nx;
    this.moveZ = nz;
    if (nx !== 0 || nz !== 0) this.autoTarget = null;
    const moving = nx !== 0 || nz !== 0;
    if (this.phase === "positioning" && wasMoving !== moving) this.events.emit({ type: moving ? "moveStart" : "moveStop" });
  }

  /** Glide the head to a point (tap-a-toy). Any held direction cancels it. */
  moveTo(x: number, z: number): void {
    if (this.mystery || this.phase !== "positioning") return;
    this.autoTarget = { x: clampX(x), z: this.depthControl ? clampZ(z) : this.claw.z };
    this.moveX = 0;
    this.moveZ = 0;
    this.events.emit({ type: "moveStart" });
  }

  /** Lower the claw. Only does something while positioning. */
  grab(): void {
    if (this.phase !== "positioning") return;
    this.grabs++;
    this.moveX = 0;
    this.moveZ = 0;
    this.autoTarget = null;
    this.claw.stopDrop = stopDropFor(this.claw.x, this.claw.z, this.toys, this.planar);
    this.claw.heldToy = null;
    this.claw.slipAt = null;
    this.phase = "descending";
    this.phaseTime = 0;
    this.events.emit({ type: "grabStart" });
    this.pushHud();
  }

  /** After a prize celebration: on to the next grab, or the level is done. */
  continue(): void {
    if (this.phase !== "delivered") return;
    if (this.successes >= this.goal) {
      this.phase = "levelClear";
      this.phaseTime = 0;
      const stars = levelStars(this.goal, this.grabs);
      this.events.emit({ type: "levelClear", level: this.level, stars, grabs: this.grabs, points: this.points });
    } else {
      this.phase = "positioning";
      this.phaseTime = 0;
    }
    this.pushHud();
  }

  pause(): void {
    if (this.phase === "ready" || this.phase === "paused" || this.phase === "levelClear") return;
    this.pausedFrom = this.phase;
    this.phase = "paused";
    this.moveX = 0;
    this.moveZ = 0;
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

  /** Feed wall-clock time; runs as many fixed steps as fit. */
  advance(dt: number): void {
    this.accumulator += Math.min(Math.max(0, dt), 0.25);
    let steps = 0;
    while (this.accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
      this.step(STEP_SECONDS);
      this.accumulator -= STEP_SECONDS;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.pushHud();
  }

  onHud(listener: ((hud: HudSnapshot) => void) | null): void {
    this.hudListener = listener;
    this.lastHudKey = "";
    this.pushHud();
  }

  hud(): HudSnapshot {
    return {
      phase: this.phase,
      level: this.level,
      goal: this.goal,
      successes: this.successes,
      grabs: this.grabs,
      misses: this.misses,
      points: this.points,
      hint: this.hintDirection(),
      depthControl: this.depthControl,
      canMove: this.phase === "positioning" && !this.mystery,
      canGrab: this.phase === "positioning",
    };
  }

  summary(): LevelSummary {
    return {
      level: this.level,
      goal: this.goal,
      successes: this.successes,
      grabs: this.grabs,
      misses: this.misses,
      points: this.points,
      stars: this.successes >= this.goal ? levelStars(this.goal, this.grabs) : 0,
      durationSeconds: Math.max(1, Math.round(this.playSeconds)),
      prizes: [...this.prizes],
    };
  }

  /** The toy the claw is holding, if any. */
  heldToy(): ToyState | null {
    return this.claw.heldToy === null ? null : (this.toys.find((t) => t.uid === this.claw.heldToy) ?? null);
  }

  toy(uid: number): ToyState | null {
    return this.toys.find((t) => t.uid === uid) ?? null;
  }

  /** Where the finger tips are right now, including swing. */
  tip(): { x: number; y: number; z: number } {
    return tipPosition(this.claw);
  }

  /** Direction from the claw to the hinted toy, for the HUD arrow. */
  hintDirection(): HintDir | null {
    if (this.hintToy === null) return null;
    const toy = this.toy(this.hintToy);
    if (!toy || toy.status !== "resting") return null;
    const dx = toy.x - this.claw.x;
    const dz = this.depthControl ? toy.z - this.claw.z : 0;
    if (Math.abs(dx) < 0.25 && Math.abs(dz) < 0.25) return "here";
    if (Math.abs(dx) >= Math.abs(dz)) return dx < 0 ? "left" : "right";
    return dz < 0 ? "back" : "forward";
  }

  /** Simple machines measure alignment left/right only. */
  get planar(): boolean {
    return !this.depthControl && !this.mystery;
  }

  // ---------------------------------------------------------------------------

  private build(): void {
    const s = this.setup;
    this.level = s.level;
    this.goal = Math.max(1, s.goal);
    this.depthControl = s.depthControl;
    this.mystery = s.mystery === true;
    this.vars = withAssist(this.base, 0);
    const layoutRng = seededRng(`${this.seed}:pile`);
    const pool = s.pool.map((id) => this.templates[id]).filter((t): t is ToyTemplate => !!t);
    if (this.mystery && pool.length > 0) {
      this.toys = layoutPedestal(pool[0]);
      this.claw = createClaw(RAIL_BOUNDS.minX, -0.2);
      this.sweepDir = 1;
    } else {
      this.toys = layoutPile(layoutRng, pickTemplates(layoutRng, pool, s.toyCount), s.difficulty.crowding, pileBoundsFor(this.depthControl));
      this.claw = createClaw();
    }
    this.events.emit({ type: "levelBuilt", level: this.level });
  }

  private step(h: number): void {
    this.time += h;
    if (this.phase === "paused") return;
    const playing = this.phase !== "ready" && this.phase !== "levelClear";
    if (playing) this.playSeconds += h;

    switch (this.phase) {
      case "positioning":
        this.stepPositioning(h);
        break;
      case "descending":
        this.stepDescending(h);
        break;
      case "gripping":
        this.stepGripping(h);
        break;
      case "lifting":
        this.stepLifting(h);
        break;
      case "carrying":
        this.stepCarrying(h);
        break;
      case "slipping":
        this.phaseTime += h;
        this.stepSwingOnly(h);
        if (this.phaseTime >= SLIP_SECONDS) this.backToPositioning();
        break;
      case "releasing":
        this.stepReleasing(h);
        break;
      case "returning":
        this.phaseTime += h;
        this.stepSwingOnly(h);
        if (this.phaseTime >= CLAW.returnSeconds) this.backToPositioning();
        break;
      default:
        this.stepSwingOnly(h);
        break;
    }

    stepPile(this.toys, h);
    this.followHeld();
  }

  private stepSwingOnly(h: number): void {
    stepSwing(this.claw, 0, 0, h);
    this.lastVX = 0;
    this.lastVZ = 0;
  }

  private stepPositioning(h: number): void {
    const claw = this.claw;
    const speed = this.vars.clawSpeed;
    // Jaw rests slightly open while the player aims.
    claw.jaw += (0.35 - claw.jaw) * Math.min(1, h * 8);
    let vx = 0;
    let vz = 0;
    if (this.mystery) {
      vx = this.sweepDir * CLAW.sweepSpeed;
      const nx = claw.x + vx * h;
      if (nx >= RAIL_BOUNDS.maxX || nx <= RAIL_BOUNDS.minX) this.sweepDir *= -1;
      claw.x = clampX(nx);
    } else if (this.autoTarget) {
      const before = { x: claw.x, z: claw.z };
      const arrived = moveToward(claw, this.autoTarget.x, this.autoTarget.z, speed, h);
      vx = (claw.x - before.x) / h;
      vz = (claw.z - before.z) / h;
      if (arrived) {
        this.autoTarget = null;
        this.events.emit({ type: "moveStop" });
      }
    } else {
      vx = this.moveX * speed;
      vz = this.moveZ * speed;
      const nx = clampX(claw.x + vx * h);
      const nz = clampZ(claw.z + vz * h);
      vx = (nx - claw.x) / h;
      vz = (nz - claw.z) / h;
      claw.x = nx;
      claw.z = nz;
    }
    stepSwing(claw, (vx - this.lastVX) / h, (vz - this.lastVZ) / h, h);
    this.lastVX = vx;
    this.lastVZ = vz;
  }

  private stepDescending(h: number): void {
    const claw = this.claw;
    claw.jaw = Math.min(1, claw.jaw + h / CLAW.openSeconds);
    claw.drop = Math.min(claw.stopDrop, claw.drop + CLAW.descendSpeed * h);
    this.stepSwingOnly(h);
    if (claw.drop >= claw.stopDrop - 1e-6) {
      claw.drop = claw.stopDrop;
      this.phase = "gripping";
      this.phaseTime = 0;
      for (const uid of bumpToys(claw.x, claw.z, tipY(claw.drop), this.toys, this.planar)) this.events.emit({ type: "toyBumped", toy: uid });
      this.events.emit({ type: "descendStop" });
      this.events.emit({ type: "jawClose" });
    }
  }

  private stepGripping(h: number): void {
    const claw = this.claw;
    this.phaseTime += h;
    claw.jaw = Math.max(0, 1 - this.phaseTime / CLAW.gripSeconds);
    this.stepSwingOnly(h);
    if (this.phaseTime < CLAW.gripSeconds) return;

    const outcome = resolveGrab(claw.x, claw.z, tipY(claw.drop), this.toys, this.vars, this.rng, this.planar, this.mystery);
    this.lastChance = outcome.chance;
    const toy = outcome.toy === null ? null : this.toy(outcome.toy);
    if (outcome.caught && toy) {
      toy.status = "held";
      toy.vy = 0;
      toy.wobble = 0;
      claw.heldToy = toy.uid;
      claw.slipAt = slipPoint(toy, this.vars, this.rng);
      claw.jaw = 0.12;
    } else {
      claw.jaw = 0.05;
    }
    this.events.emit({ type: "grabResolved", caught: outcome.caught && !!toy, toy: toy?.uid ?? null, prizeId: toy?.prizeId ?? null, chance: outcome.chance });
    this.phase = "lifting";
    this.phaseTime = 0;
  }

  private stepLifting(h: number): void {
    const claw = this.claw;
    claw.drop = Math.max(0, claw.drop - CLAW.liftSpeed * h);
    this.stepSwingOnly(h);
    if (claw.drop > 0) return;
    const held = this.heldToy();
    if (held) {
      this.phase = "carrying";
      this.phaseTime = 0;
      claw.carryFrom = { x: claw.x, z: claw.z };
      this.carryLength = Math.max(0.01, Math.hypot(CHUTE.x - claw.x, CHUTE.z - claw.z));
      this.events.emit({ type: "lifted", caught: true });
    } else {
      this.events.emit({ type: "lifted", caught: false });
      this.registerMiss();
      this.phase = "returning";
      this.phaseTime = 0;
    }
  }

  private stepCarrying(h: number): void {
    const claw = this.claw;
    const before = { x: claw.x, z: claw.z };
    const arrived = moveToward(claw, CHUTE.x, CHUTE.z, CLAW.carrySpeed, h);
    const vx = (claw.x - before.x) / h;
    const vz = (claw.z - before.z) / h;
    stepSwing(claw, (vx - this.lastVX) / h, (vz - this.lastVZ) / h, h);
    this.lastVX = vx;
    this.lastVZ = vz;

    const held = this.heldToy();
    if (!held) {
      this.phase = "returning";
      this.phaseTime = 0;
      return;
    }
    const progress = 1 - Math.hypot(CHUTE.x - claw.x, CHUTE.z - claw.z) / this.carryLength;
    if (claw.slipAt !== null && progress >= claw.slipAt) {
      // The prize slips and tumbles back into the pile.
      held.status = "falling";
      held.vy = 0;
      held.x = Math.min(RAIL_BOUNDS.maxX, Math.max(RAIL_BOUNDS.minX, held.x));
      held.z = Math.min(RAIL_BOUNDS.maxZ, Math.max(RAIL_BOUNDS.minZ, held.z));
      claw.heldToy = null;
      claw.slipAt = null;
      claw.jaw = 0.6;
      this.events.emit({ type: "slip", toy: held.uid, prizeId: held.prizeId });
      this.registerMiss();
      this.phase = "slipping";
      this.phaseTime = 0;
      return;
    }
    if (arrived) {
      this.phase = "releasing";
      this.phaseTime = 0;
    }
  }

  private stepReleasing(h: number): void {
    const claw = this.claw;
    this.phaseTime += h;
    this.stepSwingOnly(h);
    const held = this.heldToy();
    if (held && held.status === "held") {
      claw.jaw = Math.min(1, claw.jaw + h / CLAW.openSeconds);
      if (claw.jaw >= 1) {
        held.status = "dropping";
        held.vy = 0;
        held.x = CHUTE.x;
        held.z = CHUTE.z;
        this.events.emit({ type: "released" });
      }
      return;
    }
    const dropping = this.toys.find((t) => t.status === "dropping");
    if (!dropping) {
      this.phase = "returning";
      this.phaseTime = 0;
      return;
    }
    dropping.vy -= PHYSICS.gravity * h;
    dropping.y += dropping.vy * h;
    const floor = -CHUTE.depth + dropping.radius * 0.8;
    if (dropping.y <= floor) {
      dropping.y = floor;
      dropping.vy = 0;
      dropping.status = "delivered";
      this.deliver(dropping);
    }
  }

  private deliver(toy: ToyState): void {
    const claw = this.claw;
    claw.heldToy = null;
    claw.slipAt = null;
    claw.carryFrom = null;
    this.successes++;
    const points = POINTS[toy.rarity];
    this.points += points;
    this.prizes.push(toy.prizeId);
    this.missStreak = 0;
    this.easyToyGiven = false;
    this.setHint(null);
    this.vars = withAssist(this.base, 0);
    this.phase = "delivered";
    this.phaseTime = 0;
    this.events.emit({ type: "prizeDelivered", toy: toy.uid, prizeId: toy.prizeId, rarity: toy.rarity, points, successes: this.successes, goal: this.goal });
  }

  private registerMiss(): void {
    this.misses++;
    this.missStreak++;
    this.events.emit({ type: "miss", streak: this.missStreak });
    if (this.mystery) return;
    const bumps = assistBumps(this.missStreak);
    const before = this.vars;
    this.vars = withAssist(this.base, bumps);
    if (bumps > 0 && (before.alignTolerance !== this.vars.alignTolerance || before.gripStrength !== this.vars.gripStrength)) {
      this.events.emit({ type: "assist", bumps });
    }
    if (this.missStreak >= ASSIST.easyToyAfter && !this.easyToyGiven) this.offerEasyToy();
    if (this.missStreak >= ASSIST.hintAfter) this.setHint(easiestToy(this.toys, this.vars)?.uid ?? null);
  }

  /** Lifts the easiest toy out of the pile and drops it near the claw, on top. */
  private offerEasyToy(): void {
    const toy = easiestToy(this.toys, this.vars) ?? this.toys.find((t) => t.status === "resting");
    if (!toy) return;
    this.easyToyGiven = true;
    toy.x = clampX(this.claw.x + (this.claw.x > 0 ? -0.9 : 0.9));
    toy.z = this.depthControl ? clampZ(this.claw.z) : CLAW.homeZ;
    toy.y = CLAW.maxPileTop + toy.radius;
    toy.vy = 0;
    toy.status = "falling";
    toy.wobble = PHYSICS.bumpWobble;
    this.events.emit({ type: "toyBumped", toy: toy.uid });
  }

  private setHint(uid: number | null): void {
    if (this.hintToy === uid) return;
    for (const t of this.toys) t.hinted = t.uid === uid;
    this.hintToy = uid;
    this.events.emit({ type: "hint", toy: uid });
  }

  private backToPositioning(): void {
    this.phase = "positioning";
    this.phaseTime = 0;
    this.claw.carryFrom = null;
  }

  /** A held toy hangs from the finger tips, including the swing. */
  private followHeld(): void {
    const held = this.heldToy();
    if (!held || held.status !== "held") return;
    const tip = tipPosition(this.claw);
    held.x = tip.x;
    held.z = tip.z;
    held.y = tip.y - held.radius * 0.55;
  }

  private pushHud(): void {
    if (!this.hudListener) return;
    const hud = this.hud();
    const key = `${hud.phase}|${hud.level}|${hud.goal}|${hud.successes}|${hud.grabs}|${hud.misses}|${hud.points}|${hud.hint}|${hud.depthControl}|${hud.canMove}|${hud.canGrab}`;
    if (key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.hudListener(hud);
  }
}

/** Drives `onFrame(dt)` from requestAnimationFrame until the returned stop() is called. */
export function runLoop(onFrame: (dt: number, now: number) => void): () => void {
  let last = performance.now();
  let id = 0;
  let running = true;
  const frame = (now: number) => {
    if (!running) return;
    // Clamp long gaps (tab switch, debugger) so the game never lurches forward.
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    onFrame(dt, now);
    id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => {
    running = false;
    cancelAnimationFrame(id);
  };
}
