import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  Vector3,
} from "three";
import type { MeshKit } from "@/components/three/kit";
import { clamp01, smoothstep } from "../../engine/math";
import type { Collectible } from "../../world/content";
import type { RacingTextures } from "../textures";

const POP_SECONDS = 0.3;
/** Pickups further than this from the camera are not animated (nobody can see them). */
const ANIMATE_RANGE = 170;

const m = new Matrix4();
const q = new Quaternion();
const p = new Vector3();
const s = new Vector3();
const up = new Vector3(0, 1, 0);
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

/**
 * Coins and gems: one instanced mesh each (plus a light beam over every gem so a
 * hidden one can be spotted). They spin and bob, pop when collected, and
 * pop back in when a new lap restores them. State lives here, driven by engine events.
 */
export class Pickups {
  readonly group = new Group();
  private readonly coins: InstancedMesh | null;
  private readonly gems: InstancedMesh | null;
  private readonly beams: InstancedMesh | null;
  /** Instance index of each collectible within its own mesh. */
  private readonly slot: Int32Array;
  /** Time each pickup was collected (-1 = available). */
  private readonly takenAt: Float64Array;
  /** Time a pop-in started (-1 = not popping in). */
  private readonly returnAt: Float64Array;
  private readonly hidden: Uint8Array;

  constructor(
    private readonly items: readonly Collectible[],
    kit: MeshKit,
    textures: RacingTextures,
  ) {
    this.slot = new Int32Array(items.length);
    this.takenAt = new Float64Array(items.length).fill(-1);
    this.returnAt = new Float64Array(items.length).fill(-1);
    this.hidden = new Uint8Array(items.length);
    let nCoins = 0;
    let nGems = 0;
    items.forEach((c, i) => {
      this.slot[i] = c.kind === "coin" ? nCoins++ : nGems++;
    });

    if (nCoins) {
      const geo = kit.geo("coin", () => new CylinderGeometry(0.95, 0.95, 0.2, 24).rotateX(Math.PI / 2));
      const mat = kit.track(
        new MeshStandardMaterial({ map: textures.coin, emissiveMap: textures.coin, emissive: "#ffb300", emissiveIntensity: 0.55, metalness: 0.45, roughness: 0.35 }),
      );
      this.coins = new InstancedMesh(geo, mat, nCoins);
      this.coins.castShadow = false;
      this.coins.frustumCulled = false;
      this.group.add(this.coins);
    } else this.coins = null;

    if (nGems) {
      const geo = kit.geo("gem", () => new OctahedronGeometry(1, 0).scale(0.9, 1.3, 0.9));
      const mat = kit.mat("#ff3b6b", { emissive: "#ff1e56", emissiveIntensity: 0.9, rough: 0.2, metal: 0.3 });
      this.gems = new InstancedMesh(geo, mat, nGems);
      this.gems.frustumCulled = false;
      const beamGeo = kit.geo("gem-beam", () => new CylinderGeometry(0.9, 1.1, 8, 14, 1, true).translate(0, 4, 0));
      const beamMat = kit.track(new MeshBasicMaterial({ color: "#ff7ab0", transparent: true, opacity: 0.24, depthWrite: false, blending: AdditiveBlending, side: DoubleSide }));
      this.beams = new InstancedMesh(beamGeo, beamMat, nGems);
      this.beams.frustumCulled = false;
      this.group.add(this.gems, this.beams);
    } else {
      this.gems = null;
      this.beams = null;
    }
    this.reset(-100);
    for (let i = 0; i < items.length; i++) this.write(i, 0, 0, 1);
  }

  /** Everything is available again (a new lap, or a restarted race). */
  reset(time: number): void {
    for (let i = 0; i < this.items.length; i++) {
      const wasTaken = this.takenAt[i] >= 0;
      this.takenAt[i] = -1;
      // A restart (time < 0) restores silently; a new lap pops them back in with a ripple.
      this.returnAt[i] = wasTaken && time >= 0 ? time + (i % 24) * 0.012 : -1;
      this.hidden[i] = wasTaken && time >= 0 ? 1 : 0;
    }
  }

  /** The player picked this one up. */
  collect(id: number, time: number): void {
    this.takenAt[id] = time;
    this.hidden[id] = 0;
  }

  /** Where a pickup is, for sparkles. */
  position(id: number): Collectible {
    return this.items[id];
  }

  update(time: number, camX: number, camY: number, camZ: number): void {
    const n = this.items.length;
    for (let i = 0; i < n; i++) {
      const c = this.items[i];
      const taken = this.takenAt[i] >= 0;
      if (taken) {
        const t = clamp01((time - this.takenAt[i]) / POP_SECONDS);
        if (t >= 1) {
          if (!this.hidden[i]) {
            this.hide(i);
            this.hidden[i] = 1;
          }
          continue;
        }
        // Pop: swell, rise and vanish.
        this.write(i, time, t * 1.4, (1 - t * t) * (1 + t * 0.6));
        continue;
      }
      let scale = 1;
      if (this.returnAt[i] >= 0) {
        const t = (time - this.returnAt[i]) / 0.26;
        if (t < 0) continue;
        if (t >= 1) this.returnAt[i] = -1;
        else scale = 1 - Math.pow(1 - t, 3);
        this.hidden[i] = 0;
      } else if (this.hidden[i]) continue;
      const dx = c.x - camX;
      const dz = c.z - camZ;
      const d2 = dx * dx + dz * dz;
      if (d2 > ANIMATE_RANGE * ANIMATE_RANGE) continue;
      // A coin the camera is flying past would otherwise fill the screen: shrink it away up close.
      const dy = c.y - camY;
      const near = smoothstep(2.5, 6.5, Math.sqrt(d2 + dy * dy));
      this.write(i, time, 0, scale * near);
    }
    if (this.coins) this.coins.instanceMatrix.needsUpdate = true;
    if (this.gems) this.gems.instanceMatrix.needsUpdate = true;
    if (this.beams) this.beams.instanceMatrix.needsUpdate = true;
  }

  private hide(i: number): void {
    const c = this.items[i];
    const mesh = c.kind === "coin" ? this.coins : this.gems;
    mesh?.setMatrixAt(this.slot[i], HIDDEN);
    if (c.kind === "gem") this.beams?.setMatrixAt(this.slot[i], HIDDEN);
  }

  private write(i: number, time: number, rise: number, k: number): void {
    const c = this.items[i];
    const phase = (i * 0.77) % (Math.PI * 2);
    const spin = time * (c.kind === "coin" ? 2.8 : 1.6) + phase;
    const bob = Math.sin(time * 2.1 + phase) * (c.kind === "coin" ? 0.14 : 0.25);
    q.setFromAxisAngle(up, spin);
    p.set(c.x, c.y + bob + rise, c.z);
    s.set(k, k, k);
    m.compose(p, q, s);
    if (c.kind === "coin") this.coins?.setMatrixAt(this.slot[i], m);
    else {
      this.gems?.setMatrixAt(this.slot[i], m);
      q.identity();
      p.set(c.x, c.y - 1.3, c.z);
      s.set(k, k, k);
      m.compose(p, q, s);
      this.beams?.setMatrixAt(this.slot[i], m);
    }
  }
}
