import { Group } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";
import { addCheeks, addFace, finishOpts, part } from "./parts";

/** More animals, treats and toys. All fit a unit sphere and face +z. */

export function buildPig(kit: MeshKit, prize: PrizeDef): Group {
  const [skin, snout, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.8 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.62, 12, 9), skin, 0, -0.22, 0, 1.1, 0.9, 1.05, o));
  g.add(part(kit, kit.sphere(0.42, 12, 9), skin, 0, 0.38, 0.12, 1, 0.9, 1, o));
  g.add(part(kit, kit.cylinder(0.16, 0.2, 0.22, 10), snout, 0, 0.28, 0.52, 1, 1, 1, o)).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.04, 5, 4), dark, side * 0.07, 0.3, 0.64));
    const ear = part(kit, kit.cone(0.12, 0.22, 5), skin, side * 0.28, 0.78, 0.02, 1, 1, 1, o);
    ear.rotation.z = -side * 0.4;
    g.add(ear);
    g.add(part(kit, kit.sphere(0.16, 8, 6), skin, side * 0.42, -0.62, 0.22, 1, 0.7, 1.1, o));
  }
  const tail = part(kit, kit.torus(0.12, 0.04, 5, 12), snout, 0.38, -0.08, -0.58, 1, 1, 1, o);
  tail.rotation.set(0.4, 0.6, 0.8);
  g.add(tail);
  addFace(kit, g, { y: 0.48, z: 0.42, spread: 0.16, scale: 0.7, smile: false, eye: dark });
  addCheeks(kit, g, 0.32, 0.38, 0.28, snout);
  return g;
}

export function buildElephant(kit: MeshKit, prize: PrizeDef): Group {
  const [hide, inner, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.75 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.58, 12, 9), hide, 0, -0.28, 0, 1.05, 0.95, 1.1, o));
  g.add(part(kit, kit.sphere(0.44, 12, 9), hide, 0, 0.38, 0.12, 1.05, 0.95, 1, o));
  const trunk = part(kit, kit.cylinder(0.1, 0.16, 0.7, 10), hide, 0, 0.02, 0.52, 1, 1, 1, o);
  trunk.rotation.x = 0.85;
  g.add(trunk);
  g.add(part(kit, kit.sphere(0.12, 8, 6), hide, 0, -0.28, 0.78, 1, 0.7, 1, o));
  for (const side of [-1, 1]) {
    const ear = part(kit, kit.sphere(0.32, 10, 7), hide, side * 0.52, 0.42, -0.02, 0.35, 1.15, 0.9, o);
    ear.rotation.z = side * 0.25;
    g.add(ear);
    g.add(part(kit, kit.sphere(0.16, 8, 6), inner, side * 0.52, 0.42, 0.06, 0.25, 0.9, 0.6));
    g.add(part(kit, kit.cylinder(0.12, 0.14, 0.38, 8), hide, side * 0.28, -0.78, 0.16, 1, 1, 1, o));
  }
  addFace(kit, g, { y: 0.48, z: 0.46, spread: 0.16, scale: 0.7, smile: false, eye: dark });
  return g;
}

export function buildMouse(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, inner, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.85 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.5, 12, 9), fur, 0, -0.28, 0, 1.15, 0.85, 1.15, o));
  g.add(part(kit, kit.sphere(0.4, 12, 9), fur, 0, 0.32, 0.18, 1, 0.9, 1, o));
  g.add(part(kit, kit.sphere(0.08, 6, 5), inner, 0, 0.26, 0.56, 1.3, 0.8, 0.7));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.22, 10, 7), fur, side * 0.32, 0.62, 0.02, 1, 1, 0.35, o));
    g.add(part(kit, kit.sphere(0.12, 8, 6), inner, side * 0.32, 0.62, 0.08, 1, 1, 0.25));
    g.add(part(kit, kit.sphere(0.14, 8, 6), fur, side * 0.36, -0.58, 0.28, 1, 0.7, 1.1, o));
  }
  const tail = part(kit, kit.sphere(0.08, 8, 6), inner, 0.35, -0.22, -0.62, 0.7, 0.7, 2.4, o);
  tail.rotation.set(0.4, 0.5, 0.2);
  g.add(tail);
  addFace(kit, g, { y: 0.4, z: 0.5, spread: 0.14, scale: 0.65, smile: false, eye: dark });
  addCheeks(kit, g, 0.26, 0.42, 0.26, inner);
  return g;
}

export function buildLion(kit: MeshKit, prize: PrizeDef): Group {
  const [mane, face, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.8 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.52, 12, 9), face, 0, -0.32, 0.08, 1, 0.9, 1.05, o));
  g.add(part(kit, kit.sphere(0.42, 12, 9), face, 0, 0.32, 0.16, 1, 0.95, 1, o));
  const puff = kit.sphere(0.18, 8, 6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    g.add(part(kit, puff, mane, Math.cos(a) * 0.42, 0.38 + Math.sin(a) * 0.12, 0.05 + Math.sin(a) * 0.18, 1, 1, 0.9, o));
  }
  g.add(part(kit, kit.sphere(0.16, 8, 6), face, 0, 0.22, 0.52, 1.2, 0.7, 0.8, o));
  g.add(part(kit, kit.sphere(0.06, 6, 5), dark, 0, 0.24, 0.66, 1.2, 0.7, 0.6));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.1, 6, 5), face, side * 0.28, 0.72, 0.08, 1, 1, 0.6, o));
    g.add(part(kit, kit.sphere(0.16, 8, 6), face, side * 0.36, -0.72, 0.22, 1, 0.7, 1.1, o));
  }
  addFace(kit, g, { y: 0.4, z: 0.5, spread: 0.16, scale: 0.75, smile: false, eye: dark });
  return g;
}

export function buildFish(kit: MeshKit, prize: PrizeDef): Group {
  const [body, fin, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.45, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.55, 14, 10), body, 0, 0, 0.08, 1.15, 0.7, 1.35, o));
  const tail = part(kit, kit.cone(0.28, 0.5, 8), fin, 0, 0.05, -0.72, 0.35, 1, 1, o);
  tail.rotation.x = -Math.PI / 2;
  g.add(tail);
  for (const side of [-1, 1]) {
    const f = part(kit, kit.sphere(0.18, 8, 6), fin, side * 0.42, 0.05, 0.08, 0.3, 0.9, 0.7, o);
    f.rotation.z = side * 0.4;
    g.add(f);
  }
  const top = part(kit, kit.cone(0.12, 0.28, 6), fin, 0, 0.42, 0.05, 1, 1, 1, o);
  g.add(top);
  addFace(kit, g, { y: 0.08, z: 0.62, spread: 0.14, scale: 0.6, smile: false, eye: dark });
  return g;
}

export function buildLadybug(kit: MeshKit, prize: PrizeDef): Group {
  const [shell, spots, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.45, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.7, 14, 8, Math.PI / 2), shell, 0, -0.05, 0, 1, 0.75, 1.05, o));
  g.add(part(kit, kit.sphere(0.55, 12, 8), dark, 0, -0.32, 0, 1.1, 0.4, 1.05, { rough: 0.7 }));
  g.add(part(kit, kit.box(0.04, 0.12, 1.1), dark, 0, 0.28, 0));
  for (const [x, z] of [
    [-0.28, 0.22],
    [0.3, 0.18],
    [-0.22, -0.28],
    [0.26, -0.22],
    [0.08, 0.42],
  ]) {
    g.add(part(kit, kit.sphere(0.12, 8, 6), spots, x, 0.22, z, 1, 0.45, 1));
  }
  g.add(part(kit, kit.sphere(0.28, 10, 8), dark, 0, 0.02, 0.62, 1, 0.85, 1));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.cylinder(0.02, 0.02, 0.28, 5), dark, side * 0.1, 0.32, 0.78));
    g.add(part(kit, kit.sphere(0.05, 6, 4), dark, side * 0.1, 0.48, 0.78));
  }
  addFace(kit, g, { y: 0.08, z: 0.84, spread: 0.1, scale: 0.5, smile: false });
  return g;
}

export function buildCookie(kit: MeshKit, prize: PrizeDef): Group {
  const [dough, chip, ] = prize.palette;
  const o = finishOpts(prize, { rough: 0.85 });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.85, 0.85, 0.28, 16), dough, 0, 0, 0, 1, 1, 1, o));
  const bite = kit.sphere(0.14, 8, 6);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.3;
    const r = 0.22 + (i % 3) * 0.18;
    g.add(part(kit, bite, chip, Math.cos(a) * r, 0.16, Math.sin(a) * r, 1, 0.55, 1));
  }
  addFace(kit, g, { y: 0.02, z: 0.78, spread: 0.18, scale: 0.65 });
  return g;
}

export function buildBalloon(kit: MeshKit, prize: PrizeDef): Group {
  const [skin, knot, string] = prize.palette;
  const o = finishOpts(prize, { rough: 0.35, flat: false });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.58, 14, 12), skin, 0, 0.22, 0, 1, 1.15, 1, o));
  g.add(part(kit, kit.cone(0.12, 0.2, 8), knot, 0, -0.42, 0, 1, 1, 1, o)).rotation.x = Math.PI;
  g.add(part(kit, kit.cylinder(0.02, 0.02, 0.7, 6), string, 0, -0.8, 0));
  addFace(kit, g, { y: 0.32, z: 0.5, spread: 0.16, scale: 0.7 });
  return g;
}

export function buildMushroom(kit: MeshKit, prize: PrizeDef): Group {
  const [cap, stem, spot] = prize.palette;
  const o = finishOpts(prize, { rough: 0.7 });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.22, 0.28, 0.7, 12), stem, 0, -0.45, 0, 1, 1, 1, { rough: 0.85 }));
  g.add(part(kit, kit.sphere(0.72, 14, 8, Math.PI / 2), cap, 0, 0.12, 0, 1, 0.7, 1, o));
  g.add(part(kit, kit.cylinder(0.72, 0.72, 0.08, 16), cap, 0, 0.08, 0, 1, 1, 1, o));
  for (const [x, z, s] of [
    [-0.28, 0.18, 1],
    [0.32, 0.12, 0.8],
    [0.05, -0.32, 0.9],
    [-0.18, -0.12, 0.7],
    [0.22, 0.38, 0.65],
  ]) {
    g.add(part(kit, kit.sphere(0.12 * s, 8, 6), spot, x, 0.38, z, 1, 0.45, 1));
  }
  addFace(kit, g, { y: -0.42, z: 0.28, spread: 0.12, scale: 0.55 });
  return g;
}

export function buildFlower(kit: MeshKit, prize: PrizeDef): Group {
  const [petal, center, stem] = prize.palette;
  const o = finishOpts(prize, { rough: 0.6, flat: false });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.08, 0.1, 0.7, 8), stem, 0, -0.5, 0, 1, 1, 1, { rough: 0.8 }));
  const p = kit.sphere(0.28, 10, 7);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(part(kit, p, petal, Math.cos(a) * 0.38, 0.28, Math.sin(a) * 0.38, 1, 0.7, 1, o));
  }
  g.add(part(kit, kit.sphere(0.28, 12, 9), center, 0, 0.3, 0, 1, 0.7, 1, o));
  addFace(kit, g, { y: 0.32, z: 0.22, spread: 0.12, scale: 0.55 });
  return g;
}

export function buildBoat(kit: MeshKit, prize: PrizeDef): Group {
  const [hull, cabin, trim] = prize.palette;
  const o = finishOpts(prize, { rough: 0.45, flat: false });
  const g = new Group();
  g.add(part(kit, kit.box(1.5, 0.28, 0.7), hull, 0, -0.28, 0, 1, 1, 1, o));
  const bow = part(kit, kit.cone(0.36, 0.5, 8), hull, 0.85, -0.28, 0, 1, 0.7, 1, o);
  bow.rotation.z = -Math.PI / 2;
  g.add(bow);
  g.add(part(kit, kit.box(0.55, 0.42, 0.5), cabin, -0.15, 0.08, 0, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.42, 0.22, 0.38), "#BFE7FF", -0.15, 0.14, 0.08, 1, 1, 1, { rough: 0.15, flat: false }));
  g.add(part(kit, kit.cylinder(0.08, 0.1, 0.36, 8), trim, 0.28, 0.22, 0));
  if (prize.id.includes("pirate")) {
    g.add(part(kit, kit.box(0.02, 0.42, 0.02), "#2B2D42", -0.42, 0.42, 0));
    g.add(part(kit, kit.box(0.28, 0.2, 0.02), "#E63946", -0.28, 0.52, 0));
  }
  return g;
}

export function buildCrown(kit: MeshKit, prize: PrizeDef): Group {
  const [gold, gem, band] = prize.palette;
  const metal = finishOpts(prize, { metal: 0.75, rough: 0.28, flat: false });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.7, 0.62, 0.28, 12), gold, 0, -0.15, 0, 1, 1, 1, metal));
  g.add(part(kit, kit.torus(0.66, 0.06, 8, 20), band, 0, -0.28, 0, 1, 1, 1, metal)).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(part(kit, kit.cone(0.12, 0.42, 6), gold, Math.cos(a) * 0.55, 0.22, Math.sin(a) * 0.55, 1, 1, 1, metal));
    g.add(part(kit, kit.sphere(0.08, 8, 6), i % 2 ? gem : "#41C9FF", Math.cos(a) * 0.55, 0.46, Math.sin(a) * 0.55, 1, 1, 1, { emissive: i % 2 ? gem : "#41C9FF", emissiveIntensity: 0.6 }));
  }
  g.add(part(kit, kit.sphere(0.14, 10, 7), gem, 0, 0.18, 0.58, 1, 1, 0.7, { emissive: gem, emissiveIntensity: 0.5 }));
  return g;
}

export function buildDrum(kit: MeshKit, prize: PrizeDef): Group {
  const [shell, skin, trim] = prize.palette;
  const o = finishOpts(prize, { rough: 0.5, flat: false });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.7, 0.7, 0.7, 16), shell, 0, -0.08, 0, 1, 1, 1, o));
  g.add(part(kit, kit.cylinder(0.72, 0.72, 0.08, 16), skin, 0, 0.3, 0, 1, 1, 1, { rough: 0.8 }));
  g.add(part(kit, kit.cylinder(0.72, 0.72, 0.08, 16), skin, 0, -0.46, 0, 1, 1, 1, { rough: 0.8 }));
  const ring = part(kit, kit.torus(0.7, 0.05, 6, 20), trim, 0, 0.3, 0, 1, 1, 1, { metal: 0.5, rough: 0.35 });
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const stick = kit.cylinder(0.04, 0.04, 0.7, 6);
  const s1 = part(kit, stick, "#E8B47A", -0.22, 0.55, 0.1);
  s1.rotation.z = 0.5;
  g.add(s1);
  const s2 = part(kit, stick, "#E8B47A", 0.28, 0.52, -0.08);
  s2.rotation.z = -0.4;
  g.add(s2);
  addFace(kit, g, { y: -0.02, z: 0.7, spread: 0.16, scale: 0.6 });
  return g;
}

export function buildKoala(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, inner, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.9 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.56, 12, 9), fur, 0, -0.32, 0, 1, 0.95, 0.95, o));
  g.add(part(kit, kit.sphere(0.5, 12, 9), fur, 0, 0.38, 0.06, 1.05, 0.95, 1, o));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.22, 10, 7), fur, side * 0.42, 0.62, 0, 1, 1, 0.55, o));
    g.add(part(kit, kit.sphere(0.12, 8, 6), inner, side * 0.42, 0.62, 0.08, 1, 1, 0.35));
    g.add(part(kit, kit.sphere(0.18, 8, 6), fur, side * 0.48, -0.18, 0.16, 1, 1.15, 1, o));
    g.add(part(kit, kit.sphere(0.2, 8, 6), fur, side * 0.28, -0.82, 0.2, 1, 0.7, 1.1, o));
  }
  g.add(part(kit, kit.sphere(0.14, 8, 6), dark, 0, 0.28, 0.5, 1.1, 0.85, 0.7));
  addFace(kit, g, { y: 0.46, z: 0.48, spread: 0.16, scale: 0.75, smile: false, eye: dark });
  addCheeks(kit, g, 0.3, 0.42, 0.3, inner);
  return g;
}
