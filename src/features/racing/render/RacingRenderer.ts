import { Color, DirectionalLight, Fog, HemisphereLight, InstancedMesh, NeutralToneMapping, PCFShadowMap, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { MeshKit } from "@/components/three/kit";
import { BUGGY, CAMERA, CAMERA_DISTANCE_SCALE, type CameraDistance } from "../config";
import { ChaseCamera, type CameraOptions, type CameraTarget } from "../engine/camera";
import { makeCameraWorld } from "../engine/cameraWorld";
import { clamp01, fwdX, fwdZ, lerp } from "../engine/math";
import { newRenderPose, type AnimalPose, type RaceEngine, type RenderPose } from "../engine/RaceEngine";
import type { RaceEvent } from "../types";
import type { TrackContent } from "../world/content";
import type { Track } from "../world/track";
import { PROFILES } from "../world/profile";
import { buildAnimal, type AnimalVisual } from "./meshes/animals";
import { buildArch } from "./meshes/arch";
import { Pickups } from "./meshes/pickups";
import { WeaponProps } from "./meshes/weapons";
import { buildProps } from "./meshes/props";
import { Sky } from "./meshes/sky";
import { buildRamps, buildRoad, buildStartLine, buildTerrain, buildWater, type Water } from "./meshes/world";
import { Puffs } from "./puffs";
import { Precipitation } from "./meshes/precip";
import { THEMES, type WorldTheme } from "./theme";
import { RacingTextures } from "./textures";
import { buildFitzmagic } from "./vehicle/fitzmagic";
import { buildRival } from "./vehicle/rivals";
import type { VehicleVisual, VehicleVisualState } from "./vehicle/visual";
import type { CarLook } from "./vehicle/styles";

export interface RendererOptions {
  /** Read each frame, so the settings toggle takes effect immediately. */
  reducedMotion: () => boolean;
  cameraDistance: () => CameraDistance;
  /** Smaller shadow map and lower pixel ratio for phones and tablets. */
  lowPower: boolean;
}

/**
 * Draws a RaceEngine. Builds the whole world once (terrain, road, ramps, props,
 * arches, pickups, sky, snow or rain), then each frame places the interpolated cars, steers the
 * chase camera and renders. It only ever *reads* the engine; events from the
 * engine trigger effects (sparkles, dust, camera kicks).
 */
export class RacingRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(CAMERA.baseFov, 1, 0.5, 2600);
  private readonly kit = new MeshKit();
  private readonly textures = new RacingTextures();
  private readonly particles = new Puffs();
  private readonly chase = new ChaseCamera();
  private readonly sun: DirectionalLight;
  private readonly hemi: HemisphereLight;
  private readonly pose: RenderPose = newRenderPose();
  private readonly state: VehicleVisualState = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    steer: 0,
    wheelSpin: 0,
    accel: 0,
    yawRate: 0,
    speed: 0,
    vy: 0,
    slope: 0,
    bumpiness: 0,
    grounded: true,
    braking: false,
    boosting: false,
    grace: 0,
    wrecked: 0,
    time: 0,
  };
  private readonly target: CameraTarget = { x: 0, y: 0, z: 0, heading: 0, speed: 0, yawRate: 0, boosting: false };
  private readonly sunOffset: { x: number; y: number; z: number };
  private theme: WorldTheme | null = null;
  private track: Track | null = null;
  private sky: Sky | null = null;
  private precip: Precipitation | null = null;
  private readonly clearFog = new Color();
  private readonly stormFog = new Color();
  private readonly fogColor = new Color();
  private pickups: Pickups | null = null;
  private weapons: WeaponProps | null = null;
  private cameraWorld: CameraOptions["world"] | null = null;
  private engine: RaceEngine | null = null;
  private visuals: VehicleVisual[] = [];
  private cars: readonly CarLook[] = [];
  /** Every car built so far, by look: switching between a time trial and a race only shows and hides them. */
  private readonly garage = new Map<string, VehicleVisual>();
  private water: Water | null = null;
  /** Animals that cross the road (driven by the engine). */
  private crossers: AnimalVisual[] = [];
  /** Animals running about in the wild (driven by the clock here). */
  private roamers: { visual: AnimalVisual; spec: TrackContent["roamers"][number] }[] = [];
  private readonly animalPose: AnimalPose = { x: 0, y: 0, z: 0, heading: 0, running: false };
  private terrain: TrackContent["terrain"] | null = null;
  private waterLevel = -Infinity;
  private unsubscribe: (() => void) | null = null;
  private time = 0;
  private orbitAngle = 0;
  private dustDebt = 0;
  private sparkDebt = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly options: RendererOptions,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(options.lowPower ? 1.5 : 2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    // Neutral tone mapping keeps the toy-box colours saturated.
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.hemi = new HemisphereLight("#ffffff", "#e9b878", 2);
    this.sun = new DirectionalLight("#fff0d4", 3.3);
    this.sun.castShadow = true;
    const size = options.lowPower ? 1024 : 2048;
    this.sun.shadow.mapSize.set(size, size);
    const cam = this.sun.shadow.camera;
    cam.left = -62;
    cam.right = 62;
    cam.top = 62;
    cam.bottom = -62;
    cam.near = 1;
    cam.far = 420;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.35;
    this.sunOffset = { x: 0, y: 0, z: 0 };
    this.scene.add(this.hemi, this.sun, this.sun.target, this.particles.mesh);
  }

  /** Builds the static world for a track. Takes a moment, so the host shows a loading screen around it. */
  load(track: Track, content: TrackContent): void {
    const theme = THEMES[track.def.world];
    this.theme = theme;
    this.track = track;
    this.clearFog.set(theme.fog.color);
    this.stormFog.set(theme.storm?.color ?? theme.fog.color);
    this.fogColor.copy(this.clearFog);
    this.scene.background = this.fogColor;
    this.scene.fog = new Fog(this.fogColor, theme.fog.near, theme.fog.far);
    this.hemi.color.set(theme.hemi.sky);
    this.hemi.groundColor.set(theme.hemi.ground);
    this.hemi.intensity = theme.hemi.intensity;
    this.sun.color.set(theme.sun.color);
    this.sun.intensity = theme.sun.intensity;
    this.sunOffset.x = theme.sky.sunDir.x * 170;
    this.sunOffset.y = theme.sky.sunDir.y * 170;
    this.sunOffset.z = theme.sky.sunDir.z * 170;

    this.sky = new Sky(theme.sky, this.kit, this.textures);
    this.scene.add(this.sky.group);
    this.textures.setWorld(track.def.world);
    this.scene.add(buildTerrain(content.terrain, this.kit, track.def.world));
    this.scene.add(buildRoad(track, this.kit, this.textures));
    this.scene.add(buildStartLine(track, this.kit, this.textures));
    this.scene.add(buildRamps(track, this.kit, this.textures));
    this.scene.add(buildProps(content, this.kit, this.textures, track.def.world));
    for (const gate of track.checkpoints) this.scene.add(buildArch(gate, gate.index === 0 ? "start" : "gate", this.kit, this.textures));
    this.pickups = new Pickups(content.collectibles, this.kit, this.textures);
    this.scene.add(this.pickups.group);
    this.weapons = new WeaponProps(content.weapons, this.kit);
    this.scene.add(this.weapons.group);
    if (theme.snowfall) {
      this.precip = new Precipitation(this.kit, this.textures, "snow");
      this.scene.add(this.precip.points);
    } else if (theme.rainfall) {
      this.precip = new Precipitation(this.kit, this.textures, "rain");
      this.scene.add(this.precip.points);
    }
    this.cameraWorld = makeCameraWorld(track, content);
    this.terrain = content.terrain;
    const level = PROFILES[track.def.world].water;
    if (level !== undefined) {
      this.waterLevel = level;
      this.water = buildWater(content.terrain, this.kit, this.textures, level);
      this.scene.add(this.water.mesh);
    }
    this.roamers = content.roamers.map((spec) => {
      const visual = buildAnimal(spec.kind, this.kit);
      this.scene.add(visual.root);
      return { visual, spec };
    });
  }

  /** Starts drawing `engine`. `cars[i]` is how car i looks: the player first, then the rivals in grid order. */
  attach(engine: RaceEngine, cars: readonly CarLook[]): void {
    this.unsubscribe?.();
    this.engine = engine;
    this.cars = cars;
    this.syncCars();
    for (const a of this.crossers) this.scene.remove(a.root);
    this.crossers = engine.animals.map((a) => {
      const visual = buildAnimal(a.kind, this.kit);
      this.scene.add(visual.root);
      return visual;
    });
    this.unsubscribe = engine.events.on((e) => this.onEvent(e));
    this.resetCamera();
  }

  /** New looks (the player changed colours): rebuilds only what changed. */
  setCars(cars: readonly CarLook[]): void {
    this.cars = cars;
    if (this.engine) this.syncCars();
  }

  /** One visual per car in the engine, built once per look and reused after that. */
  private syncCars(): void {
    const engine = this.engine;
    if (!engine) return;
    for (const v of this.visuals) this.scene.remove(v.root);
    this.visuals = engine.vehicles.map((_, i) => {
      const look = this.cars[i] ?? this.cars[0];
      const key = `${i}|${look.body}|${Object.values(look.style).join("|")}`;
      let visual = this.garage.get(key);
      if (!visual) {
        visual = look.body === "fitzmagic" ? buildFitzmagic(look.style, this.kit, this.textures) : buildRival(look.body, look.style, this.kit);
        this.garage.set(key, visual);
      }
      this.scene.add(visual.root);
      return visual;
    });
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(dt: number): void {
    const engine = this.engine;
    const track = this.track;
    if (!engine || !track || !this.cameraWorld) return;
    const paused = engine.phase === "paused";
    const simDt = paused ? 0 : Math.min(dt, 0.1);
    this.time += simDt;
    const calm = this.options.reducedMotion();

    // Cars.
    if (this.visuals.length !== engine.vehicles.length) this.syncCars();
    for (let i = 0; i < this.visuals.length; i++) {
      const v = engine.vehicles[i];
      engine.pose(i, this.pose);
      const s = this.state;
      s.x = this.pose.x;
      s.y = this.pose.y;
      s.z = this.pose.z;
      s.heading = this.pose.heading;
      s.steer = this.pose.steer;
      s.wheelSpin = this.pose.wheelSpin;
      s.accel = v.accel;
      s.yawRate = v.yawRate;
      s.speed = v.speed;
      s.vy = v.vy;
      s.slope = v.grounded ? track.slopeAt(v.query.s) : 0;
      s.bumpiness = track.surfaceAt(v.query).bumpiness;
      s.grounded = v.grounded;
      s.braking = v.braking;
      s.boosting = v.boosting;
      s.grace = v.grace;
      s.wrecked = v.wrecked;
      s.time = engine.clock;
      this.visuals[i].update(s, simDt);
    }

    this.updateAnimals(engine, simDt);

    // Camera, from the player's interpolated pose.
    const p = engine.player;
    engine.pose(engine.playerIndex, this.pose);
    const t = this.target;
    t.x = this.pose.x;
    t.y = this.pose.y;
    t.z = this.pose.z;
    t.heading = this.pose.heading;
    t.speed = p.speed;
    t.yawRate = p.yawRate;
    t.boosting = p.boosting;
    if (engine.phase === "ready") {
      this.orbitAngle += dt * 0.28;
      this.chase.orbit(t, this.orbitAngle, 10.5, 3.6);
    } else {
      this.chase.update(simDt, t, this.cameraOptions(calm));
    }
    const c = this.chase;
    this.camera.position.set(c.x + c.shakeX, c.y + c.shakeY, c.z);
    this.camera.fov = c.fov;
    this.camera.updateProjectionMatrix();
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(c.lookX, c.lookY, c.lookZ);
    if (c.roll !== 0) this.camera.rotateZ(c.roll);

    // Light and shadow follow the player.
    this.sun.target.position.set(t.x, t.y, t.z);
    this.sun.position.set(t.x + this.sunOffset.x, t.y + this.sunOffset.y, t.z + this.sunOffset.z);
    this.water?.update(this.time);

    this.pickups?.update(this.time, this.camera.position.x, this.camera.position.y, this.camera.position.z);
    if (this.weapons && engine) this.weapons.update(this.time, engine);
    this.sky?.update(simDt, this.camera.position.x, this.camera.position.z);
    this.applyWeather(engine, calm);
    this.precip?.update(simDt, this.camera.position.x, this.camera.position.y, this.camera.position.z, calm, engine.weather.intensity);
    this.emitTrail(engine, simDt, calm);
    this.particles.update(simDt, this.camera.position.x, this.camera.position.y, this.camera.position.z);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.engine = null;
    this.scene.traverse((o) => {
      if (o instanceof InstancedMesh) o.dispose();
    });
    this.particles.dispose();
    this.kit.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ---------------------------------------------------------------------------

  /** Puts every animal where it is: crossers from the engine, roamers on their circles. */
  private updateAnimals(engine: RaceEngine, dt: number): void {
    const a = this.animalPose;
    for (let i = 0; i < this.crossers.length; i++) {
      engine.animalPose(i, a);
      const visual = this.crossers[i];
      visual.root.position.set(a.x, a.y, a.z);
      visual.root.rotation.y = a.heading;
      visual.update(dt, a.running, engine.animals[i].spec.speed, this.time);
    }
    const terrain = this.terrain;
    for (const r of this.roamers) {
      const ang = r.spec.phase + this.time * r.spec.omega;
      const x = r.spec.cx + Math.cos(ang) * r.spec.radius;
      const z = r.spec.cz + Math.sin(ang) * r.spec.radius;
      // The tangent of the circle is the way it faces.
      const dir = Math.sign(r.spec.omega);
      const heading = Math.atan2(-Math.sin(ang) * dir, Math.cos(ang) * dir);
      r.visual.root.position.set(x, terrain ? Math.max(terrain.heightAt(x, z), this.waterLevel) : 0, z);
      r.visual.root.rotation.y = heading;
      r.visual.update(dt, true, Math.abs(r.spec.omega) * r.spec.radius, this.time);
    }
  }

  /** Pulls the fog in and dims the sun as a storm thickens, so the road is harder to see. */
  private applyWeather(engine: RaceEngine, calm: boolean): void {
    const theme = this.theme;
    const fog = this.scene.fog;
    if (!theme || !(fog instanceof Fog)) return;
    const intensity = calm ? engine.weather.intensity * 0.4 : engine.weather.intensity;
    const storm = theme.storm;
    this.fogColor.lerpColors(this.clearFog, this.stormFog, intensity);
    fog.color.copy(this.fogColor);
    fog.near = lerp(theme.fog.near, storm?.near ?? theme.fog.near, intensity);
    fog.far = lerp(theme.fog.far, storm?.far ?? theme.fog.far, intensity);
    this.sun.intensity = lerp(theme.sun.intensity, theme.sun.intensity * (storm?.sun ?? 1), intensity);
    this.hemi.intensity = lerp(theme.hemi.intensity, theme.hemi.intensity * (storm?.hemi ?? 1), intensity);
    this.renderer.toneMappingExposure = lerp(1.05, engine.weather.kind === "rain" ? 0.82 : 1.12, intensity);
  }

  private cameraOptions(calm: boolean): CameraOptions {
    return { distanceScale: CAMERA_DISTANCE_SCALE[this.options.cameraDistance()], reducedMotion: calm, world: this.cameraWorld! };
  }

  private resetCamera(): void {
    const engine = this.engine;
    if (!engine) return;
    this.orbitAngle = engine.player.heading + 0.55;
    engine.pose(engine.playerIndex, this.pose);
    this.chase.orbit({ x: this.pose.x, y: this.pose.y, z: this.pose.z, heading: this.pose.heading, speed: 0, yawRate: 0, boosting: false }, this.orbitAngle, 10.5, 3.6);
  }

  /** Dust from the rear wheels, drift smoke and boost sparks for the player's car. */
  private emitTrail(engine: RaceEngine, dt: number, calm: boolean): void {
    if (dt <= 0 || engine.phase === "ready") return;
    const v = engine.player;
    const speed = Math.abs(v.speed);
    if (v.grounded && speed > 5) {
      const offRoad = Math.abs(v.query.lateral) > v.query.halfWidth;
      const dust = this.theme?.dust ?? THEMES.desert.dust;
      const speedFrac = clamp01(speed / BUGGY.maxSpeed);
      let rate = (offRoad ? 70 : 16) * speedFrac;
      if (v.drifting) rate += 55;
      const storm = engine.weather.intensity;
      if (storm > 0.15 && (engine.weather.kind === "rain" || engine.weather.kind === "snow")) rate += 40 * storm;
      if (calm) rate *= 0.4;
      this.dustDebt += rate * dt;
      const fx = fwdX(v.heading);
      const fz = fwdZ(v.heading);
      while (this.dustDebt >= 1) {
        this.dustDebt -= 1;
        const side = Math.random() < 0.5 ? -1 : 1;
        const along = -1.7;
        const lateral = side * 1.2;
        const x = v.x + fx * along + -fz * lateral;
        const z = v.z + fz * along + fx * lateral;
        let color = v.drifting ? dust.drift : offRoad ? dust.shoulder : dust.road;
        if (engine.weather.kind === "rain" && storm > 0.2) color = "#d5e6f2";
        else if (engine.weather.kind === "snow" && storm > 0.25) color = "#ffffff";
        this.particles.spawn(
          x,
          v.y + 0.35,
          z,
          -fx * speed * 0.12 + (Math.random() - 0.5) * 2.2,
          0.8 + Math.random() * 1.4,
          -fz * speed * 0.12 + (Math.random() - 0.5) * 2.2,
          color,
          0.5 + Math.random() * 0.4,
          0.22,
          (v.drifting ? 0.8 : 0.9) + speedFrac * 0.5,
          -0.4,
          1.2,
        );
      }
    }
    if (v.boosting) {
      this.sparkDebt += 90 * dt;
      const fx = fwdX(v.heading);
      const fz = fwdZ(v.heading);
      while (this.sparkDebt >= 1) {
        this.sparkDebt -= 1;
        const side = Math.random() < 0.5 ? -0.55 : 0.55;
        const x = v.x - fx * 3.4 + -fz * side;
        const z = v.z - fz * 3.4 + fx * side;
        this.particles.spawn(x, v.y + 0.9, z, -fx * 10 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, -fz * 10 + (Math.random() - 0.5) * 3, Math.random() < 0.5 ? "#ffb020" : "#ffe27a", 0.35, 0.22, 0.02, 0, 2);
      }
    }
  }

  private onEvent(e: RaceEvent): void {
    const engine = this.engine;
    const track = this.track;
    if (!engine || !track) return;
    switch (e.type) {
      case "reset":
        this.syncCars();
        this.particles.clear();
        this.pickups?.reset(-1);
        this.weapons?.reset();
        this.resetCamera();
        break;
      case "coin":
      case "gem": {
        this.pickups?.collect(e.id, this.time);
        const c = this.pickups?.position(e.id);
        if (c) this.particles.sparkle(c.x, c.y, c.z, e.type === "coin" ? "#ffd54d" : "#ff7ab0", e.type === "coin" ? 8 : 16);
        break;
      }
      case "coinsReset":
        this.pickups?.reset(this.time);
        break;
      case "weaponPickup":
        this.weapons?.collect(e.id);
        break;
      case "weaponsReset":
        this.weapons?.reset();
        break;
      case "weaponHit": {
        const v = engine.vehicles[e.target];
        this.particles.sparkle(v.x, v.y + 1.2, v.z, e.kind === "gun" ? "#ffb020" : "#ff5a5a", 16);
        if (e.target === engine.playerIndex) this.chase.kick(0.45);
        break;
      }
      case "checkpoint": {
        const g = track.checkpoints[e.index];
        this.particles.sparkle(g.x, 5, g.z, "#41c9ff", 22);
        break;
      }
      case "lap": {
        const g = track.checkpoints[0];
        this.particles.sparkle(g.x, 6, g.z, "#ffd54d", 28);
        break;
      }
      case "land": {
        const v = engine.vehicles[e.racer];
        this.visuals[e.racer]?.land(e.impact);
        const dust = this.theme?.dust ?? THEMES.desert.dust;
        this.particles.ring(v.x, v.y, v.z, Math.abs(v.query.lateral) > v.query.halfWidth ? dust.shoulder : dust.road, e.impact);
        if (e.racer === engine.playerIndex) this.chase.kick(Math.min(0.55, e.impact * 0.04));
        break;
      }
      case "wall":
      case "bump": {
        if (e.racer === engine.playerIndex) this.chase.kick(Math.min(0.5, 0.15 + e.impact * 0.02));
        const v = engine.vehicles[e.racer];
        this.particles.sparkle(v.x, v.y + 0.8, v.z, "#fff3c4", 6);
        break;
      }
      case "takeoff":
        if (e.racer === engine.playerIndex) this.chase.kick(0.12);
        break;
      case "boostStart":
        if (e.racer === engine.playerIndex) this.chase.kick(0.2);
        break;
      case "crash": {
        const v = engine.vehicles[e.racer];
        this.particles.ring(v.x, v.y, v.z, "#e7d3a1", 16);
        this.particles.sparkle(v.x, v.y + 1.1, v.z, "#ffe08a", 20);
        if (e.racer === engine.playerIndex) this.chase.kick(0.72);
        break;
      }
      case "respawn": {
        this.particles.sparkle(engine.vehicles[e.racer].x, 1.5, engine.vehicles[e.racer].z, "#ffffff", 14);
        if (e.racer === engine.playerIndex) {
          engine.pose(engine.playerIndex, this.pose);
          this.chase.snap({ x: this.pose.x, y: this.pose.y, z: this.pose.z, heading: this.pose.heading, speed: 0, yawRate: 0, boosting: false }, this.cameraOptions(this.options.reducedMotion()));
        }
        break;
      }
      default:
        break;
    }
  }
}
