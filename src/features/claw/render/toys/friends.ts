import { Group, OctahedronGeometry } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";
import { addCheeks, addFace, finishOpts, part } from "./parts";

/** Extra animals, sweets and vehicles. All fit a unit sphere and face +z. */

export function buildPuppy(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, belly, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.85 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.58, 12, 9), fur, 0, -0.34, 0, 1.05, 0.9, 1.05, o));
  g.add(part(kit, kit.sphere(0.38, 10, 8), belly, 0, -0.34, 0.28, 1, 0.85, 0.55, o));
  g.add(part(kit, kit.sphere(0.48, 12, 9), fur, 0, 0.36, 0.12, 1, 0.95, 1, o));
  const snout = part(kit, kit.sphere(0.22, 10, 7), belly, 0, 0.22, 0.52, 1.15, 0.8, 0.85, o);
  g.add(snout);
  g.add(part(kit, kit.sphere(0.08, 6, 5), dark, 0, 0.24, 0.72, 1.2, 0.7, 0.6));
  for (const side of [-1, 1]) {
    const ear = part(kit, kit.sphere(0.18, 8, 6), fur, side * 0.38, 0.52, 0.02, 0.7, 1.6, 0.55, o);
    ear.rotation.z = side * 0.55;
    g.add(ear);
    g.add(part(kit, kit.sphere(0.16, 8, 6), fur, side * 0.52, -0.18, 0.18, 1, 1.15, 1, o));
    g.add(part(kit, kit.sphere(0.2, 8, 6), fur, side * 0.3, -0.82, 0.22, 1, 0.7, 1.15, o));
  }
  const tail = part(kit, kit.sphere(0.14, 8, 6), fur, 0.18, -0.18, -0.62, 0.8, 0.8, 1.6, o);
  tail.rotation.x = 0.4;
  g.add(tail);
  if (prize.id.includes("spot")) {
    for (const [x, y, z] of [
      [-0.28, -0.18, 0.38],
      [0.32, -0.42, 0.22],
      [0.12, 0.55, 0.08],
    ]) {
      g.add(part(kit, kit.sphere(0.1, 6, 5), dark, x, y, z, 1, 0.8, 0.6));
    }
  }
  addFace(kit, g, { y: 0.46, z: 0.5, spread: 0.18, scale: 0.8, smile: false, eye: dark });
  addCheeks(kit, g, 0.3, 0.42, 0.32);
  return g;
}

export function buildKitty(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, inner, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.85 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.56, 12, 9), fur, 0, -0.36, 0, 1, 0.92, 1.05, o));
  g.add(part(kit, kit.sphere(0.46, 12, 9), fur, 0, 0.38, 0.08, 1.05, 0.95, 1, o));
  for (const side of [-1, 1]) {
    const ear = part(kit, kit.cone(0.14, 0.34, 6), fur, side * 0.28, 0.86, -0.02, 1, 1, 1, o);
    ear.rotation.z = -side * 0.28;
    g.add(ear);
    const earIn = part(kit, kit.cone(0.08, 0.2, 5), inner, side * 0.28, 0.82, 0.06);
    earIn.rotation.z = -side * 0.28;
    g.add(earIn);
    g.add(part(kit, kit.sphere(0.18, 8, 6), fur, side * 0.5, -0.22, 0.16, 1, 1.2, 1, o));
    g.add(part(kit, kit.sphere(0.18, 8, 6), fur, side * 0.28, -0.84, 0.22, 1, 0.7, 1.1, o));
  }
  const tail = part(kit, kit.sphere(0.12, 8, 6), fur, 0.42, -0.28, -0.55, 0.7, 0.7, 2.2, o);
  tail.rotation.set(0.5, 0.4, 0.2);
  g.add(tail);
  g.add(part(kit, kit.sphere(0.07, 6, 5), inner, 0, 0.28, 0.52, 1.3, 0.7, 0.6));
  addFace(kit, g, { y: 0.46, z: 0.48, spread: 0.18, scale: 0.8, smile: false, eye: dark });
  addCheeks(kit, g, 0.32, 0.42, 0.32, inner);
  return g;
}

export function buildFrog(kit: MeshKit, prize: PrizeDef): Group {
  const [skin, belly, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.55, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.72, 14, 10), skin, 0, -0.22, 0, 1.05, 0.75, 1, o));
  g.add(part(kit, kit.sphere(0.52, 12, 8), belly, 0, -0.28, 0.28, 1, 0.7, 0.55, o));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.22, 10, 7), skin, side * 0.28, 0.38, 0.28, 1, 1, 1, o));
    g.add(part(kit, kit.sphere(0.12, 8, 6), "#FFFFFF", side * 0.28, 0.44, 0.42));
    g.add(part(kit, kit.sphere(0.06, 6, 5), dark, side * 0.28, 0.44, 0.5));
    g.add(part(kit, kit.sphere(0.22, 8, 6), skin, side * 0.62, -0.42, 0.18, 1.1, 0.55, 1.3, o));
    g.add(part(kit, kit.sphere(0.16, 8, 6), skin, side * 0.38, -0.62, -0.28, 1, 0.55, 1.2, o));
  }
  addCheeks(kit, g, -0.02, 0.55, 0.38, belly);
  const smile = part(kit, kit.torus(0.22, 0.03, 5, 12, Math.PI), dark, 0, -0.12, 0.62, 1.2, 1, 1);
  smile.rotation.z = Math.PI;
  g.add(smile);
  return g;
}

export function buildMonkey(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, face, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.85 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.56, 12, 9), fur, 0, -0.34, 0, 1, 0.95, 0.95, o));
  g.add(part(kit, kit.sphere(0.48, 12, 9), fur, 0, 0.38, 0.06, 1, 0.95, 0.95, o));
  g.add(part(kit, kit.sphere(0.34, 12, 8), face, 0, 0.28, 0.32, 1.15, 1, 0.7, o));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.18, 8, 6), fur, side * 0.48, 0.52, 0, 1, 1, 0.55, o));
    g.add(part(kit, kit.sphere(0.1, 6, 5), face, side * 0.48, 0.52, 0.08, 1, 1, 0.4));
    g.add(part(kit, kit.sphere(0.2, 8, 6), fur, side * 0.52, -0.18, 0.16, 1, 1.2, 1, o));
    g.add(part(kit, kit.sphere(0.2, 8, 6), fur, side * 0.3, -0.84, 0.2, 1, 0.7, 1.1, o));
  }
  const tail = part(kit, kit.torus(0.28, 0.07, 6, 16, Math.PI * 1.4), fur, 0.42, -0.35, -0.42, 1, 1, 1, o);
  tail.rotation.set(0.4, -0.6, 0.8);
  g.add(tail);
  addFace(kit, g, { y: 0.42, z: 0.52, spread: 0.16, scale: 0.75, smile: false, eye: dark });
  addCheeks(kit, g, 0.22, 0.48, 0.28, face);
  if (prize.id.includes("king")) {
    g.add(part(kit, kit.cylinder(0.28, 0.24, 0.16, 8), "#FFD54D", 0, 0.88, 0.04, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(part(kit, kit.cone(0.05, 0.14, 5), "#FFD54D", Math.cos(a) * 0.22, 1.0, 0.04 + Math.sin(a) * 0.22, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
    }
  }
  return g;
}

export function buildOwl(kit: MeshKit, prize: PrizeDef): Group {
  const [feather, belly, beak] = prize.palette;
  const o = finishOpts(prize, { rough: 0.7 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.62, 14, 10), feather, 0, -0.18, 0, 0.95, 1.15, 0.9, o));
  g.add(part(kit, kit.sphere(0.42, 12, 8), belly, 0, -0.28, 0.22, 0.9, 0.95, 0.6, o));
  for (const side of [-1, 1]) {
    const tuft = part(kit, kit.cone(0.1, 0.28, 5), feather, side * 0.28, 0.88, -0.05, 1, 1, 1, o);
    tuft.rotation.z = -side * 0.35;
    g.add(tuft);
    g.add(part(kit, kit.sphere(0.22, 10, 7), "#FFFFFF", side * 0.2, 0.32, 0.42, 1, 1.15, 0.6));
    g.add(part(kit, kit.sphere(0.1, 8, 6), "#14161C", side * 0.2, 0.32, 0.52));
    const wing = part(kit, kit.sphere(0.3, 8, 6), feather, side * 0.58, -0.1, 0, 0.45, 1.15, 0.8, o);
    wing.rotation.z = side * 0.25;
    g.add(wing);
    g.add(part(kit, kit.sphere(0.14, 8, 6), beak, side * 0.18, -0.92, 0.18, 1.1, 0.4, 1.3));
  }
  const b = part(kit, kit.cone(0.1, 0.2, 6), beak, 0, 0.14, 0.58, 1.3, 1, 1);
  b.rotation.x = Math.PI / 2;
  g.add(b);
  return g;
}

export function buildFox(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, cream, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.8 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.52, 12, 9), fur, 0, -0.32, -0.08, 1, 0.9, 1.15, o));
  g.add(part(kit, kit.sphere(0.32, 10, 8), cream, 0, -0.34, 0.28, 1, 0.8, 0.5, o));
  g.add(part(kit, kit.sphere(0.42, 12, 9), fur, 0, 0.34, 0.18, 1, 0.95, 1.05, o));
  const snout = part(kit, kit.cone(0.16, 0.42, 8), cream, 0, 0.18, 0.58, 1.1, 1, 1, o);
  snout.rotation.x = Math.PI / 2;
  g.add(snout);
  g.add(part(kit, kit.sphere(0.06, 6, 5), dark, 0, 0.2, 0.78, 1.2, 0.7, 0.6));
  for (const side of [-1, 1]) {
    const ear = part(kit, kit.cone(0.12, 0.32, 6), fur, side * 0.26, 0.8, 0.05, 1, 1, 1, o);
    ear.rotation.z = -side * 0.25;
    g.add(ear);
    g.add(part(kit, kit.sphere(0.16, 8, 6), fur, side * 0.42, -0.22, 0.16, 1, 1.15, 1, o));
    g.add(part(kit, kit.sphere(0.18, 8, 6), fur, side * 0.26, -0.82, 0.18, 1, 0.7, 1.15, o));
  }
  const tail = part(kit, kit.sphere(0.22, 10, 7), fur, 0, -0.18, -0.72, 0.8, 0.8, 1.7, o);
  tail.rotation.x = 0.35;
  g.add(tail);
  g.add(part(kit, kit.sphere(0.14, 8, 6), cream, 0, -0.12, -0.98, 0.9, 0.9, 0.8, o));
  addFace(kit, g, { y: 0.44, z: 0.5, spread: 0.16, scale: 0.75, smile: false, eye: dark });
  addCheeks(kit, g, 0.28, 0.42, 0.28, cream);
  return g;
}

export function buildChick(kit: MeshKit, prize: PrizeDef): Group {
  const [fluff, beak, comb] = prize.palette;
  const o = finishOpts(prize, { rough: 0.9 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.62, 14, 10), fluff, 0, -0.18, 0, 1, 0.95, 1, o));
  g.add(part(kit, kit.sphere(0.46, 12, 9), fluff, 0, 0.42, 0.08, 1, 0.95, 1, o));
  const b = part(kit, kit.cone(0.1, 0.22, 7), beak, 0, 0.34, 0.52, 1.3, 1, 1);
  b.rotation.x = Math.PI / 2;
  g.add(b);
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.2, 8, 6), fluff, side * 0.52, -0.1, 0.05, 0.55, 0.9, 1, o));
    g.add(part(kit, kit.sphere(0.12, 8, 6), beak, side * 0.16, -0.78, 0.28, 1.2, 0.4, 1.4));
  }
  g.add(part(kit, kit.sphere(0.1, 6, 5), comb, 0, 0.88, 0.08, 1.1, 0.8, 0.7));
  addFace(kit, g, { y: 0.5, z: 0.46, spread: 0.16, scale: 0.7, smile: false });
  addCheeks(kit, g, 0.34, 0.4, 0.28);
  return g;
}

export function buildTurtle(kit: MeshKit, prize: PrizeDef): Group {
  const [shell, skin, spot] = prize.palette;
  const o = finishOpts(prize, { rough: 0.55, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.72, 14, 8, Math.PI / 2), shell, 0, -0.08, 0, 1, 0.7, 1, o));
  g.add(part(kit, kit.sphere(0.62, 12, 8), skin, 0, -0.38, 0, 1.05, 0.45, 1, { rough: 0.7 }));
  for (const [x, z] of [
    [-0.22, 0.18],
    [0.24, 0.12],
    [0, -0.22],
    [-0.28, -0.12],
    [0.26, -0.18],
  ]) {
    g.add(part(kit, kit.sphere(0.12, 8, 6), spot, x, 0.18, z, 1, 0.4, 1, o));
  }
  g.add(part(kit, kit.sphere(0.28, 10, 8), skin, 0, -0.18, 0.62, 1, 0.85, 1));
  addFace(kit, g, { y: -0.08, z: 0.82, spread: 0.12, scale: 0.55, smile: false });
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.18, 8, 6), skin, side * 0.58, -0.42, 0.28, 1.2, 0.45, 1.1));
    g.add(part(kit, kit.sphere(0.16, 8, 6), skin, side * 0.5, -0.42, -0.32, 1.1, 0.45, 1.1));
  }
  const tail = part(kit, kit.cone(0.1, 0.22, 6), skin, 0, -0.38, -0.7, 1, 1, 1);
  tail.rotation.x = -Math.PI / 2;
  g.add(tail);
  return g;
}

export function buildBee(kit: MeshKit, prize: PrizeDef): Group {
  const [yellow, dark, wing] = prize.palette;
  const o = finishOpts(prize, { rough: 0.5, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.55, 14, 10), yellow, 0, -0.08, 0, 1.15, 0.85, 0.95, o));
  for (const z of [-0.22, 0.05, 0.28]) {
    const stripe = part(kit, kit.torus(0.5, 0.07, 6, 18), dark, 0, -0.08, z, 1.05, 0.85, 1);
    stripe.rotation.y = Math.PI / 2;
    g.add(stripe);
  }
  g.add(part(kit, kit.sphere(0.32, 10, 8), yellow, 0, 0.18, 0.48, 1, 0.9, 0.9, o));
  for (const side of [-1, 1]) {
    const w = part(kit, kit.sphere(0.28, 8, 6), wing, side * 0.42, 0.38, -0.05, 0.35, 1.1, 0.85, { transparent: true, opacity: 0.55, rough: 0.2, flat: false });
    w.rotation.z = side * 0.4;
    g.add(w);
    g.add(part(kit, kit.cylinder(0.02, 0.02, 0.28, 5), dark, side * 0.1, 0.52, 0.55));
    g.add(part(kit, kit.sphere(0.05, 6, 4), dark, side * 0.1, 0.68, 0.55));
  }
  addFace(kit, g, { y: 0.22, z: 0.72, spread: 0.12, scale: 0.55, smile: false });
  return g;
}

export function buildWhale(kit: MeshKit, prize: PrizeDef): Group {
  const [skin, belly, accent] = prize.palette;
  const o = finishOpts(prize, { rough: 0.5, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.58, 14, 10), skin, 0, -0.08, 0.1, 1.05, 0.75, 1.35, o));
  g.add(part(kit, kit.sphere(0.4, 12, 8), belly, 0, -0.22, 0.22, 1, 0.55, 1.15, o));
  const tail = part(kit, kit.sphere(0.22, 10, 7), skin, 0, 0.08, -0.78, 1.6, 0.35, 0.7, o);
  g.add(tail);
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.2, 8, 6), skin, side * 0.55, -0.18, 0.2, 0.45, 0.35, 1.1, o));
    g.add(part(kit, kit.sphere(0.16, 8, 6), skin, side * 0.28, 0.12, -0.82, 0.4, 0.25, 1, o));
  }
  g.add(part(kit, kit.cylinder(0.06, 0.08, 0.22, 8), accent, 0, 0.42, -0.05, 1, 1, 1, { emissive: accent, emissiveIntensity: prize.finish === "glow" ? 0.5 : 0 }));
  addFace(kit, g, { y: 0.08, z: 0.72, spread: 0.18, scale: 0.7, smile: false });
  addCheeks(kit, g, -0.08, 0.62, 0.32, belly);
  return g;
}

export function buildHelicopter(kit: MeshKit, prize: PrizeDef): Group {
  const [paint, dark, glass] = prize.palette;
  const o = finishOpts(prize, { rough: 0.4, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.42, 12, 9), paint, 0, -0.08, 0.18, 1.15, 0.85, 1.2, o));
  g.add(part(kit, kit.sphere(0.28, 10, 7), glass, 0, 0.12, 0.42, 1, 0.7, 0.9, { rough: 0.12, metal: 0.1, flat: false }));
  const boom = part(kit, kit.cylinder(0.08, 0.1, 0.9, 8), paint, 0, 0.02, -0.55, 1, 1, 1, o);
  boom.rotation.x = Math.PI / 2;
  g.add(boom);
  g.add(part(kit, kit.box(0.06, 0.28, 0.22), paint, 0, 0.08, -0.98, 1, 1, 1, o));
  g.add(part(kit, kit.cylinder(0.05, 0.05, 0.22, 8), dark, 0, 0.38, 0.1));
  for (const rot of [0, Math.PI / 2]) {
    const blade = part(kit, kit.box(1.7, 0.04, 0.1), dark, 0, 0.5, 0.1);
    blade.rotation.y = rot;
    g.add(blade);
  }
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.box(0.08, 0.18, 0.7), dark, side * 0.28, -0.42, 0.12));
    g.add(part(kit, kit.sphere(0.06, 6, 5), "#FFF4B8", 0.42, -0.08, side * 0.22, 1, 1, 1, { emissive: "#FFF4B8", emissiveIntensity: 0.5 }));
  }
  return g;
}

export function buildTrain(kit: MeshKit, prize: PrizeDef): Group {
  const [paint, dark, trim] = prize.palette;
  const o = finishOpts(prize, { rough: 0.4, flat: false });
  const g = new Group();
  g.add(part(kit, kit.box(1.5, 0.55, 0.7), paint, 0, -0.12, 0, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.55, 0.5, 0.62), paint, -0.38, 0.38, 0, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.42, 0.28, 0.5), "#BFE7FF", -0.38, 0.42, 0.08, 1, 1, 1, { rough: 0.12, flat: false }));
  g.add(part(kit, kit.cylinder(0.12, 0.14, 0.32, 10), dark, 0.42, 0.32, 0));
  g.add(part(kit, kit.sphere(0.16, 8, 6), dark, 0.42, 0.5, 0, 1, 0.45, 1));
  const cow = part(kit, kit.cone(0.22, 0.28, 6), trim, 0.82, -0.18, 0, 1, 1, 1, o);
  cow.rotation.z = -Math.PI / 2;
  g.add(cow);
  const wheel = kit.cylinder(0.2, 0.2, 0.12, 12);
  for (const [x, z] of [
    [-0.45, 0.38],
    [0.2, 0.38],
    [0.55, 0.38],
    [-0.45, -0.38],
    [0.2, -0.38],
    [0.55, -0.38],
  ]) {
    const w = part(kit, wheel, dark, x, -0.42, z, 1, 1, 1, { rough: 0.85 });
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  g.add(part(kit, kit.sphere(0.07, 6, 5), "#FFF4B8", 0.78, 0.02, 0, 1, 1, 1, { emissive: "#FFF4B8", emissiveIntensity: 0.6 }));
  return g;
}

export function buildDonut(kit: MeshKit, prize: PrizeDef): Group {
  const [icing, dough, cherry] = prize.palette;
  const o = finishOpts(prize, { rough: 0.55, flat: false });
  const g = new Group();
  const ring = part(kit, kit.torus(0.55, 0.28, 12, 24), dough, 0, 0, 0, 1, 1, 1, { rough: 0.8, flat: false });
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const top = part(kit, kit.torus(0.55, 0.18, 10, 24), icing, 0, 0.14, 0, 1, 1, 1, o);
  top.rotation.x = Math.PI / 2;
  g.add(top);
  const sprinkle = kit.box(0.1, 0.03, 0.03);
  const colors = ["#FFD54D", "#41C9FF", "#3DFF88", "#FF4FD8", cherry];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.3;
    const r = 0.42 + (i % 3) * 0.08;
    const s = part(kit, sprinkle, colors[i % colors.length], Math.cos(a) * r, 0.28, Math.sin(a) * r);
    s.rotation.set(0.3, a, 0.5);
    g.add(s);
  }
  addFace(kit, g, { y: 0.05, z: 0.78, spread: 0.16, scale: 0.55 });
  return g;
}

export function buildLollipop(kit: MeshKit, prize: PrizeDef): Group {
  const [candy, stick, swirl] = prize.palette;
  const o = finishOpts(prize, { rough: 0.35, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.58, 16, 12), candy, 0, 0.22, 0, 1, 1, 0.55, o));
  const band = part(kit, kit.torus(0.38, 0.06, 6, 20), swirl, 0, 0.22, 0.08, 1, 1, 1, o);
  g.add(band);
  g.add(part(kit, kit.cylinder(0.07, 0.07, 1.05, 8), stick, 0, -0.55, 0, 1, 1, 1, { rough: 0.4 }));
  addFace(kit, g, { y: 0.28, z: 0.28, spread: 0.16, scale: 0.65 });
  return g;
}

export function buildGem(kit: MeshKit, prize: PrizeDef): Group {
  const [stone, gold, shine] = prize.palette;
  const g = new Group();
  const geo = kit.geo("prize-gem", () => new OctahedronGeometry(0.72, 0));
  g.add(part(kit, geo, stone, 0, 0.08, 0, 1, 1.15, 1, finishOpts(prize, { rough: 0.12, metal: 0.25, emissive: shine, emissiveIntensity: 0.35, flat: false })));
  g.add(part(kit, kit.cylinder(0.28, 0.38, 0.16, 8), gold, 0, -0.62, 0, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
  g.add(part(kit, kit.cylinder(0.42, 0.42, 0.08, 10), gold, 0, -0.72, 0, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
  return g;
}

export function buildHeart(kit: MeshKit, prize: PrizeDef): Group {
  const [body, , accent] = prize.palette;
  const o = finishOpts(prize, { rough: 0.45, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.46, 12, 9), body, -0.26, 0.28, 0, 1, 1, 0.85, o));
  g.add(part(kit, kit.sphere(0.46, 12, 9), body, 0.26, 0.28, 0, 1, 1, 0.85, o));
  const tip = part(kit, kit.cone(0.62, 0.9, 8), body, 0, -0.32, 0, 1, 1, 0.85, o);
  tip.rotation.x = Math.PI;
  g.add(tip);
  addFace(kit, g, { y: 0.18, z: 0.38, spread: 0.16, scale: 0.7, smileColor: accent });
  return g;
}

export function buildUfo(kit: MeshKit, prize: PrizeDef): Group {
  const [saucer, dome, light] = prize.palette;
  const o = finishOpts(prize, { rough: 0.35, metal: 0.45, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.85, 16, 8, Math.PI / 2), saucer, 0, 0, 0, 1, 0.45, 1, o));
  const underside = part(kit, kit.sphere(0.7, 14, 7, Math.PI / 2), saucer, 0, 0, 0, 1, 0.35, 1, o);
  underside.rotation.x = Math.PI;
  g.add(underside);
  g.add(part(kit, kit.sphere(0.38, 12, 8), dome, 0, 0.22, 0, 1, 0.7, 1, { rough: 0.12, metal: 0.15, transparent: true, opacity: 0.7, flat: false, emissive: dome, emissiveIntensity: 0.25 }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = i % 2 ? light : "#FFD54D";
    g.add(part(kit, kit.sphere(0.08, 6, 5), c, Math.cos(a) * 0.62, 0.02, Math.sin(a) * 0.62, 1, 1, 1, { emissive: c, emissiveIntensity: 0.85 }));
  }
  g.add(part(kit, kit.cylinder(0.12, 0.22, 0.16, 8), light, 0, -0.28, 0, 1, 1, 1, { emissive: light, emissiveIntensity: 0.5 }));
  return g;
}
