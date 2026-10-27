import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type Material,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { fingerWrap, forearm, palm, type HandMaterials } from "./hands";

export interface GunRig {
  root: Group;
  /** Slides back towards the player when pumping. */
  pump: Group;
  leftHand: Group;
  rightHand: Group;
  /** A shell held in the left hand while reloading. */
  heldShell: Group;
  muzzle: Object3D;
  ejectPort: Object3D;
  loadPort: Object3D;
}

export interface ViewmodelMaterials extends HandMaterials {
  steel: Material;
  darkSteel: Material;
  wood: Material;
  rubber: Material;
  brass: Material;
  shellRed: Material;
}

export function createViewmodelMaterials(o: { skin: string; sleeve: string; wood: Texture }): ViewmodelMaterials {
  const sleeve = new Color(o.sleeve);
  return {
    skin: new MeshStandardMaterial({ color: o.skin, roughness: 0.62, metalness: 0 }),
    sleeve: new MeshStandardMaterial({ color: sleeve, roughness: 0.92, metalness: 0 }),
    cuff: new MeshStandardMaterial({ color: sleeve.clone().multiplyScalar(0.7), roughness: 0.9 }),
    steel: new MeshStandardMaterial({ color: "#45474b", metalness: 0.75, roughness: 0.32 }),
    darkSteel: new MeshStandardMaterial({ color: "#1d1e20", metalness: 0.5, roughness: 0.48 }),
    wood: new MeshPhysicalMaterial({ map: o.wood, color: "#ffffff", roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18 }),
    rubber: new MeshStandardMaterial({ color: "#171717", roughness: 0.95 }),
    brass: new MeshStandardMaterial({ color: "#d4a94e", metalness: 1, roughness: 0.28 }),
    shellRed: new MeshStandardMaterial({ color: "#c4231d", roughness: 0.45, metalness: 0.05 }),
  };
}

export function shellMesh(m: ViewmodelMaterials): Group {
  const g = new Group();
  const hull = new Mesh(new CylinderGeometry(0.0105, 0.0105, 0.055, 14), m.shellRed);
  const base = new Mesh(new CylinderGeometry(0.0115, 0.0115, 0.014, 14), m.brass);
  base.position.y = -0.03;
  const rim = new Mesh(new TorusGeometry(0.0108, 0.0016, 6, 16), m.brass);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.037;
  g.add(hull, base, rim);
  return g;
}

/** Side profile of the stock (back = +Z), extruded and centred on X. */
function stockGeometry(): ExtrudeGeometry {
  const s = new Shape();
  const pts: [number, number][] = [
    [0.0, 0.03],
    [0.06, 0.031],
    [0.2, 0.04],
    [0.37, 0.05],
    [0.385, 0.047],
    [0.395, -0.1],
    [0.385, -0.118],
    [0.25, -0.083],
    [0.1, -0.043],
    [0.045, -0.036],
    [0.0, -0.032],
  ];
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 0.036, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 4, curveSegments: 6 });
  g.translate(0, 0, -0.018);
  g.rotateY(-Math.PI / 2);
  // Shape x was "backwards"; after the turn it runs along +Z. Scale UVs so the grain runs the length.
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.2, uv.getY(i) * 2.2 + 0.3);
  return g;
}

/**
 * A pump-action shotgun with both hands on it. Gun space: the receiver sits at the
 * origin, the barrel runs down -Z, the stock up +Z towards the player.
 */
export function createShotgun(m: ViewmodelMaterials): GunRig {
  const root = new Group();
  const add = (mesh: Mesh, parent: Object3D = root) => {
    parent.add(mesh);
    return mesh;
  };
  const at = (mesh: Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    return mesh;
  };

  // Receiver with ejection port and a thin gold inlay.
  add(new Mesh(new RoundedBoxGeometry(0.044, 0.072, 0.22, 3, 0.009), m.steel));
  add(at(new Mesh(new BoxGeometry(0.003, 0.022, 0.07), m.darkSteel), 0.022, 0.014, -0.02));
  for (const side of [1, -1]) add(at(new Mesh(new BoxGeometry(0.0015, 0.0035, 0.17), m.brass), 0.0225 * side, -0.02, 0));
  add(at(new Mesh(new BoxGeometry(0.02, 0.012, 0.18), m.darkSteel), 0, -0.04, 0.0));

  // Barrel, vent rib, bead and magazine tube.
  add(at(new Mesh(new CylinderGeometry(0.0118, 0.0128, 0.68, 22), m.steel), 0, 0.017, -0.45, Math.PI / 2));
  add(at(new Mesh(new TorusGeometry(0.0118, 0.0022, 8, 22), m.darkSteel), 0, 0.017, -0.79));
  add(at(new Mesh(new BoxGeometry(0.008, 0.0045, 0.66), m.darkSteel), 0, 0.0315, -0.45));
  for (let i = 0; i < 11; i++) add(at(new Mesh(new BoxGeometry(0.004, 0.004, 0.006), m.darkSteel), 0, 0.0285, -0.15 - i * 0.06));
  add(at(new Mesh(new SphereGeometry(0.0038, 10, 8), m.brass), 0, 0.036, -0.775));
  add(at(new Mesh(new CylinderGeometry(0.0108, 0.0108, 0.5, 18), m.darkSteel), 0, -0.013, -0.36, Math.PI / 2));
  add(at(new Mesh(new CylinderGeometry(0.0128, 0.0128, 0.035, 18), m.steel), 0, -0.013, -0.62, Math.PI / 2));
  add(at(new Mesh(new BoxGeometry(0.016, 0.042, 0.012), m.steel), 0, 0.002, -0.6));

  // Trigger group.
  add(at(new Mesh(new TorusGeometry(0.019, 0.0035, 8, 18, Math.PI * 1.1), m.darkSteel), 0, -0.043, 0.055, 0, Math.PI / 2, Math.PI * 0.95));
  add(at(new Mesh(new BoxGeometry(0.004, 0.022, 0.006), m.steel), 0, -0.05, 0.05, -0.25));
  add(at(new Mesh(new CylinderGeometry(0.004, 0.004, 0.05, 10), m.steel), 0, -0.03, 0.088, 0, 0, Math.PI / 2));

  // Walnut stock and rubber recoil pad.
  const stock = add(new Mesh(stockGeometry(), m.wood));
  stock.position.set(0, -0.002, 0.108);
  add(at(new Mesh(new RoundedBoxGeometry(0.046, 0.17, 0.022, 2, 0.008), m.rubber), 0, -0.032, 0.508, -0.07));

  // Pump (forend): grooved walnut sleeve around the magazine tube.
  const pump = new Group();
  pump.position.set(0, -0.013, -0.3);
  root.add(pump);
  add(at(new Mesh(new CylinderGeometry(0.024, 0.0235, 0.2, 24), m.wood), 0, 0, 0, Math.PI / 2), pump);
  for (let i = 0; i < 7; i++) add(at(new Mesh(new TorusGeometry(0.0236, 0.0012, 6, 24), m.rubber), 0, 0, -0.06 + i * 0.02), pump);
  add(at(new Mesh(new BoxGeometry(0.006, 0.012, 0.14), m.darkSteel), 0.016, 0.022, 0.1), pump);
  add(at(new Mesh(new BoxGeometry(0.006, 0.012, 0.14), m.darkSteel), -0.016, 0.022, 0.1), pump);

  const muzzle = new Object3D();
  muzzle.position.set(0, 0.017, -0.8);
  root.add(muzzle);
  const ejectPort = new Object3D();
  ejectPort.position.set(0.026, 0.016, -0.02);
  root.add(ejectPort);
  const loadPort = new Object3D();
  loadPort.position.set(0, -0.05, -0.02);
  root.add(loadPort);

  // Right hand round the wrist of the stock, finger on the trigger, arm off to the lower right.
  const rightHand = new Group();
  rightHand.add(palm(m, [0.026, 0.078, 0.085], [0.034, -0.008, 0.135], [0, 0, -0.1]));
  rightHand.add(fingerWrap(m, { center: [0, -0.01], radius: 0.034, start: Math.PI - 0.3, arc: Math.PI + 0.35, zs: [0.108, 0.13, 0.152] }));
  rightHand.add(fingerWrap(m, { center: [0, -0.03], radius: 0.022, start: -0.2, arc: 1.25, zs: [0.058] }));
  rightHand.add(fingerWrap(m, { center: [0, -0.004], radius: 0.034, start: 0.15, arc: 1.65, zs: [0.12], tube: 0.0105 }));
  rightHand.add(forearm(m, [0.045, -0.035, 0.19], [0.15, -0.23, 0.46], 0.03));
  root.add(rightHand);

  // Left hand cradling the pump, arm down to the lower left.
  const leftHand = new Group();
  leftHand.add(palm(m, [0.07, 0.024, 0.09], [0.004, -0.037, 0], [0, 0, 0.25]));
  leftHand.add(fingerWrap(m, { center: [0, 0], radius: 0.026, start: Math.PI - 0.55, arc: 1.95, zs: [-0.035, -0.012, 0.011, 0.033] }));
  leftHand.add(fingerWrap(m, { center: [0, 0], radius: 0.026, start: -Math.PI / 2 + 0.35, arc: 1.15, zs: [0.03], tube: 0.0105 }));
  leftHand.add(forearm(m, [-0.016, -0.048, 0.03], [-0.32, -0.24, 0.4], 0.028));
  pump.add(leftHand);

  const heldShell = shellMesh(m);
  heldShell.rotation.x = Math.PI / 2;
  heldShell.position.set(0.0, -0.035, 0.0);
  heldShell.visible = false;
  leftHand.add(heldShell);

  return { root, pump, leftHand, rightHand, heldShell, muzzle, ejectPort, loadPort };
}
