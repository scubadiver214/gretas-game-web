import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, TorusGeometry, type Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { fingerWrap, forearm, palm, type HandMaterials } from "./hands";

export interface CameraRig {
  root: Group;
  /** Lens barrel; stretches along Z with the zoom. */
  lens: Group;
  flash: MeshStandardMaterial;
  materials: Material[];
}

/** A chunky, kid-friendly wildlife camera held in both hands. Lens points down -Z. */
export function createPhotoCamera(m: HandMaterials): CameraRig {
  const body = new MeshPhysicalMaterial({ color: "#ffbf2e", roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const black = new MeshStandardMaterial({ color: "#1b1d22", roughness: 0.7 });
  const silver = new MeshStandardMaterial({ color: "#c9ccd2", metalness: 1, roughness: 0.25 });
  const glass = new MeshPhysicalMaterial({ color: "#10223a", metalness: 0.3, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
  const red = new MeshStandardMaterial({ color: "#e23b2e", roughness: 0.4 });
  const flash = new MeshStandardMaterial({ color: "#f4f6fa", emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.2 });
  const screen = new MeshPhysicalMaterial({ color: "#123049", emissive: "#1d5b8a", emissiveIntensity: 0.35, roughness: 0.1, clearcoat: 1 });

  const root = new Group();
  const add = (mesh: Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, parent: Group = root) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
  };
  add(new Mesh(new RoundedBoxGeometry(0.16, 0.098, 0.066, 4, 0.018), body), 0, 0, 0);
  add(new Mesh(new RoundedBoxGeometry(0.042, 0.088, 0.03, 3, 0.012), black), 0.058, -0.004, -0.032);
  add(new Mesh(new RoundedBoxGeometry(0.05, 0.03, 0.04, 3, 0.01), body), -0.03, 0.058, 0.004);
  add(new Mesh(new BoxGeometry(0.034, 0.016, 0.004), flash), -0.055, 0.033, -0.034);
  add(new Mesh(new CylinderGeometry(0.009, 0.009, 0.008, 16), red), 0.05, 0.053, 0.008);
  add(new Mesh(new CylinderGeometry(0.012, 0.012, 0.01, 18), silver), 0.022, 0.053, 0.008);
  add(new Mesh(new BoxGeometry(0.1, 0.062, 0.003), screen), -0.004, 0.0, 0.034);

  const lens = new Group();
  lens.position.set(-0.012, -0.002, -0.034);
  root.add(lens);
  add(new Mesh(new CylinderGeometry(0.038, 0.04, 0.022, 28), black), 0, 0, -0.01, Math.PI / 2, 0, 0, lens);
  add(new Mesh(new CylinderGeometry(0.033, 0.035, 0.05, 28), black), 0, 0, -0.045, Math.PI / 2, 0, 0, lens);
  for (let i = 0; i < 5; i++) add(new Mesh(new TorusGeometry(0.0345, 0.0017, 6, 28), silver), 0, 0, -0.03 - i * 0.008, 0, 0, 0, lens);
  add(new Mesh(new TorusGeometry(0.031, 0.0035, 8, 28), silver), 0, 0, -0.07, 0, 0, 0, lens);
  add(new Mesh(new CylinderGeometry(0.028, 0.028, 0.004, 28), glass), 0, 0, -0.07, Math.PI / 2, 0, 0, lens);

  // Right hand on the grip, left hand under the lens.
  root.add(palm(m, [0.028, 0.085, 0.06], [0.086, -0.006, -0.004]));
  root.add(fingerWrap(m, { center: [0.058, -0.004], radius: 0.026, start: -0.4, arc: 1.4, zs: [-0.012, -0.032, -0.052] }));
  root.add(forearm(m, [0.1, -0.04, 0.03], [0.2, -0.22, 0.3], 0.029));
  const left = new Group();
  left.add(palm(m, [0.07, 0.022, 0.07], [0, -0.042, -0.04]));
  left.add(fingerWrap(m, { center: [0, 0], radius: 0.038, start: Math.PI - 0.5, arc: 1.6, zs: [-0.03, -0.05] }));
  left.add(forearm(m, [-0.02, -0.055, 0.0], [-0.12, -0.26, 0.24], 0.028));
  lens.add(left);

  return { root, lens, flash, materials: [body, black, silver, glass, red, flash, screen] };
}
