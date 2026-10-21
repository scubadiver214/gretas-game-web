import {
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  NeutralToneMapping,
  OctahedronGeometry,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { COLS, DEATH_SECONDS, HOME_BAYS, ROWS } from "../config";
import type { GameEngine } from "../engine/GameEngine";
import { isRiverRow } from "../engine/frog";
import { entityLeft, turtleCycle, turtleDepth, turtleState } from "../engine/lanes";
import { laneForRow } from "../engine/levels";
import type { Dir, FroggerEvent, Lane, LaneEntity } from "../types";
import { Kit } from "./kit";
import { buildBoard, worldX, worldZ, type BoardRig } from "./meshes/board";
import { buildFrog, type FrogRig } from "./meshes/frog";
import { LOG_RADIUS, LOG_Y, buildLog } from "./meshes/log";
import { buildTurtleGroup, type TurtleGroupRig } from "./meshes/turtle";
import { buildVehicle } from "./meshes/vehicles";
import { Particles } from "@/components/three/particles";
import { WATER_Y, Water } from "./water";

interface LaneItem {
  entity: LaneEntity;
  obj: Object3D;
  turtle?: TurtleGroupRig;
}

interface LaneVisual {
  lane: Lane;
  items: LaneItem[];
}

export interface RendererOptions {
  /** Read every frame so the setting can change mid-game. */
  reducedMotion: () => boolean;
}

const FACING_ANGLE: Record<Dir, number> = { up: 0, left: Math.PI / 2, down: Math.PI, right: -Math.PI / 2 };
const CAMERA_ELEVATION = MathUtils.degToRad(57);
const CAMERA_ELEVATION_PORTRAIT = MathUtils.degToRad(74);
const CAMERA_FOV = 38;
const CAMERA_TARGET = new Vector3(0, 0, 0.6);
/** Turtle shell top / log top: where a riding frog's feet are. */
const RIDE_HEIGHT = { log: LOG_Y + LOG_RADIUS - 0.04, turtle: 0.27 } as const;

/**
 * Camera tilt for a viewport shape. Wide screens get the tilted toy-box view;
 * tall phones look down more steeply, because the board's width already sets
 * the scale there and a flatter view would waste the height.
 */
function elevationFor(aspect: number): number {
  const t = MathUtils.clamp((1.3 - aspect) / (1.3 - 0.6), 0, 1);
  return MathUtils.lerp(CAMERA_ELEVATION, CAMERA_ELEVATION_PORTRAIT, t);
}

/** Distance along the view ray that fits every board corner inside the frame. */
function fitCamera(camera: PerspectiveCamera): void {
  const elevation = elevationFor(camera.aspect);
  const dir = new Vector3(0, Math.sin(elevation), Math.cos(elevation));
  const corners: Vector3[] = [];
  const halfW = COLS / 2 + 0.2;
  const near = worldZ(ROWS - 1) + 0.6;
  const far = worldZ(0) - 0.6;
  for (const x of [-halfW, halfW]) for (const z of [near, far]) for (const y of [0, 0.7]) corners.push(new Vector3(x, y, z));
  const p = new Vector3();
  const fits = (d: number) => {
    camera.position.copy(CAMERA_TARGET).addScaledVector(dir, d);
    camera.lookAt(CAMERA_TARGET);
    camera.updateMatrixWorld();
    return corners.every((c) => {
      p.copy(c).project(camera);
      return Math.abs(p.x) <= 0.97 && Math.abs(p.y) <= 0.95 && p.z < 1;
    });
  };
  let lo = 4;
  let hi = 120;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  fits(hi);
}

/**
 * Imperative three.js view of a GameEngine. It owns the WebGL context and
 * reads engine state once per animation frame; React never touches it.
 */
export class ThreeRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.5, 200);
  private readonly cameraHome = new Vector3();
  private readonly kit = new Kit();
  private readonly board: BoardRig;
  private readonly water = new Water();
  private readonly particles = new Particles();
  private readonly frog: FrogRig;
  private readonly homeFrogs: FrogRig[];
  private readonly homeFilledAt: number[] = HOME_BAYS.map(() => -10);
  private readonly stars: Mesh[] = [];
  private readonly laneRoot = new Group();
  private lanes: LaneVisual[] = [];
  private engine: GameEngine | null = null;
  private unsubscribe: (() => void) | null = null;
  private time = 0;
  private facing = 0;
  private landedAt = -10;
  private shakeUntil = 0;
  private nextFirework = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly options: RendererOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    // Neutral tone mapping keeps the toy-box colours saturated (ACES greys them out).
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new Color("#8FD3FF");
    this.scene.fog = new Fog("#8FD3FF", 55, 110);

    const hemi = new HemisphereLight("#FFFFFF", "#5C8A3A", 2.1);
    const sun = new DirectionalLight("#FFF6E5", 2.8);
    sun.position.set(-5, 14, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -13;
    sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0008;
    this.scene.add(hemi, sun);

    this.board = buildBoard(this.kit);
    this.scene.add(this.board.root, this.water.mesh, this.laneRoot, this.particles.mesh);

    this.frog = buildFrog(this.kit);
    this.scene.add(this.frog.root);
    this.homeFrogs = this.board.pads.map((pad) => {
      const rig = buildFrog(this.kit, 0.85);
      rig.root.position.set(pad.position.x, 0, pad.position.z);
      rig.root.rotation.y = Math.PI; // face the player
      rig.root.visible = false;
      this.scene.add(rig.root);
      return rig;
    });

    const starGeo = new OctahedronGeometry(0.08, 0);
    this.kit.geo("dizzy-star", () => starGeo);
    for (let i = 0; i < 3; i++) {
      const s = new Mesh(starGeo, this.kit.mat("#FFD54D", { emissive: "#FFB800" }));
      s.visible = false;
      this.stars.push(s);
      this.scene.add(s);
    }
  }

  attach(engine: GameEngine): void {
    this.unsubscribe?.();
    this.engine = engine;
    this.unsubscribe = engine.events.on((e) => this.onEvent(e));
    this.buildLanes(engine.lanes);
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    fitCamera(this.camera);
    this.cameraHome.copy(this.camera.position);
  }

  render(dt: number): void {
    const engine = this.engine;
    this.time += dt;
    const calm = this.options.reducedMotion();
    this.water.update(this.time, calm);
    this.particles.update(dt);
    if (engine) {
      this.updateLanes(engine);
      this.updateFrog(engine, dt);
      this.updateHomes(engine);
    }

    this.camera.position.copy(this.cameraHome);
    if (!calm && this.time < this.shakeUntil) {
      const a = (this.shakeUntil - this.time) * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.engine = null;
    this.clearLanes();
    this.water.dispose();
    this.particles.dispose();
    this.kit.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ---------------------------------------------------------------------------

  private onEvent(e: FroggerEvent): void {
    const engine = this.engine;
    if (!engine) return;
    switch (e.type) {
      case "levelBuilt":
        this.buildLanes(engine.lanes);
        break;
      case "reset":
        this.particles.clear();
        this.homeFilledAt.fill(-10);
        break;
      case "land":
        this.landedAt = this.time;
        if (!isRiverRow(e.row) && e.row !== 0) this.particles.dust(worldX(engine.frog.x), worldZ(e.row));
        break;
      case "home": {
        this.homeFilledAt[e.bay] = this.time;
        this.particles.sparkle(worldX(HOME_BAYS[e.bay] + 0.5), worldZ(0));
        break;
      }
      case "death":
        if (e.cause === "water" || e.cause === "offscreen") this.particles.splash(worldX(e.x), worldZ(e.row));
        if (e.cause === "vehicle") this.shakeUntil = this.time + 0.35;
        break;
      case "levelClear":
        this.nextFirework = this.time;
        break;
      default:
        break;
    }
  }

  private clearLanes(): void {
    this.laneRoot.clear();
    this.lanes = [];
  }

  private buildLanes(lanes: readonly Lane[]): void {
    this.clearLanes();
    for (const lane of lanes) {
      const items: LaneItem[] = lane.entities.map((entity) => {
        let obj: Object3D;
        let turtle: TurtleGroupRig | undefined;
        if (lane.kind === "road") {
          obj = buildVehicle(this.kit, lane.vehicle ?? "car", entity.variant);
        } else if (lane.kind === "log") {
          obj = buildLog(this.kit, entity.length);
        } else {
          turtle = buildTurtleGroup(this.kit, entity.length);
          obj = turtle.root;
        }
        if (lane.dir < 0) obj.rotation.y = Math.PI;
        obj.position.z = worldZ(lane.row);
        this.laneRoot.add(obj);
        return { entity, obj, turtle };
      });
      this.lanes.push({ lane, items });
    }
  }

  private updateLanes(engine: GameEngine): void {
    const t = engine.laneTime;
    for (const { lane, items } of this.lanes) {
      for (const item of items) {
        const left = entityLeft(lane, item.entity, t);
        item.obj.position.x = worldX(left + item.entity.length / 2);
        if (item.turtle) this.updateTurtles(lane, item, t);
      }
    }
  }

  private updateTurtles(lane: Lane, item: LaneItem, t: number): void {
    const rig = item.turtle!;
    const f = turtleCycle(lane, item.entity, t);
    const state = turtleState(f);
    const depth = turtleDepth(f);
    const bob = state === "warning" ? Math.sin(this.time * 20) * 0.03 : Math.sin(this.time * 2 + item.entity.variant) * 0.012;
    rig.root.position.y = WATER_Y + 0.02 - depth * 0.6 + bob;
    // Warn with a red blush that pulses faster as the dive gets close.
    if (state === "warning") {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 14);
      rig.shell.color.setRGB(1, 0.62 + 0.38 * (1 - pulse), 0.55 + 0.45 * (1 - pulse));
    } else {
      rig.shell.color.setRGB(1, 1, 1);
    }
    const paddle = Math.sin(this.time * 7 + item.entity.variant);
    rig.flippers.forEach((p, i) => (p.rotation.y = paddle * 0.45 * (i % 2 ? 1 : -1)));
  }

  private rideHeight(engine: GameEngine, row: number): number {
    if (!isRiverRow(row)) return row === 0 ? 0.0 : 0.02;
    const lane = laneForRow(engine.lanes, row);
    return lane?.kind === "turtle" ? RIDE_HEIGHT.turtle : RIDE_HEIGHT.log;
  }

  private updateFrog(engine: GameEngine, dt: number): void {
    const rig = this.frog;
    const f = engine.frog;
    const phase = engine.phase;
    const hidden = phase === "levelClear" || phase === "gameOver";
    rig.root.visible = !hidden;
    this.stars.forEach((s) => (s.visible = false));
    if (hidden) return;

    let lift = 0;
    let base = this.rideHeight(engine, f.row);
    let stretch = 1;
    let kick = 0;
    if (f.hop) {
      const t = f.hop.t;
      const arc = Math.sin(Math.PI * t);
      lift = arc * 0.42;
      base = MathUtils.lerp(this.rideHeight(engine, f.hop.fromRow), this.rideHeight(engine, f.hop.toRow), t);
      stretch = 1 + arc * 0.22;
      kick = arc;
    }
    const sinceLand = this.time - this.landedAt;
    const squash = !f.hop && sinceLand < 0.12 ? 1 - Math.sin((sinceLand / 0.12) * Math.PI) * 0.22 : 1;

    const target = FACING_ANGLE[f.facing];
    let diff = target - this.facing;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.facing += diff * Math.min(1, dt * 22);

    rig.root.position.set(worldX(f.x), base + lift, worldZ(engine.frogY()));
    rig.root.rotation.set(0, this.facing, 0);
    rig.root.scale.setScalar(1);
    const sy = stretch * squash;
    rig.body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    rig.backLegs.forEach((leg) => {
      leg.rotation.x = kick * 0.9;
      leg.scale.z = 1 + kick * 0.6;
    });
    rig.frontLegs.forEach((leg) => (leg.rotation.x = -kick * 0.5));

    if (phase === "dying" || (phase === "paused" && engine.deathCause)) {
      const p = Math.min(1, engine.phaseTime / DEATH_SECONDS);
      const cause = engine.deathCause;
      if (cause === "water" || cause === "offscreen") {
        rig.root.position.y = base - p * 0.9;
        rig.root.scale.setScalar(Math.max(0.01, 1 - p * 0.6));
      } else if (cause === "timeout") {
        rig.root.rotation.y = this.facing + p * Math.PI * 4;
        rig.root.scale.setScalar(Math.max(0.01, 1 - p));
      } else {
        // Flattened with cartoon dizzy stars: a bump, not a gory squash.
        rig.body.scale.set(1.35, 0.25, 1.35);
        this.stars.forEach((s, i) => {
          const a = this.time * 6 + (i * Math.PI * 2) / 3;
          s.visible = true;
          s.position.set(rig.root.position.x + Math.cos(a) * 0.35, base + 0.45, rig.root.position.z + Math.sin(a) * 0.35);
          s.rotation.y = this.time * 8;
        });
      }
    }
  }

  private updateHomes(engine: GameEngine): void {
    const celebrating = engine.phase === "levelClear";
    this.homeFrogs.forEach((rig, i) => {
      const filled = engine.homes[i] || celebrating;
      rig.root.visible = filled;
      if (!filled) return;
      const since = this.time - this.homeFilledAt[i];
      const pop = since < 0.35 ? 0.6 + 0.4 * Math.sin((since / 0.35) * Math.PI * 0.5) * 1.15 : 1;
      rig.root.scale.setScalar(0.85 * Math.min(1.1, pop));
      const hop = celebrating ? Math.abs(Math.sin(this.time * 7 + i * 0.9)) * 0.45 : 0;
      rig.root.position.y = 0.02 + hop;
    });

    if (celebrating && this.time >= this.nextFirework && !this.options.reducedMotion()) {
      this.nextFirework = this.time + 0.28;
      this.particles.firework((Math.random() - 0.5) * COLS * 0.8, 3 + Math.random() * 1.5, worldZ(1 + Math.random() * 4));
    }
  }
}
