import { Color, DynamicDrawUsage, IcosahedronGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from "three";
import { smoothstep } from "../engine/math";

const MAX = 320;

interface P {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size0: number;
  size1: number;
  gravity: number;
  drag: number;
}

/**
 * Soft low-poly puffs for dust, drift smoke, boost sparks and pickup sparkles.
 * One instanced mesh and a fixed pool: spawning and updating never allocate.
 */
export class Puffs {
  readonly mesh: InstancedMesh;
  private readonly pool: P[] = [];
  // Detail 1: round enough to read as a soft puff of dust rather than a dropped hexagon.
  private readonly geo = new IcosahedronGeometry(1, 1);
  private readonly material = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.62, depthWrite: false });
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly scale = new Vector3();
  private readonly color = new Color();
  private next = 0;

  constructor() {
    this.mesh = new InstancedMesh(this.geo, this.material, MAX);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    for (let i = 0; i < MAX; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size0: 1, size1: 1, gravity: 0, drag: 0 });
      this.mesh.setColorAt(i, this.color.set("#ffffff"));
      this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.m);
    }
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, life: number, size0: number, size1: number, gravity = 0, drag = 1.5): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    Object.assign(this.pool[i], { alive: true, x, y, z, vx, vy, vz, age: 0, life, size0, size1, gravity, drag });
    this.mesh.setColorAt(i, this.color.set(color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** A little burst of sparkles, for coins and checkpoints. */
  sparkle(x: number, y: number, z: number, color = "#ffd54d", count = 9): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      const r = 2.5 + Math.random() * 3;
      this.spawn(x, y, z, Math.cos(a) * r, 2 + Math.random() * 3, Math.sin(a) * r, i % 3 === 0 ? "#ffffff" : color, 0.5 + Math.random() * 0.25, 0.28, 0.02, 7, 2.5);
    }
  }

  /**
   * Sparks, chunks, rising smoke and a dust ring for a blast.
   * `power` is 0..1 after distance, so a far explosion spends fewer puffs.
   */
  blast(x: number, y: number, z: number, power: number): void {
    const sparks = 8 + Math.round(power * 8);
    for (let i = 0; i < sparks; i++) {
      const a = (i / sparks) * Math.PI * 2 + Math.random() * 0.35;
      const r = 5 + power * 9 + Math.random() * 4;
      const hot = i % 3 === 0 ? "#fff4c2" : i % 3 === 1 ? "#ffb020" : "#ff5a1f";
      this.spawn(x, y + 1.1, z, Math.cos(a) * r, 3 + Math.random() * (4 + power * 5), Math.sin(a) * r, hot, 0.32 + Math.random() * 0.22, 0.16, 0.03, 5, 1.4);
    }
    const debris = 4 + Math.round(power * 5);
    for (let i = 0; i < debris; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * (4 + power * 6);
      this.spawn(x, y + 0.8, z, Math.cos(a) * r, 4 + Math.random() * 6, Math.sin(a) * r, i % 2 === 0 ? "#6b5344" : "#d9d3c7", 0.55 + Math.random() * 0.25, 0.26, 0.08, 16, 0.55);
    }
    const smoke = 5 + Math.round(power * 6);
    for (let i = 0; i < smoke; i++) {
      const a = (i / smoke) * Math.PI * 2;
      const drift = 1.2 + Math.random() * 1.6;
      this.spawn(x, y + 0.6, z, Math.cos(a) * drift, 1.4 + Math.random() * 1.8, Math.sin(a) * drift, i % 2 === 0 ? "#6e6a66" : "#b7b1a8", 0.85 + power * 0.4, 0.55, 2.2 + power * 1.4, -1.8, 0.65);
    }
    this.ring(x, y, z, "#cbb89a", 6 + power * 10);
  }

  /** A ring of dust, for landings. */
  ring(x: number, y: number, z: number, color: string, strength: number): void {
    const n = Math.min(16, 6 + Math.round(strength));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 4 + strength * 0.5 + Math.random() * 2;
      this.spawn(x, y + 0.3, z, Math.cos(a) * r, 0.8 + Math.random(), Math.sin(a) * r, color, 0.7, 0.5, 1.8 + strength * 0.08, 0, 3);
    }
  }

  /** Advances every puff. Puffs shrink away as the camera flies through them, so none ever fills the screen. */
  update(dt: number, camX: number, camY: number, camZ: number): void {
    let dirty = false;
    for (let i = 0; i < MAX; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      dirty = true;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      p.vy = p.vy * damp - p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = p.age / p.life;
      const dx = p.x - camX;
      const dy = p.y - camY;
      const dz = p.z - camZ;
      const near = smoothstep(3, 9, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const size = (p.size0 + (p.size1 - p.size0) * t) * (1 - smoothstep(0.6, 1, t)) * near;
      this.m.compose(this.pos.set(p.x, p.y, p.z), this.q, this.scale.set(size, size, size));
      this.mesh.setMatrixAt(i, this.m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < MAX; i++) {
      this.pool[i].alive = false;
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.geo.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
