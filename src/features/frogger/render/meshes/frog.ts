import { Group, Mesh, type Object3D } from "three";
import type { Kit } from "../kit";

export interface FrogRig {
  root: Group;
  /** Squash/stretch pivot (sits on the ground). */
  body: Group;
  backLegs: [Object3D, Object3D];
  frontLegs: [Object3D, Object3D];
}

const GREEN = "#3DDC3D";
const BELLY = "#C8F560";
const DARK = "#1F9E2C";

function part(kit: Kit, geo: Mesh["geometry"], color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): Mesh {
  const m = new Mesh(geo, kit.mat(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

/**
 * Chunky low-poly frog facing -Z ("up" the board): round body, big eyes on
 * top, folded back legs that kick out during a hop.
 */
export function buildFrog(kit: Kit, scale = 1): FrogRig {
  const root = new Group();
  const body = new Group();
  root.add(body);

  body.add(part(kit, kit.sphere(0.3, 9, 7), GREEN, 0, 0.2, 0, 1, 0.62, 1.1));
  body.add(part(kit, kit.sphere(0.26, 9, 6), BELLY, 0, 0.13, -0.04, 0.92, 0.42, 1));
  // Back stripe for a little shading contrast.
  body.add(part(kit, kit.sphere(0.12, 6, 4), DARK, 0, 0.36, 0.08, 1.4, 0.35, 1.6));

  const eyeWhite = kit.sphere(0.11, 8, 6);
  const pupil = kit.sphere(0.055, 6, 5);
  for (const side of [-1, 1]) {
    body.add(part(kit, kit.sphere(0.12, 8, 6), GREEN, side * 0.13, 0.33, -0.2));
    body.add(part(kit, eyeWhite, "#FFFFFF", side * 0.13, 0.38, -0.23));
    body.add(part(kit, pupil, "#14161C", side * 0.14, 0.4, -0.32));
    // Rosy cheeks keep it friendly.
    body.add(part(kit, kit.sphere(0.04, 5, 4), "#FF8FB1", side * 0.2, 0.22, -0.3));
  }

  const legGeo = kit.sphere(0.12, 6, 5);
  const footGeo = kit.box(0.16, 0.04, 0.2);
  const makeLeg = (x: number, z: number, big: boolean): Object3D => {
    const pivot = new Group();
    pivot.position.set(x, 0.1, z);
    const s = big ? 1 : 0.7;
    pivot.add(part(kit, legGeo, GREEN, 0, 0, 0, 1.1 * s, 0.7 * s, 1.6 * s));
    pivot.add(part(kit, footGeo, DARK, x > 0 ? 0.05 : -0.05, -0.08, big ? 0.12 : -0.05, s, 1, s));
    body.add(pivot);
    return pivot;
  };
  const backLegs: [Object3D, Object3D] = [makeLeg(-0.27, 0.14, true), makeLeg(0.27, 0.14, true)];
  const frontLegs: [Object3D, Object3D] = [makeLeg(-0.2, -0.2, false), makeLeg(0.2, -0.2, false)];

  root.scale.setScalar(scale);
  return { root, body, backLegs, frontLegs };
}
