import { Emitter } from "@/lib/game/events";
import { seededRng } from "@/lib/rng";
import {
  COLS,
  DEATH_SECONDS,
  HOME_BAYS,
  HOME_ROW,
  LEVEL_CLEAR_SECONDS,
  LIVES,
  MAX_STEPS_PER_FRAME,
  SCORING,
  STEP_SECONDS,
} from "../config";
import { levelDef } from "../levelConfig";
import type { DeathCause, Dir, EnginePhase, FroggerEvent, FrogState, GameSummary, HudSnapshot, Lane } from "../types";
import { bayAt, hitsVehicle } from "./collision";
import { advanceHop, createFrog, frogY, isRiverRow, requestMove, startHop } from "./frog";
import { laneVelocity, platformUnder } from "./lanes";
import { buildLanes, laneForRow } from "./levels";
import { extraLivesBetween, homePoints } from "./scoring";

export interface EngineOptions {
  /** Seeds every level's lane layout; same seed => same game (daily challenge). */
  seed?: string;
}

function randomSeed(): string {
  return `run:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The whole game, independent of React and three.js. Call `advance(dt)` once
 * per animation frame; it runs fixed 120 Hz steps so behaviour is identical at
 * any frame rate. Renderers read the public fields; the HUD subscribes via
 * `onHud`, which only fires when a displayed value changes.
 */
export class GameEngine {
  phase: EnginePhase = "ready";
  lanes: Lane[] = [];
  /** Lane clock (seconds). Keeps running in "ready" so the menu backdrop moves. */
  laneTime = 0;
  frog: FrogState = createFrog();
  score = 0;
  lives: number = LIVES.start;
  livesLost = 0;
  level = 1;
  levelsCompleted = 0;
  homes: boolean[] = HOME_BAYS.map(() => false);
  timerSeconds = levelDef(1).timerSeconds;
  timeLeft = this.timerSeconds;
  /** Active play time (excludes pauses and the menu). */
  playSeconds = 0;
  homesFilled = 0;
  perfectLevels = 0;
  deathCause: DeathCause | null = null;
  /** Seconds spent in the current dying / levelClear phase. */
  phaseTime = 0;

  readonly events = new Emitter<FroggerEvent>();

  private seed: string;
  private accumulator = 0;
  private pausedFrom: EnginePhase | null = null;
  private livesLostThisLevel = 0;
  private hudListener: ((hud: HudSnapshot) => void) | null = null;
  private lastHudKey = "";

  constructor(options: EngineOptions = {}) {
    this.seed = options.seed ?? randomSeed();
    this.buildLevel();
  }

  /** Back to a fresh game in the "ready" phase. */
  reset(options: EngineOptions = {}): void {
    this.seed = options.seed ?? randomSeed();
    this.phase = "ready";
    this.pausedFrom = null;
    this.accumulator = 0;
    this.score = 0;
    this.lives = LIVES.start;
    this.livesLost = 0;
    this.livesLostThisLevel = 0;
    this.level = 1;
    this.levelsCompleted = 0;
    this.homesFilled = 0;
    this.perfectLevels = 0;
    this.playSeconds = 0;
    this.homes = HOME_BAYS.map(() => false);
    this.deathCause = null;
    this.phaseTime = 0;
    this.frog = createFrog();
    this.events.emit({ type: "reset" });
    this.buildLevel();
    this.pushHud();
  }

  start(): void {
    if (this.phase !== "ready") return;
    this.phase = "playing";
    this.pushHud();
  }

  input(dir: Dir): void {
    if (this.phase !== "playing") return;
    if (requestMove(this.frog, dir) === "started") this.events.emit({ type: "hop", dir });
  }

  pause(): void {
    if (this.phase !== "playing" && this.phase !== "dying" && this.phase !== "levelClear") return;
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

  /** Feed wall-clock time; runs as many fixed steps as fit. */
  advance(dt: number): void {
    if (this.halted()) return;
    this.accumulator += Math.min(Math.max(0, dt), 0.25);
    let steps = 0;
    while (this.accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
      this.step(STEP_SECONDS);
      this.accumulator -= STEP_SECONDS;
      steps++;
      if (this.halted()) break;
    }
    // Drop backlog we couldn't simulate rather than fast-forwarding later.
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
      score: this.score,
      lives: this.lives,
      level: this.level,
      levelsCompleted: this.levelsCompleted,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      timerSeconds: this.timerSeconds,
      homes: [...this.homes],
    };
  }

  summary(): GameSummary {
    return {
      score: this.score,
      highestLevel: this.level,
      levelsCompleted: this.levelsCompleted,
      livesLost: this.livesLost,
      homesFilled: this.homesFilled,
      durationSeconds: Math.max(1, Math.round(this.playSeconds)),
      perfectLevels: this.perfectLevels,
    };
  }

  /** Fractional row the frog currently occupies. */
  frogY(): number {
    return frogY(this.frog);
  }

  // ---------------------------------------------------------------------------

  private halted(): boolean {
    return this.phase === "paused" || this.phase === "gameOver";
  }

  private step(h: number): void {
    this.laneTime += h;
    switch (this.phase) {
      case "playing":
        this.playSeconds += h;
        this.stepPlaying(h);
        break;
      case "dying":
        this.playSeconds += h;
        this.phaseTime += h;
        if (this.phaseTime >= DEATH_SECONDS) this.afterDeath();
        break;
      case "levelClear":
        this.phaseTime += h;
        if (this.phaseTime >= LEVEL_CLEAR_SECONDS) this.nextLevel();
        break;
      default:
        break;
    }
  }

  private stepPlaying(h: number): void {
    this.timeLeft -= h;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.die("timeout");
      return;
    }

    const frog = this.frog;
    if (frog.hop) {
      const landed = advanceHop(frog, h);
      if (this.checkVehicles()) return;
      if (landed) this.onLand();
      return;
    }

    if (isRiverRow(frog.row)) {
      const lane = laneForRow(this.lanes, frog.row);
      if (!lane || !platformUnder(lane, frog.x, this.laneTime)) {
        this.die("water");
        return;
      }
      frog.x += laneVelocity(lane) * h;
      if (frog.x < 0 || frog.x > COLS) {
        this.die("offscreen");
        return;
      }
    }
    this.checkVehicles();
  }

  private checkVehicles(): boolean {
    if (hitsVehicle(this.lanes, this.frog.x, frogY(this.frog), this.laneTime)) {
      this.die("vehicle");
      return true;
    }
    return false;
  }

  private onLand(): void {
    const frog = this.frog;
    this.events.emit({ type: "land", row: frog.row });

    if (frog.row < frog.bestRow) {
      frog.bestRow = frog.row;
      this.addScore(SCORING.forwardStep);
      this.events.emit({ type: "forward", points: SCORING.forwardStep });
    }

    if (frog.row === HOME_ROW) {
      this.reachHome();
      return;
    }

    if (isRiverRow(frog.row)) {
      const lane = laneForRow(this.lanes, frog.row);
      if (!lane || !platformUnder(lane, frog.x, this.laneTime)) {
        this.die("water");
        return;
      }
    }

    const queued = frog.queued;
    frog.queued = null;
    if (queued && startHop(frog, queued)) this.events.emit({ type: "hop", dir: queued });
  }

  private reachHome(): void {
    const bay = bayAt(this.frog.x);
    if (bay < 0) {
      this.die("hedge");
      return;
    }
    if (this.homes[bay]) {
      this.die("occupied");
      return;
    }
    this.homes[bay] = true;
    this.homesFilled++;
    const points = homePoints(this.timeLeft);
    this.addScore(points);
    this.events.emit({ type: "home", bay, points });

    if (this.homes.every(Boolean)) {
      this.addScore(SCORING.levelComplete);
      this.levelsCompleted++;
      if (this.livesLostThisLevel === 0) this.perfectLevels++;
      this.phase = "levelClear";
      this.phaseTime = 0;
      this.frog.hop = null;
      this.frog.queued = null;
      this.events.emit({ type: "levelClear", level: this.level, points: SCORING.levelComplete });
      return;
    }
    this.respawn();
  }

  private die(cause: DeathCause): void {
    this.phase = "dying";
    this.phaseTime = 0;
    this.deathCause = cause;
    this.lives--;
    this.livesLost++;
    this.livesLostThisLevel++;
    const y = frogY(this.frog);
    this.frog.hop = null;
    this.frog.queued = null;
    this.events.emit({ type: "death", cause, x: this.frog.x, row: Math.round(y) });
  }

  private afterDeath(): void {
    this.deathCause = null;
    if (this.lives <= 0) {
      this.lives = 0;
      this.phase = "gameOver";
      this.events.emit({ type: "gameOver" });
      return;
    }
    this.phase = "playing";
    this.respawn();
  }

  private respawn(): void {
    this.frog = createFrog();
    this.timeLeft = this.timerSeconds;
    this.events.emit({ type: "respawn" });
  }

  private nextLevel(): void {
    this.level++;
    this.livesLostThisLevel = 0;
    this.homes = HOME_BAYS.map(() => false);
    this.buildLevel();
    this.phase = "playing";
    this.respawn();
  }

  private buildLevel(): void {
    this.lanes = buildLanes(this.level, seededRng(`${this.seed}:L${this.level}`));
    this.timerSeconds = levelDef(this.level).timerSeconds;
    this.timeLeft = this.timerSeconds;
    this.frog = createFrog();
    this.events.emit({ type: "levelBuilt", level: this.level });
  }

  private addScore(points: number): void {
    const before = this.score;
    this.score += points;
    const extra = extraLivesBetween(before, this.score);
    for (let i = 0; i < extra; i++) {
      if (this.lives < LIVES.max) {
        this.lives++;
        this.events.emit({ type: "extraLife" });
      }
    }
  }

  private pushHud(): void {
    if (!this.hudListener) return;
    const hud = this.hud();
    const key = `${hud.phase}|${hud.score}|${hud.lives}|${hud.level}|${hud.levelsCompleted}|${hud.timeLeft}|${hud.timerSeconds}|${hud.homes.join(",")}`;
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
