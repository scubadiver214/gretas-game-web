import {
  Box3,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { MeshKit } from "@/components/three/kit";
import { Particles } from "@/components/three/particles";
import { CABINET, CHUTE, GAME_TITLE } from "../config";
import { PRIZE_BY_ID } from "../content/prizes";
import { WORLDS, type WorldPalette } from "../content/worlds";
import type { ClawEngine } from "../engine/ClawEngine";
import { tipY } from "../engine/claw";
import { highestUnder } from "../engine/pile";
import type { ClawEvent, ToyState } from "../engine/types";
import { MARQUEE_H, PLINTH_H, buildCabinet, type CabinetRig } from "./meshes/cabinet";
import { buildClaw, poseClaw, type ClawRig } from "./meshes/claw";
import { WALL_Z, WallSign } from "./meshes/wallSign";
import { buildToy, floorSitOffset } from "./toys";

export interface RendererOptions {
  /** Read every frame so the setting can change mid-game. */
  reducedMotion: () => boolean;
}

/** Share of the viewport covered by DOM HUD at the top and bottom (0..0.5). */
export interface ViewInsets {
  top: number;
  bottom: number;
}

interface ToyVisual {
  toy: ToyState;
  group: Group;
  baseRotY: number;
  /** Mesh AABB min.y when the group is at the origin (after catalog scale). */
  visualBottom: number;
}

const FOV = 34;
const TARGET = new Vector3(0, CABINET.height * 0.34, 0.35);
// Looking down at the pink floor so toys read as sitting on the platform, not floating on the back wall.
const ELEVATION = MathUtils.degToRad(28);
const ELEVATION_TALL = MathUtils.degToRad(34);
const AIM_EMPTY = new Color("#FFFFFF");
const AIM_TOY = new Color("#3DFF88");

/**
 * Imperative three.js view of a ClawEngine. It owns the WebGL context and
 * reads engine state once per animation frame; React never touches it.
 */
export class ClawRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.5, 200);
  private readonly kit = new MeshKit();
  private readonly particles = new Particles();
  private readonly toyRoot = new Group();
  private readonly hintArrow: Mesh;
  private readonly hintRing: Mesh;
  /** Ring on whatever the claw would land on, plus a faint beam down from the fingers. */
  private readonly aimRing: Mesh;
  private readonly aimBeam: Mesh;
  private readonly aimMat: MeshStandardMaterial;
  private readonly sign: WallSign;
  private readonly titleFont: string;
  private disposed = false;
  private readonly wallPlane = new Plane(new Vector3(0, 0, 1), -WALL_Z);
  private readonly fill: PointLight;
  private readonly ground: Mesh;
  private cabinet: CabinetRig;
  private claw: ClawRig;
  private cabinetKit = new MeshKit();
  private toys = new Map<number, ToyVisual>();
  private engine: ClawEngine | null = null;
  private unsubscribe: (() => void) | null = null;
  private palette: WorldPalette = WORLDS[0].palette;
  private insets: ViewInsets = { top: 0.1, bottom: 0.14 };
  private size = { w: 1, h: 1 };
  private time = 0;
  private bulbStep = 0;
  private bulbClock = 0;
  private buttonPressedAt = -10;
  private rimPulseAt = -10;
  private fireworksUntil = -1;
  private nextFirework = 0;
  private lastClawX = 0;
  private lastClawZ = 0;
  private stickTiltX = 0;
  private stickTiltZ = 0;
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly tmpColor = new Color();

  constructor(
    canvas: HTMLCanvasElement,
    private readonly options: RendererOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    // Neutral tone mapping keeps the toy colours saturated (ACES greys them out).
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const hemi = new HemisphereLight("#FFFFFF", "#5A4A6B", 1.5);
    const sun = new DirectionalLight("#FFF6E5", 2.1);
    sun.position.set(-4, 12, 9);
    sun.castShadow = true;
    // One shadow light; phones get a smaller map so the fill rate stays within budget.
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    sun.shadow.mapSize.set(small ? 1024 : 1536, small ? 1024 : 1536);
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -5;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0006;
    this.fill = new PointLight("#FFFFFF", 14, 12, 1.6);
    this.fill.position.set(0, CABINET.height - 0.4, 0.4);
    this.scene.add(hemi, sun, this.fill);

    this.ground = new Mesh(this.kit.box(80, 0.1, 80), this.kit.mat("#141126", { flat: false, rough: 1 }));
    this.ground.position.y = -PLINTH_H - 0.05;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // The cursive face comes from next/font (--font-script); the marquee and wall sign repaint once it has loaded.
    this.titleFont = getComputedStyle(document.documentElement).getPropertyValue("--font-script").trim() || "cursive";
    this.cabinet = buildCabinet(this.cabinetKit, this.palette, this.titleFont);
    this.scene.add(this.cabinet.root);
    this.claw = buildClaw(this.kit, this.palette.trim);
    this.claw.pivot.position.set(0, CABINET.height, 0);
    this.scene.add(this.claw.pivot, this.toyRoot, this.particles.mesh);

    this.hintArrow = new Mesh(this.kit.cone(0.16, 0.36, 8), this.kit.mat("#FFD54D", { emissive: "#FFD54D", emissiveIntensity: 0.8, flat: false }));
    this.hintArrow.rotation.x = Math.PI;
    this.hintArrow.visible = false;
    this.hintRing = new Mesh(this.kit.torus(0.5, 0.04, 8, 28), this.kit.mat("#FFD54D", { emissive: "#FFD54D", emissiveIntensity: 0.8, flat: false }));
    this.hintRing.rotation.x = Math.PI / 2;
    this.hintRing.visible = false;
    this.scene.add(this.hintArrow, this.hintRing);

    this.aimMat = this.kit.track(new MeshStandardMaterial({ color: AIM_EMPTY, emissive: AIM_EMPTY, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, depthWrite: false }));
    this.aimRing = new Mesh(this.kit.torus(0.32, 0.035, 8, 32), this.aimMat);
    this.aimRing.rotation.x = Math.PI / 2;
    this.aimRing.renderOrder = 5;
    this.aimBeam = new Mesh(
      this.kit.cylinder(0.02, 0.02, 1, 6),
      this.kit.track(new MeshStandardMaterial({ color: "#FFFFFF", emissive: new Color("#FFFFFF"), emissiveIntensity: 0.6, transparent: true, opacity: 0.22, depthWrite: false })),
    );
    this.aimBeam.renderOrder = 5;
    this.aimRing.visible = false;
    this.aimBeam.visible = false;
    this.scene.add(this.aimRing, this.aimBeam);

    this.sign = new WallSign(this.kit, GAME_TITLE);
    this.sign.addTo(this.scene);
    this.sign.setFont(this.titleFont);
    document.fonts?.load(`80px ${this.titleFont}`).then(
      () => {
        if (this.disposed) return;
        this.sign.setFont(this.titleFont);
        this.rebuildCabinet();
      },
      () => undefined,
    );

    this.applyPalette();
  }

  attach(engine: ClawEngine): void {
    this.unsubscribe?.();
    this.engine = engine;
    this.unsubscribe = engine.events.on((e) => this.onEvent(e));
    this.rebuildToys();
    this.lastClawX = engine.claw.x;
    this.lastClawZ = engine.claw.z;
  }

  /** Recolours the cabinet for a world. Cheap enough to call on every level start. */
  setWorld(palette: WorldPalette): void {
    if (palette === this.palette) return;
    this.palette = palette;
    this.rebuildCabinet();
    this.scene.remove(this.claw.pivot);
    this.claw = buildClaw(this.kit, palette.trim);
    this.claw.pivot.position.set(0, CABINET.height, 0);
    this.scene.add(this.claw.pivot);
    this.applyPalette();
  }

  private rebuildCabinet(): void {
    this.scene.remove(this.cabinet.root);
    this.cabinetKit.dispose();
    this.cabinetKit = new MeshKit();
    this.cabinet = buildCabinet(this.cabinetKit, this.palette, this.titleFont);
    this.scene.add(this.cabinet.root);
  }

  setInsets(insets: ViewInsets): void {
    this.insets = insets;
    this.fitCamera();
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitCamera();
  }

  render(dt: number): void {
    const engine = this.engine;
    this.time += dt;
    const calm = this.options.reducedMotion();
    this.particles.update(dt);
    this.updateBulbs(dt, calm);
    this.sign.update(this.time, calm);
    if (engine) {
      this.syncToys(engine);
      this.updateToys(engine, calm);
      this.updateClaw(engine, dt);
      this.updateHint(engine, calm);
      this.updateAim(engine, calm);
      this.updateCelebration(engine, calm);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /** The toy under a pointer position (canvas-relative pixels), for tap-to-aim. */
  pick(px: number, py: number): number | null {
    this.ndc.set((px / this.size.w) * 2 - 1, -(py / this.size.h) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.toyRoot.children, true);
    for (const hit of hits) {
      let o: Object3D | null = hit.object;
      while (o && o.userData.uid === undefined) o = o.parent;
      if (o && typeof o.userData.uid === "number") return o.userData.uid;
    }
    return null;
  }

  /** Where a world point lands on screen, as viewport fractions. */
  project(x: number, y: number, z: number): { x: number; y: number } {
    const v = new Vector3(x, y, z).project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.engine = null;
    this.toyRoot.clear();
    this.toys.clear();
    this.particles.dispose();
    this.cabinetKit.dispose();
    this.kit.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ---------------------------------------------------------------------------

  private applyPalette(): void {
    this.scene.background = new Color(this.palette.sky);
    this.scene.fog = new Fog(this.palette.sky, 40, 90);
    this.fill.color.set(this.palette.glow).lerp(new Color("#FFFFFF"), 0.6);
    (this.ground.material as import("three").MeshStandardMaterial).color.set(this.palette.sky).offsetHSL(0, 0, 0.04);
    this.sign.setPalette(this.palette.glow, this.palette.sky);
  }

  private fitCamera(): void {
    const aspect = this.camera.aspect;
    const t = MathUtils.clamp((1.2 - aspect) / (1.2 - 0.55), 0, 1);
    const elevation = MathUtils.lerp(ELEVATION, ELEVATION_TALL, t);
    const dir = new Vector3(0, Math.sin(elevation), Math.cos(elevation));
    // Fit the glass box and marquee; the plinth and control panel below may sit behind the DOM controls.
    const corners: Vector3[] = [];
    const hx = CABINET.width / 2 + 0.5;
    const top = CABINET.height + 0.25 + MARQUEE_H;
    for (const x of [-hx, hx]) {
      for (const z of [-CABINET.depth / 2 - 0.4, CABINET.depth / 2 + 0.5]) {
        corners.push(new Vector3(x, -0.35, z), new Vector3(x, top, z));
      }
    }
    const lo = -1 + 2 * this.insets.bottom + 0.02;
    const hi = 1 - 2 * this.insets.top - 0.02;
    const p = new Vector3();
    const fits = (d: number) => {
      this.camera.position.copy(TARGET).addScaledVector(dir, d);
      this.camera.lookAt(TARGET);
      this.camera.updateMatrixWorld();
      return corners.every((c) => {
        p.copy(c).project(this.camera);
        return Math.abs(p.x) <= 0.97 && p.y >= lo && p.y <= hi && p.z < 1;
      });
    };
    let a = 4;
    let b = 120;
    for (let i = 0; i < 32; i++) {
      const mid = (a + b) / 2;
      if (fits(mid)) b = mid;
      else a = mid;
    }
    fits(b);

    // Where the cabinet ended up on screen, so the wall sign can use the space around it.
    let cabX = 0;
    let cabTop = -1;
    for (const c of corners) {
      p.copy(c).project(this.camera);
      cabX = Math.max(cabX, Math.abs(p.x));
      cabTop = Math.max(cabTop, p.y);
    }
    this.layoutSign(cabX, cabTop, lo, hi);
  }

  /** Point on the back wall under a screen position (normalised device coordinates). */
  private onWall(x: number, y: number, out: Vector3): Vector3 | null {
    this.raycaster.setFromCamera(this.ndc.set(x, y), this.camera);
    return this.raycaster.ray.intersectPlane(this.wallPlane, out);
  }

  /** Fits a sign panel into a screen rectangle (NDC) on the wall, keeping its aspect. */
  private placePanel(mesh: Mesh, aspect: number, x0: number, x1: number, y0: number, y1: number): boolean {
    const xc = (x0 + x1) / 2;
    const yc = (y0 + y1) / 2;
    const centre = this.onWall(xc, yc, new Vector3());
    const l = this.onWall(x0, yc, new Vector3());
    const r = this.onWall(x1, yc, new Vector3());
    const b = this.onWall(xc, y0, new Vector3());
    const t = this.onWall(xc, y1, new Vector3());
    if (!centre || !l || !r || !b || !t) return false;
    const maxW = l.distanceTo(r);
    const maxH = b.distanceTo(t);
    const w = Math.min(maxW, maxH * aspect);
    mesh.position.set(centre.x, centre.y, WALL_Z + 0.06);
    mesh.scale.set(w, w / aspect, 1);
    return true;
  }

  /**
   * Wide screens: "Bea's Claw-some" left of the cabinet, "Adventure" right of
   * it. Tall screens: the whole name in the band above the marquee. Never
   * over the cabinet or under the HUD; hidden if there is no room.
   */
  private layoutSign(cabX: number, cabTop: number, lo: number, hi: number): void {
    const seam = new Vector3(0, -PLINTH_H, WALL_Z).project(this.camera).y;
    const gap = 0.05;
    const side = 0.97 - (cabX + gap);
    if (side >= 0.26) {
      const y0 = Math.max(seam, lo) + 0.06;
      const y1 = Math.min(hi, y0 + 0.75) - 0.04;
      const ok = this.placePanel(this.sign.left.mesh, this.sign.left.aspect, -0.97, -(cabX + gap), y0, y1) && this.placePanel(this.sign.right.mesh, this.sign.right.aspect, cabX + gap, 0.97, y0, y1);
      this.sign.setLayout(ok ? "sides" : "none");
      return;
    }
    // A little of the HUD inset is padding below the chips, so the name may rise into it.
    const y0 = cabTop + 0.03;
    const y1 = Math.min(0.93, hi + this.insets.top * 0.3);
    if (y1 - y0 < 0.07) {
      this.sign.setLayout("none");
      return;
    }
    this.sign.setLayout(this.placePanel(this.sign.top.mesh, this.sign.top.aspect, -0.94, 0.94, y0, y1) ? "top" : "none");
  }

  private onEvent(e: ClawEvent): void {
    switch (e.type) {
      case "levelBuilt":
      case "reset":
        this.rebuildToys();
        this.particles.clear();
        this.fireworksUntil = -1;
        break;
      case "grabStart":
        this.buttonPressedAt = this.time;
        break;
      case "toyBumped": {
        const v = this.toys.get(e.toy);
        if (v && !this.options.reducedMotion()) this.particles.dust(v.toy.x, v.toy.z);
        break;
      }
      case "prizeDelivered":
        this.rimPulseAt = this.time;
        this.particles.sparkle(CHUTE.x, CHUTE.z);
        break;
      case "levelClear":
        this.fireworksUntil = this.time + 4;
        this.nextFirework = this.time;
        break;
      default:
        break;
    }
  }

  private rebuildToys(): void {
    this.toyRoot.clear();
    this.toys.clear();
    if (!this.engine) return;
    for (const toy of this.engine.toys) this.addToy(toy);
  }

  private addToy(toy: ToyState): void {
    const prize = PRIZE_BY_ID[toy.prizeId];
    if (!prize) return;
    const group = buildToy(this.kit, prize);
    group.userData.uid = toy.uid;
    group.rotation.y = toy.rotY;
    this.toyRoot.add(group);
    group.updateMatrixWorld(true);
    const visualBottom = new Box3().setFromObject(group).min.y;
    this.toys.set(toy.uid, { toy, group, baseRotY: toy.rotY, visualBottom });
  }

  /** Keeps the visual set in step with the engine's toys (new levels, offered toys). */
  private syncToys(engine: ClawEngine): void {
    if (engine.toys.length === this.toys.size && engine.toys.every((t) => this.toys.get(t.uid)?.toy === t)) return;
    this.rebuildToys();
  }

  private updateToys(engine: ClawEngine, calm: boolean): void {
    const claw = engine.claw;
    for (const v of this.toys.values()) {
      const t = v.toy;
      const g = v.group;
      const hidden = t.status === "delivered" && engine.phase !== "delivered" && engine.phase !== "releasing";
      g.visible = !hidden;
      if (hidden) continue;
      // Resting toys sit on the floor of their physics sphere so flat meshes
      // (cars, donuts) do not hover. Held / falling-into-the-chute keep the
      // sphere centre so they stay in the claw and the bin.
      const sit = t.status === "resting" || t.status === "falling" ? floorSitOffset(v.visualBottom, t.radius) : 0;
      g.position.set(t.x, t.y + sit, t.z);
      const wob = calm ? 0 : t.wobble;
      g.rotation.set(wob * Math.sin(t.wobbleT * 14) * 0.3, v.baseRotY + wob * Math.sin(t.wobbleT * 9) * 0.5, wob * Math.cos(t.wobbleT * 11) * 0.3);
      if (t.status === "held") {
        // Hang from the fingers, tilting with the cable swing and turning to face the player.
        g.rotation.set(claw.swingZ * 0.8, MathUtils.lerp(g.rotation.y, 0, 0.1), -claw.swingX * 0.8);
        v.baseRotY = g.rotation.y;
      } else if (t.status === "dropping") {
        g.rotation.x += 0.08;
      }
      if (t.status === "delivered") {
        // Bounce in the bin for a moment.
        const since = this.time - this.rimPulseAt;
        g.position.y = t.y + Math.max(0, Math.sin(since * 9) * 0.12 * Math.max(0, 1 - since));
      }
    }
  }

  private updateClaw(engine: ClawEngine, dt: number): void {
    const c = engine.claw;
    this.claw.pivot.position.set(c.x, CABINET.height, c.z);
    poseClaw(this.claw, c.drop, c.jaw, c.swingX, c.swingZ);
    this.cabinet.gantry.position.x = c.x;
    this.cabinet.carriage.position.z = c.z;
    // Control panel: button dips on grab, joystick leans with held input (and
    // with claw velocity for the mystery sweep, which has no held direction).
    const pressed = this.time - this.buttonPressedAt < 0.22;
    this.cabinet.button.position.y = MathUtils.lerp(this.cabinet.button.position.y, pressed ? 0.22 : 0.3, Math.min(1, dt * 20));
    const vx = dt > 0 ? (c.x - this.lastClawX) / dt : 0;
    const vz = dt > 0 ? (c.z - this.lastClawZ) / dt : 0;
    this.lastClawX = c.x;
    this.lastClawZ = c.z;
    const maxTilt = 0.72;
    const holdX = engine.stickX;
    const holdZ = engine.stickZ;
    const targetZ = holdX !== 0 ? -holdX * maxTilt : MathUtils.clamp(-vx * 0.22, -maxTilt, maxTilt);
    const targetX = holdZ !== 0 ? holdZ * maxTilt : MathUtils.clamp(vz * 0.22, -maxTilt, maxTilt);
    const follow = Math.min(1, dt * 14);
    this.stickTiltZ = MathUtils.lerp(this.stickTiltZ, targetZ, follow);
    this.stickTiltX = MathUtils.lerp(this.stickTiltX, targetX, follow);
    this.cabinet.stick.rotation.set(this.stickTiltX, 0, this.stickTiltZ);
    // Chute rim glows brighter right after a prize drops.
    const rim = this.cabinet.chuteRim.material as import("three").MeshStandardMaterial;
    const since = this.time - this.rimPulseAt;
    rim.emissiveIntensity = 0.5 + (since < 1 ? (1 - since) * 1.5 : 0) + 0.15 * Math.sin(this.time * 3);
  }

  private updateHint(engine: ClawEngine, calm: boolean): void {
    const v = engine.hintToy === null ? undefined : this.toys.get(engine.hintToy);
    const show = !!v && v.toy.status === "resting" && engine.phase === "positioning";
    this.hintArrow.visible = show;
    this.hintRing.visible = show;
    if (!v || !show) return;
    const bob = calm ? 0 : Math.sin(this.time * 5) * 0.08;
    this.hintArrow.position.set(v.toy.x, v.toy.y + v.toy.radius + 0.45 + bob, v.toy.z);
    this.hintRing.position.set(v.toy.x, 0.03, v.toy.z);
    const s = 0.9 + (calm ? 0 : 0.1 * Math.sin(this.time * 5));
    this.hintRing.scale.setScalar((v.toy.radius / 0.5) * s);
  }

  /** Shows where the fingers will land while aiming: green on a toy, white on the floor. */
  private updateAim(engine: ClawEngine, calm: boolean): void {
    const show = engine.phase === "positioning";
    this.aimRing.visible = show;
    this.aimBeam.visible = show;
    if (!show) return;
    const c = engine.claw;
    const target = highestUnder(c.x, c.z, engine.toys, engine.planar);
    const y = target ? target.y + target.radius + 0.03 : 0.04;
    this.aimRing.position.set(c.x, y, c.z);
    const pulse = calm ? 1 : 1 + 0.08 * Math.sin(this.time * 6);
    this.aimRing.scale.setScalar(pulse);
    this.aimMat.color.copy(target ? AIM_TOY : AIM_EMPTY);
    this.aimMat.emissive.copy(target ? AIM_TOY : AIM_EMPTY);
    const top = tipY(c.drop);
    const len = Math.max(0.01, top - y);
    this.aimBeam.scale.y = len;
    this.aimBeam.position.set(c.x, y + len / 2, c.z);
  }

  private updateBulbs(dt: number, calm: boolean): void {
    this.bulbClock += dt;
    if (this.bulbClock < 0.14) return;
    this.bulbClock = 0;
    this.bulbStep = (this.bulbStep + 1) % 3;
    const bulbs = this.cabinet.bulbs;
    for (let i = 0; i < this.cabinet.bulbCount; i++) {
      const on = calm || (i + this.bulbStep) % 3 === 0;
      bulbs.setColorAt(i, this.tmpColor.set(on ? "#FFFFFF" : "#6B5A4A"));
    }
    if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true;
  }

  private updateCelebration(engine: ClawEngine, calm: boolean): void {
    if (calm || engine.phase !== "levelClear" || this.time >= this.fireworksUntil || this.time < this.nextFirework) return;
    this.nextFirework = this.time + 0.3;
    this.particles.firework((Math.random() - 0.5) * CABINET.width * 0.8, CABINET.height * 0.6 + Math.random() * 1.5, (Math.random() - 0.5) * CABINET.depth * 0.6);
  }
}
