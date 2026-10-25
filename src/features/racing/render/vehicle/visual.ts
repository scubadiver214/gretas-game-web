import { BufferGeometry, Color, Euler, Float32BufferAttribute, type Group, Matrix4, Mesh, Quaternion, Vector3, type Material } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MeshKit } from "@/components/three/kit";

/** Everything a vehicle visual needs to draw one frame. Produced by the renderer from the engine. */
export interface VehicleVisualState {
  x: number;
  y: number;
  z: number;
  heading: number;
  steer: number;
  wheelSpin: number;
  accel: number;
  yawRate: number;
  speed: number;
  vy: number;
  slope: number;
  bumpiness: number;
  grounded: boolean;
  braking: boolean;
  boosting: boolean;
  /** Seconds of respawn flicker remaining. */
  grace: number;
  /** Clock for flutter and flicker. */
  time: number;
}

/**
 * What the renderer needs from a car. The procedural Fitzmagic car is the first
 * implementation; a glTF loader can provide another (same `update` contract, same
 * root transform convention: origin on the ground, nose toward +z) without touching
 * the engine, camera or HUD.
 */
export interface VehicleVisual {
  readonly root: Group;
  update(state: VehicleVisualState, dt: number): void;
  /** The suspension takes a landing. */
  land(impact: number): void;
}

export type V3 = [number, number, number];

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpP = new Vector3();
const tmpS = new Vector3();

/** Collects primitives and merges them into one mesh per material, so a whole car is a handful of draw calls. */
export class Parts {
  private readonly groups = new Map<string, { mat: Material; geos: BufferGeometry[] }>();

  /** `oy` shifts every part down so the group can pivot about the car's middle. */
  constructor(private readonly oy = 0) {}

  add(mat: Material, geo: BufferGeometry, p: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    // Primitives are a mix of indexed and non-indexed geometry; merging needs them all alike.
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    tmpE.set(rot[0], rot[1], rot[2]);
    tmpM.compose(tmpP.set(p[0], p[1] - this.oy, p[2]), tmpQ.setFromEuler(tmpE), tmpS.set(scale[0], scale[1], scale[2]));
    g.applyMatrix4(tmpM);
    let group = this.groups.get(mat.uuid);
    if (!group) {
      group = { mat, geos: [] };
      this.groups.set(mat.uuid, group);
    }
    group.geos.push(g);
    return this;
  }

  meshes(kit: MeshKit, name: string, shadow = true): Mesh[] {
    const out: Mesh[] = [];
    let n = 0;
    for (const { mat, geos } of this.groups.values()) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      kit.geo(`${name}-${n++}`, () => merged);
      const mesh = new Mesh(merged, mat);
      mesh.castShadow = shadow;
      out.push(mesh);
    }
    return out;
  }
}

/** A geometry with one flat colour baked in as vertex colours, so one material can carry several colours. */
export function colored(geo: BufferGeometry, hex: string): BufferGeometry {
  const c = new Color(hex);
  const n = geo.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new Float32BufferAttribute(arr, 3));
  return geo;
}
