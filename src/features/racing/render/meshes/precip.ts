import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Points, PointsMaterial, type Texture } from "three";
import type { MeshKit } from "@/components/three/kit";
import { lerp } from "../../engine/math";
import type { WeatherKind } from "../../engine/weather";
import type { RacingTextures } from "../textures";

interface PrecipLook {
  key: string;
  count: number;
  span: number;
  height: number;
  size0: number;
  size1: number;
  opacity0: number;
  opacity1: number;
  draw0: number;
  color: string;
  speedMin: number;
  speedMax: number;
  /** Extra fall speed at full intensity. */
  fallBoost: number;
  sway: number;
  wind: number;
  texture: (textures: RacingTextures) => Texture;
}

const LOOK: Record<Exclude<WeatherKind, "none">, PrecipLook> = {
  snow: {
    key: "snowfall",
    count: 3400,
    span: 70,
    height: 36,
    size0: 0.4,
    size1: 1.25,
    opacity0: 0.86,
    opacity1: 1,
    draw0: 0.5,
    color: "#ffffff",
    speedMin: 1.8,
    speedMax: 4.4,
    fallBoost: 2.6,
    sway: 1.15,
    wind: 1.4,
    texture: (t) => t.flake,
  },
  rain: {
    key: "rainfall",
    count: 4800,
    span: 58,
    height: 30,
    size0: 0.55,
    size1: 1.15,
    opacity0: 0.45,
    opacity1: 0.95,
    draw0: 0.25,
    color: "#c5d8ee",
    speedMin: 22,
    speedMax: 38,
    fallBoost: 1.55,
    sway: 0.1,
    wind: 12,
    texture: (t) => t.drop,
  },
};

/**
 * Snow or rain around the camera: a fixed set of flakes/drops inside a box that
 * follows the camera, wrapping at the edges. Intensity 0 is ambient snow or no
 * rain; 1 is a whiteout or a driving downpour.
 */
export class Precipitation {
  readonly points: Points;
  private readonly look: PrecipLook;
  private readonly local: Float32Array;
  private readonly speed: Float32Array;
  private readonly positions: Float32Array;
  private clock = 0;
  private readonly kind: Exclude<WeatherKind, "none">;

  constructor(kit: MeshKit, textures: RacingTextures, kind: Exclude<WeatherKind, "none">) {
    this.kind = kind;
    const look = LOOK[kind];
    this.look = look;
    this.local = new Float32Array(look.count * 3);
    this.speed = new Float32Array(look.count);
    // A fixed pseudo-random fill, so the same frame looks the same every run.
    let seed = kind === "snow" ? 20240921 : 20241025;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < look.count; i++) {
      this.local[i * 3] = rand() * look.span;
      this.local[i * 3 + 1] = rand() * look.height;
      this.local[i * 3 + 2] = rand() * look.span;
      this.speed[i] = look.speedMin + rand() * (look.speedMax - look.speedMin);
    }
    this.positions = new Float32Array(look.count * 3);
    const geo = kit.geo(look.key, () => {
      const g = new BufferGeometry();
      const attr = new BufferAttribute(this.positions, 3);
      attr.setUsage(DynamicDrawUsage);
      g.setAttribute("position", attr);
      return g;
    });
    const material = kit.track(
      new PointsMaterial({
        color: look.color,
        map: look.texture(textures),
        alphaTest: 0.02,
        size: look.size0,
        sizeAttenuation: true,
        transparent: true,
        opacity: look.opacity0,
        depthWrite: false,
      }),
    );
    this.points = new Points(geo, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
  }

  update(dt: number, cx: number, cy: number, cz: number, calm: boolean, intensity: number): void {
    const visual = calm ? intensity * 0.4 : intensity;
    if (this.kind === "rain" && visual < 0.02) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;
    const { look, local, speed, positions } = this;
    const mat = this.points.material as PointsMaterial;
    mat.size = lerp(look.size0, look.size1, visual);
    mat.opacity = lerp(look.opacity0, look.opacity1, visual);
    this.points.geometry.setDrawRange(0, Math.floor(look.count * lerp(look.draw0, 1, visual)));

    this.clock += dt;
    const fall = (calm ? 0.45 : 1) * lerp(1, look.fallBoost, visual);
    const sway = (calm ? 0.3 : 1) * look.sway;
    const wind = look.wind * lerp(this.kind === "snow" ? 0.35 : 0.55, 1, visual);
    for (let i = 0; i < look.count; i++) {
      const k = i * 3;
      local[k + 1] -= speed[i] * fall * dt;
      if (local[k + 1] < 0) local[k + 1] += look.height;
      const wobble = Math.sin(this.clock * (0.7 + speed[i] * 0.2) + i) * sway;
      local[k] += (wind + wobble * 0.9) * dt;
      local[k + 2] += Math.cos(this.clock * 0.5 + i * 1.7) * 0.4 * sway * dt;
      positions[k] = cx + ((((local[k] - cx) % look.span) + look.span * 1.5) % look.span) - look.span / 2;
      positions[k + 1] = cy - 8 + local[k + 1];
      positions[k + 2] = cz + ((((local[k + 2] - cz) % look.span) + look.span * 1.5) % look.span) - look.span / 2;
    }
    (this.points.geometry.getAttribute("position") as BufferAttribute).needsUpdate = true;
  }
}
