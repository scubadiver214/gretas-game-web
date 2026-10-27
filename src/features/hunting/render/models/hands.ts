import { CapsuleGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, TorusGeometry, Vector3, type Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export interface HandMaterials {
  skin: Material;
  sleeve: Material;
  cuff: Material;
}

/**
 * Fingers that curl around a cylinder-ish grip running along Z. Angles are around
 * the Z axis: 0 = right (+X), PI/2 = top, PI = left, 3PI/2 = bottom.
 */
export function fingerWrap(m: HandMaterials, o: { center: [number, number]; radius: number; start: number; arc: number; zs: number[]; tube?: number }): Group {
  const g = new Group();
  o.zs.forEach((z, i) => {
    const tube = (o.tube ?? 0.0095) * (i === o.zs.length - 1 ? 0.85 : 1);
    const finger = new Mesh(new TorusGeometry(o.radius + tube * 0.6, tube, 8, 14, o.arc), m.skin);
    finger.position.set(o.center[0], o.center[1], z);
    finger.rotation.z = o.start;
    g.add(finger);
    const tipAngle = o.start + o.arc;
    const tip = new Mesh(new SphereGeometry(tube * 1.02, 8, 6), m.skin);
    tip.position.set(o.center[0] + Math.cos(tipAngle) * (o.radius + tube * 0.6), o.center[1] + Math.sin(tipAngle) * (o.radius + tube * 0.6), z);
    g.add(tip);
  });
  return g;
}

export function palm(m: HandMaterials, size: [number, number, number], pos: [number, number, number], rot: [number, number, number] = [0, 0, 0]): Mesh {
  const mesh = new Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(...size) * 0.45), m.skin);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  return mesh;
}

/** Forearm from the wrist back towards the player, with a shirt sleeve and cuff. */
export function forearm(m: HandMaterials, wrist: [number, number, number], elbow: [number, number, number], radius = 0.028): Group {
  const g = new Group();
  const a = new Vector3(...wrist);
  const b = new Vector3(...elbow);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a).normalize();
  const orient = (mesh: Mesh, at: Vector3) => {
    mesh.position.copy(at);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
  };
  const wristMesh = new Mesh(new CapsuleGeometry(radius * 0.82, len * 0.12, 6, 12), m.skin);
  orient(wristMesh, a.clone().add(dir.clone().multiplyScalar(len * 0.08)));
  g.add(wristMesh);
  const sleeve = new Mesh(new CylinderGeometry(radius * 1.3, radius * 1.75, len * 0.86, 16), m.sleeve);
  orient(sleeve, mid.clone().add(dir.clone().multiplyScalar(len * 0.07)));
  g.add(sleeve);
  const cuff = new Mesh(new TorusGeometry(radius * 1.28, radius * 0.22, 6, 18), m.cuff);
  cuff.position.copy(a.clone().add(dir.clone().multiplyScalar(len * 0.14)));
  cuff.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), dir);
  g.add(cuff);
  return g;
}
