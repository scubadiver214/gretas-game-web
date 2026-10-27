import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  RingGeometry,
  ShaderMaterial,
  Shape,
  type PerspectiveCamera,
} from "three";
import type { Vec3 } from "../../types";

const MAX_PARTICLES = 900;

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
attribute float aShape;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
varying float vShape;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
  vAlpha = aAlpha;
  vColor = aColor;
  vShape = aShape;
}`;

const FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
varying float vShape;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = length(p);
  float a;
  if (vShape < 0.5) {
    float core = exp(-d * d * 9.0);
    float rays = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y)) + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x));
    a = core + rays * 0.9;
  } else {
    a = smoothstep(1.0, 0.35, d) * 0.85;
  }
  if (a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(vColor * a, a * vAlpha);
}`;

const SPARKLE_COLORS = ["#fff6c2", "#ffd54d", "#ffffff", "#ff9ad5", "#8ef3ff", "#b9ff8a"].map((c) => new Color(c));
const WHITE = new Color("#ffffff");
const DROP = new Color("#d8f1ff");

interface Particle {
  life: number;
  max: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  gravity: number;
  drag: number;
  shape: number;
  color: Color;
}

export type EffectKind = "hit" | "multi" | "splash" | "bigSplash";

function starShape(): Shape {
  const s = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.22;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

/**
 * Friendly hit effects (a sparkle poof and a gold star floating up) and water
 * splashes. Nothing violent: no feathers, no falling birds.
 */
export class EffectsSystem {
  readonly root = new Group();
  private particles: Particle[] = [];
  private queue: { kind: EffectKind; pos: Vec3 }[] = [];
  private geometry = new BufferGeometry();
  private material: ShaderMaterial;
  private starGeo: ExtrudeGeometry;
  private stars: { mesh: Mesh; mat: MeshStandardMaterial; t: number; from: Vec3 }[];
  private ringGeo: RingGeometry;
  private rings: { mesh: Mesh; mat: MeshBasicMaterial; active: boolean; t: number; len: number; max: number }[];

  constructor() {
    const g = this.geometry;
    g.setAttribute("position", new BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    g.setAttribute("aSize", new BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
    g.setAttribute("aAlpha", new BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
    g.setAttribute("aColor", new BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
    g.setAttribute("aShape", new BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
    g.setDrawRange(0, 0);
    this.material = new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uScale: { value: 400 } } });
    const points = new Points(g, this.material);
    points.frustumCulled = false;
    this.root.add(points);

    this.starGeo = new ExtrudeGeometry(starShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    this.starGeo.center();
    this.stars = Array.from({ length: 8 }, () => {
      const mat = new MeshStandardMaterial({ color: "#ffcf3a", emissive: "#ff9d00", emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.25, transparent: true });
      const mesh = new Mesh(this.starGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      return { mesh, mat, t: -1, from: { x: 0, y: 0, z: 0 } };
    });

    this.ringGeo = new RingGeometry(0.82, 1, 40);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.rings = Array.from({ length: 14 }, () => {
      const mat = new MeshBasicMaterial({ color: "#eaf8ff", transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
      const mesh = new Mesh(this.ringGeo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      return { mesh, mat, active: false, t: 0, len: 1.2, max: 3 };
    });
  }

  enqueue(kind: EffectKind, pos: Vec3): void {
    this.queue.push({ kind, pos });
  }

  private spawn(p: Partial<Particle> & Pick<Particle, "x" | "y" | "z">): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 0.3, gravity: 0, drag: 1.5, shape: 0, color: SPARKLE_COLORS[0], ...p });
  }

  private emit(kind: EffectKind, { x, y, z }: Vec3, calm: boolean): void {
    if (kind === "hit" || kind === "multi") {
      const n = calm ? 14 : kind === "multi" ? 70 : 42;
      this.spawn({ x, y, z, size: 3.2, max: 0.28, drag: 0, color: WHITE });
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const sp = 3 + Math.random() * 6;
        this.spawn({
          x,
          y,
          z,
          vx: Math.sin(ph) * Math.cos(th) * sp,
          vy: Math.cos(ph) * sp + 1.5,
          vz: Math.sin(ph) * Math.sin(th) * sp,
          size: 0.35 + Math.random() * 0.45,
          max: 0.7 + Math.random() * 0.5,
          gravity: -3.5,
          drag: 2.2,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        });
      }
      const star = this.stars.find((s) => s.t < 0);
      if (star) {
        star.t = 0;
        star.from = { x, y, z };
        star.mesh.visible = true;
      }
      return;
    }
    const big = kind === "bigSplash";
    const drops = calm ? 6 : big ? 26 : 12;
    for (let i = 0; i < drops; i++) {
      const th = Math.random() * Math.PI * 2;
      const sp = (big ? 1.2 : 0.7) + Math.random() * (big ? 1.8 : 1);
      this.spawn({ x, y: 0.05, z, vx: Math.cos(th) * sp, vy: (big ? 2.5 : 1.6) + Math.random() * 1.6, vz: Math.sin(th) * sp, size: big ? 0.16 : 0.1, max: 0.9, gravity: -9, drag: 0.4, shape: 1, color: DROP });
    }
    for (let k = 0; k < (big ? 2 : 1); k++) {
      const ring = this.rings.find((r) => !r.active);
      if (!ring) break;
      ring.active = true;
      ring.t = -k * 0.25;
      ring.mat.opacity = 0;
      ring.len = big ? 1.6 : 1.1;
      ring.max = big ? 3.2 : 1.4;
      ring.mesh.position.set(x, 0.03, z);
      ring.mesh.visible = true;
    }
  }

  update(dt: number, camera: PerspectiveCamera, viewportHeight: number, calm: boolean): void {
    for (const q of this.queue) this.emit(q.kind, q.pos, calm);
    this.queue.length = 0;

    const g = this.geometry;
    const pos = g.getAttribute("position") as BufferAttribute;
    const sizes = g.getAttribute("aSize") as BufferAttribute;
    const alphas = g.getAttribute("aAlpha") as BufferAttribute;
    const colors = g.getAttribute("aColor") as BufferAttribute;
    const shapes = g.getAttribute("aShape") as BufferAttribute;
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.max) continue;
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.gravity * dt;
      p.vz *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.shape === 1 && p.y < 0) continue;
      alive.push(p);
    }
    this.particles = alive;
    alive.forEach((p, i) => {
      const f = p.life / p.max;
      pos.setXYZ(i, p.x, p.y, p.z);
      sizes.setX(i, p.size * (p.shape === 0 ? 1 - f * 0.6 : 1));
      alphas.setX(i, 1 - f * f);
      colors.setXYZ(i, p.color.r, p.color.g, p.color.b);
      shapes.setX(i, p.shape);
    });
    g.setDrawRange(0, alive.length);
    pos.needsUpdate = sizes.needsUpdate = alphas.needsUpdate = colors.needsUpdate = shapes.needsUpdate = true;
    this.material.uniforms.uScale.value = (viewportHeight * 0.5) / Math.tan((camera.fov * Math.PI) / 360);

    for (const s of this.stars) {
      if (s.t < 0) continue;
      s.t += dt;
      const k = s.t;
      if (k >= 1) {
        s.t = -1;
        s.mesh.visible = false;
        continue;
      }
      s.mesh.position.set(s.from.x, s.from.y + k * 2.6, s.from.z);
      s.mesh.scale.setScalar(Math.min(1, k * 8) * (1.6 - k * 0.5));
      s.mat.opacity = 1 - Math.max(0, (k - 0.6) / 0.4);
      s.mesh.lookAt(camera.position);
      s.mesh.rotateY(Math.sin(s.t * 7) * 0.55);
      s.mesh.rotateZ(Math.sin(s.t * 4) * 0.25);
    }
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      if (r.t < 0) continue;
      const k = r.t / r.len;
      if (k >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar(0.2 + k * r.max);
      r.mat.opacity = 0.55 * (1 - k);
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.starGeo.dispose();
    for (const s of this.stars) s.mat.dispose();
    this.ringGeo.dispose();
    for (const r of this.rings) r.mat.dispose();
  }
}
