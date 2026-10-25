import { BoxGeometry, BufferGeometry, CapsuleGeometry, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry } from "three";
import type { MeshKit } from "@/components/three/kit";
import { mulberry32 } from "@/lib/rng";
import type { AnimalKind } from "../../world/track";
import { merge, part } from "./propKit";

/** One animal, ready to put in the scene. It stands at the origin facing +z; the caller moves and turns `root`. */
export interface AnimalVisual {
  root: Group;
  /** `moving` makes it run; `speed` (m/s) sets how fast the legs go. `time` is the scene clock for idle sway. */
  update(dt: number, moving: boolean, speed: number, time: number): void;
}

interface Anatomy {
  body: BufferGeometry;
  leg: BufferGeometry;
  /** Where each leg's top joint is, front-left, front-right, back-left, back-right. */
  hips: [number, number, number][];
  tail: BufferGeometry;
  tailAt: [number, number, number];
  /** Radians of leg swing at a flat run. */
  swing: number;
  /** Leg-cycle radians per metre run. */
  stride: number;
  /** How high the body bounces at a run. */
  bob: number;
}

const SPOT = "#8e4f22";

/** A big cat: lions have the mane, tigers have stripes and a white muzzle. */
function catAnatomy(kind: "lion" | "tiger"): Anatomy {
  const lion = kind === "lion";
  const fur = lion ? "#dba24a" : "#f08a2c";
  const belly = lion ? "#ecc57e" : "#fff0da";
  const dark = lion ? "#7a3e14" : "#17110a";
  const parts: BufferGeometry[] = [
    part(new CapsuleGeometry(0.46, 1.1, 4, 10), fur, [0, 1.2, 0], [Math.PI / 2, 0, 0]),
    part(new SphereGeometry(0.52, 10, 8), fur, [0, 1.22, 0.55]),
    part(new SphereGeometry(0.4, 10, 8), belly, [0, 1.0, 0.1], [0, 0, 0], [1, 0.55, 2.2]),
    // Head, snout, nose, eyes, ears.
    part(new SphereGeometry(0.4, 10, 8), fur, [0, 1.55, 1.2]),
    part(new BoxGeometry(0.34, 0.26, 0.4), lion ? "#efd08c" : "#fff4e2", [0, 1.43, 1.55]),
    part(new BoxGeometry(0.14, 0.09, 0.08), "#2a1a14", [0, 1.52, 1.77]),
    part(new SphereGeometry(0.055, 6, 5), "#1b1209", [-0.17, 1.66, 1.5]),
    part(new SphereGeometry(0.055, 6, 5), "#1b1209", [0.17, 1.66, 1.5]),
    part(new SphereGeometry(0.13, 7, 5), lion ? "#b87a34" : fur, [-0.27, 1.9, 1.1], [0, 0, 0], [1, 1, 0.55]),
    part(new SphereGeometry(0.13, 7, 5), lion ? "#b87a34" : fur, [0.27, 1.9, 1.1], [0, 0, 0], [1, 1, 0.55]),
  ];
  if (lion) {
    parts.push(part(new IcosahedronGeometry(0.7, 1), "#8a4a1a", [0, 1.5, 0.95], [0, 0, 0], [1, 1.05, 0.85]));
    parts.push(part(new IcosahedronGeometry(0.58, 1), "#a86020", [0, 1.45, 0.72], [0, 0, 0], [1.1, 1.0, 0.8]));
  } else {
    for (const z of [-0.5, -0.25, 0, 0.25, 0.5]) parts.push(part(new TorusGeometry(0.47, 0.035, 4, 16), dark, [0, 1.2, z]));
    parts.push(part(new BoxGeometry(0.5, 0.05, 0.05), dark, [0, 1.8, 1.3]), part(new BoxGeometry(0.34, 0.05, 0.05), dark, [0, 1.74, 1.15]));
  }
  const leg = new CylinderGeometry(0.15, 0.12, 0.95, 7).translate(0, -0.475, 0);
  const paw = new SphereGeometry(0.16, 7, 5).scale(1, 0.6, 1.3).translate(0, -0.93, 0.05);
  const tail = merge([
    part(new CylinderGeometry(0.05, 0.06, 1.3, 6), fur, [0, 0, -0.65], [Math.PI / 2, 0, 0]),
    part(new SphereGeometry(0.13, 7, 6), dark, [0, 0, -1.34]),
  ]);
  return {
    body: merge(parts),
    leg: merge([part(leg, fur, [0, 0, 0]), part(paw, belly, [0, 0, 0])]),
    hips: [
      [-0.3, 0.95, 0.62],
      [0.3, 0.95, 0.62],
      [-0.3, 0.95, -0.62],
      [0.3, 0.95, -0.62],
    ],
    tail,
    tailAt: [0, 1.35, -1.0],
    swing: 0.95,
    stride: 2.7,
    bob: 0.13,
  };
}

/** A giraffe: long legs, a long neck and patches. */
function giraffeAnatomy(): Anatomy {
  const fur = "#eab94c";
  const rnd = mulberry32(77);
  const parts: BufferGeometry[] = [
    part(new CapsuleGeometry(0.5, 0.9, 4, 10), fur, [0, 2.85, 0], [Math.PI / 2, 0, 0], [1, 1, 0.92]),
    part(new SphereGeometry(0.5, 10, 8), fur, [0, 2.85, 0.5]),
    // Neck leaning forward, head, snout, ears, horns.
    part(new CylinderGeometry(0.2, 0.3, 2.3, 8), fur, [0, 4.2, 1.05], [0.27, 0, 0]),
    part(new SphereGeometry(0.28, 9, 7), fur, [0, 5.4, 1.45], [0, 0, 0], [0.85, 0.85, 1.25]),
    part(new BoxGeometry(0.3, 0.24, 0.36), "#f3d68c", [0, 5.3, 1.8]),
    part(new BoxGeometry(0.12, 0.07, 0.06), "#2a1a14", [0, 5.34, 2.0]),
    part(new SphereGeometry(0.05, 6, 5), "#1b1209", [-0.16, 5.5, 1.62]),
    part(new SphereGeometry(0.05, 6, 5), "#1b1209", [0.16, 5.5, 1.62]),
    part(new SphereGeometry(0.14, 7, 5), "#c98f3a", [-0.3, 5.55, 1.35], [0, 0, 0.5], [1, 0.5, 0.5]),
    part(new SphereGeometry(0.14, 7, 5), "#c98f3a", [0.3, 5.55, 1.35], [0, 0, -0.5], [1, 0.5, 0.5]),
    part(new CylinderGeometry(0.04, 0.05, 0.34, 5), fur, [-0.1, 5.78, 1.42]),
    part(new CylinderGeometry(0.04, 0.05, 0.34, 5), fur, [0.1, 5.78, 1.42]),
    part(new SphereGeometry(0.075, 6, 5), "#4b2a16", [-0.1, 5.98, 1.42]),
    part(new SphereGeometry(0.075, 6, 5), "#4b2a16", [0.1, 5.98, 1.42]),
    // A dark mane running down the back of the neck.
    part(new BoxGeometry(0.09, 2.2, 0.12), "#7a4a22", [0, 4.25, 0.78], [0.27, 0, 0]),
  ];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const z = -0.7 + rnd() * 1.6;
      const y = 2.5 + rnd() * 0.7;
      parts.push(part(new SphereGeometry(0.17 + rnd() * 0.07, 6, 5), SPOT, [side * 0.49, y, z], [0, 0, 0], [0.3, 1, 1.2]));
    }
    for (let i = 0; i < 7; i++) {
      const t = rnd();
      parts.push(part(new SphereGeometry(0.1 + rnd() * 0.05, 6, 5), SPOT, [side * (0.27 - t * 0.07), 3.3 + t * 1.9, 0.75 + t * 0.6], [0, 0, 0], [0.3, 1, 1.2]));
    }
  }
  const leg = new CylinderGeometry(0.14, 0.1, 2.4, 7).translate(0, -1.2, 0);
  const hoof = new BoxGeometry(0.22, 0.14, 0.3).translate(0, -2.36, 0.03);
  const tail = merge([
    part(new CylinderGeometry(0.035, 0.045, 1.3, 5), fur, [0, -0.65, -0.12], [-0.18, 0, 0]),
    part(new SphereGeometry(0.1, 6, 5), "#4b2a16", [0, -1.32, -0.2]),
  ]);
  return {
    body: merge(parts),
    leg: merge([part(leg, fur, [0, 0, 0]), part(hoof, "#4b2a16", [0, 0, 0]), part(new CylinderGeometry(0.15, 0.15, 0.3, 7), "#8e4f22", [0, -1.0, 0])]),
    hips: [
      [-0.27, 2.45, 0.62],
      [0.27, 2.45, 0.62],
      [-0.27, 2.45, -0.62],
      [0.27, 2.45, -0.62],
    ],
    tail,
    tailAt: [0, 3.0, -0.9],
    swing: 0.55,
    stride: 1.5,
    bob: 0.09,
  };
}

function anatomy(kind: AnimalKind): Anatomy {
  return kind === "giraffe" ? giraffeAnatomy() : catAnatomy(kind);
}

interface Shared {
  a: Anatomy;
  body: BufferGeometry;
  leg: BufferGeometry;
  tail: BufferGeometry;
}

const sharedMaterial = new WeakMap<MeshKit, MeshStandardMaterial>();
const sharedParts = new WeakMap<MeshKit, Map<AnimalKind, Shared>>();

function sharedFor(kind: AnimalKind, kit: MeshKit): Shared {
  let byKind = sharedParts.get(kit);
  if (!byKind) {
    byKind = new Map();
    sharedParts.set(kit, byKind);
  }
  let shared = byKind.get(kind);
  if (!shared) {
    const a = anatomy(kind);
    shared = { a, body: kit.geo(`animal-${kind}-body`, () => a.body), leg: kit.geo(`animal-${kind}-leg`, () => a.leg), tail: kit.geo(`animal-${kind}-tail`, () => a.tail) };
    byKind.set(kind, shared);
  }
  return shared;
}

/** Builds an animal. Geometry and paint are shared through the kit; every animal gets its own meshes so it can pose its legs. */
export function buildAnimal(kind: AnimalKind, kit: MeshKit): AnimalVisual {
  const { a, body, leg: legGeo, tail: tailGeo } = sharedFor(kind, kit);
  let material = sharedMaterial.get(kit);
  if (!material) {
    material = kit.track(new MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, flatShading: true, vertexColors: true }));
    sharedMaterial.set(kit, material);
  }

  const root = new Group();
  const inner = new Group();
  root.add(inner);
  const bodyMesh = new Mesh(body, material);
  bodyMesh.castShadow = true;
  inner.add(bodyMesh);

  const legs: Group[] = [];
  for (const h of a.hips) {
    const pivot = new Group();
    pivot.position.set(h[0], h[1], h[2]);
    const mesh = new Mesh(legGeo, material);
    mesh.castShadow = true;
    pivot.add(mesh);
    inner.add(pivot);
    legs.push(pivot);
  }
  const tail = new Group();
  tail.position.set(a.tailAt[0], a.tailAt[1], a.tailAt[2]);
  tail.add(new Mesh(tailGeo, material));
  inner.add(tail);

  const phases = [0, Math.PI, Math.PI, 0];
  let cycle = 0;
  let run = 0;
  const catTail = kind !== "giraffe";
  return {
    root,
    update(dt, moving, speed, time) {
      const target = moving ? 1 : 0;
      run += (target - run) * Math.min(1, dt * 8);
      if (moving) cycle += speed * a.stride * dt;
      for (let i = 0; i < legs.length; i++) legs[i].rotation.x = Math.sin(cycle + phases[i]) * a.swing * run;
      inner.position.y = Math.abs(Math.sin(cycle)) * a.bob * run;
      inner.rotation.x = Math.sin(cycle * 2) * 0.03 * run;
      tail.rotation.x = catTail ? -0.45 + Math.sin(cycle) * 0.1 * run : 0.2 * run;
      tail.rotation.y = Math.sin(time * (moving ? 7 : 2) + cycle * 0.2) * (catTail ? 0.35 : 0.25);
    },
  };
}
