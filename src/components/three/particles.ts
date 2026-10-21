import { Color, DynamicDrawUsage, IcosahedronGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from "three";

const MAX = 260;

interface P {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
}

const SPLASH = ["#E0F2FF", "#9AD4FF", "#FFFFFF", "#5FB4FF"];
const SPARKLE = ["#FFD54D", "#3DFF88", "#FFFFFF", "#B6FF3B"];
const FIREWORK = ["#FF4FD8", "#41C9FF", "#FFD54D", "#3DFF88", "#FF6A57", "#B78AFF"];
const SMOKE = ["#4B4F58", "#6B7080", "#3A3D44"];

/**
 * One instanced mesh for every effect particle (splashes, sparkles, dust,
 * fireworks). Fixed pool, no allocation per frame.
 */
export class Particles {
  readonly mesh: InstancedMesh;
  private readonly pool: P[] = [];
  private readonly geo = new IcosahedronGeometry(1, 0);
  private readonly material = new MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.95, depthWrite: false });
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3();
  private readonly c = new Color();
  private next = 0;

  constructor() {
    this.mesh = new InstancedMesh(this.geo, this.material, MAX);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, size: 0.05, gravity: 0 });
      this.mesh.setColorAt(i, this.c.set("#FFFFFF"));
      this.m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this.m);
    }
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, life: number, size: number, gravity: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    const p = this.pool[i];
    Object.assign(p, { alive: true, x, y, z, vx, vy, vz, life, maxLife: life, size, gravity });
    this.mesh.setColorAt(i, this.c.set(color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  splash(x: number, z: number): void {
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * 1.6;
      this.spawn(x, 0.05, z, Math.cos(a) * r, 2.2 + Math.random() * 2.4, Math.sin(a) * r, SPLASH[i % SPLASH.length], 0.7 + Math.random() * 0.3, 0.05 + Math.random() * 0.04, 9);
    }
  }

  sparkle(x: number, z: number): void {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 1.2;
      this.spawn(x, 0.4, z, Math.cos(a) * r, 1.5 + Math.random() * 2.2, Math.sin(a) * r, SPARKLE[i % SPARKLE.length], 0.9 + Math.random() * 0.5, 0.045 + Math.random() * 0.04, 2.5);
    }
  }

  dust(x: number, z: number): void {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(x, 0.05, z, Math.cos(a) * 0.8, 0.4 + Math.random() * 0.4, Math.sin(a) * 0.8, "#D9DCE3", 0.35, 0.04, 1);
    }
  }

  /** Slow grey puffs that drift upwards (burnt food). */
  smoke(x: number, y: number, z: number): void {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      const grey = SMOKE[i % SMOKE.length];
      this.spawn(x + Math.cos(a) * 0.15, y, z + Math.sin(a) * 0.15, Math.cos(a) * 0.15, 0.7 + Math.random() * 0.4, Math.sin(a) * 0.15, grey, 1.1 + Math.random() * 0.5, 0.09 + Math.random() * 0.05, -0.2);
    }
  }

  firework(x: number, y: number, z: number): void {
    const color = FIREWORK[Math.floor(Math.random() * FIREWORK.length)];
    const alt = FIREWORK[Math.floor(Math.random() * FIREWORK.length)];
    for (let i = 0; i < 40; i++) {
      // Even-ish sphere burst.
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const speed = 2.4 + Math.random() * 0.8;
      this.spawn(x, y, z, Math.cos(a) * r * speed, u * speed, Math.sin(a) * r * speed, i % 3 ? color : alt, 1 + Math.random() * 0.4, 0.06, 1.6);
    }
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < MAX; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < -0.05 && p.gravity > 3) p.life = Math.min(p.life, 0.05);
      const k = p.size * Math.min(1, (p.life / p.maxLife) * 1.6);
      this.m.compose(this.v.set(p.x, p.y, p.z), this.q, this.s.set(k, k, k));
      this.mesh.setMatrixAt(i, this.m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear(): void {
    for (let i = 0; i < MAX; i++) {
      this.pool[i].alive = false;
      this.m.makeScale(0, 0, 0);
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
