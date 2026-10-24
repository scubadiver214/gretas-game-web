import { Group } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";
import { addCheeks, addFace, finishOpts, part } from "./parts";

/** Plush toys: round bodies, big heads, friendly faces. All fit a unit sphere and face +z. */

export function buildTeddy(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, belly, accent] = prize.palette;
  const o = finishOpts(prize);
  const g = new Group();
  g.add(part(kit, kit.sphere(0.62, 12, 9), fur, 0, -0.32, 0, 1, 0.95, 0.9, o));
  g.add(part(kit, kit.sphere(0.4, 10, 8), belly, 0, -0.34, 0.3, 1, 0.9, 0.55, o));
  g.add(part(kit, kit.sphere(0.5, 12, 9), fur, 0, 0.42, 0, 1, 0.95, 0.95, o));
  const ear = kit.sphere(0.18, 8, 6);
  const inner = kit.sphere(0.1, 6, 5);
  for (const side of [-1, 1]) {
    g.add(part(kit, ear, fur, side * 0.4, 0.84, -0.05, 1, 1, 0.7, o));
    g.add(part(kit, inner, belly, side * 0.4, 0.84, 0.06, 1, 1, 0.5, o));
    g.add(part(kit, kit.sphere(0.21, 8, 6), fur, side * 0.62, -0.18, 0.12, 1, 1.2, 1, o));
    g.add(part(kit, kit.sphere(0.25, 8, 6), fur, side * 0.34, -0.86, 0.22, 1, 0.8, 1.2, o));
  }
  g.add(part(kit, kit.sphere(0.22, 10, 7), belly, 0, 0.3, 0.42, 1, 0.75, 0.7, o));
  g.add(part(kit, kit.sphere(0.08, 6, 5), accent, 0, 0.36, 0.6));
  addFace(kit, g, { y: 0.52, z: 0.44, spread: 0.2, scale: 0.9, smile: false });
  addCheeks(kit, g, 0.36, 0.36, 0.34);
  // Bow tie.
  for (const side of [-1, 1]) g.add(part(kit, kit.box(0.2, 0.14, 0.08), accent, side * 0.14, -0.02, 0.5, 1, 1, 1));
  g.add(part(kit, kit.sphere(0.07, 6, 5), accent, 0, -0.02, 0.52));
  return g;
}

export function buildUnicorn(kit: MeshKit, prize: PrizeDef): Group {
  const [coat, mane, horn] = prize.palette;
  const o = finishOpts(prize);
  const g = new Group();
  g.add(part(kit, kit.sphere(0.6, 12, 9), coat, 0, -0.35, 0, 1, 0.9, 1.1, o));
  g.add(part(kit, kit.sphere(0.46, 12, 9), coat, 0, 0.42, 0.1, 1, 1, 1, o));
  g.add(part(kit, kit.sphere(0.28, 10, 7), coat, 0, 0.26, 0.5, 1, 0.8, 0.8, o));
  const legGeo = kit.cylinder(0.14, 0.16, 0.5, 8);
  for (const [x, z] of [
    [-0.32, 0.3],
    [0.32, 0.3],
    [-0.32, -0.3],
    [0.32, -0.3],
  ]) {
    g.add(part(kit, legGeo, coat, x, -0.78, z, 1, 1, 1, o));
    g.add(part(kit, kit.sphere(0.15, 6, 5), mane, x, -1.0, z, 1, 0.5, 1));
  }
  const hornMesh = part(kit, kit.cone(0.12, 0.6, 8), horn, 0, 0.98, 0.15, 1, 1, 1, { metal: 0.6, rough: 0.3 });
  hornMesh.rotation.x = -0.25;
  g.add(hornMesh);
  const earGeo = kit.cone(0.1, 0.25, 6);
  for (const side of [-1, 1]) {
    const ear = part(kit, earGeo, coat, side * 0.3, 0.84, -0.05, 1, 1, 1, o);
    ear.rotation.z = -side * 0.3;
    g.add(ear);
  }
  // Mane: a row of puffs down the back of the head and neck.
  const puff = kit.sphere(0.16, 8, 6);
  for (let i = 0; i < 5; i++) g.add(part(kit, puff, i % 2 ? mane : horn, 0, 0.82 - i * 0.22, -0.3 - i * 0.1, 1, 1, 1, { emissive: prize.finish ? mane : undefined, emissiveIntensity: 0.15 }));
  g.add(part(kit, kit.sphere(0.2, 8, 6), mane, 0, -0.45, -0.72, 0.8, 1.4, 0.8));
  addFace(kit, g, { y: 0.5, z: 0.42, spread: 0.2, scale: 0.85, smile: false });
  addCheeks(kit, g, 0.34, 0.4, 0.34);
  return g;
}

export function buildDragon(kit: MeshKit, prize: PrizeDef): Group {
  const [scale, belly, spike] = prize.palette;
  const o = finishOpts(prize);
  const g = new Group();
  g.add(part(kit, kit.sphere(0.58, 12, 9), scale, 0, -0.3, 0, 1, 0.95, 1.05, o));
  g.add(part(kit, kit.sphere(0.38, 10, 8), belly, 0, -0.32, 0.32, 1, 0.9, 0.5, o));
  g.add(part(kit, kit.sphere(0.46, 12, 9), scale, 0, 0.45, 0.12, 1.05, 0.95, 1, o));
  g.add(part(kit, kit.sphere(0.26, 10, 7), scale, 0, 0.3, 0.5, 1.1, 0.7, 0.8, o));
  // Wings: flattened half-discs angled back.
  for (const side of [-1, 1]) {
    const wing = part(kit, kit.sphere(0.5, 8, 4, Math.PI / 2), spike, side * 0.62, 0.1, -0.2, 0.9, 0.8, 0.12, o);
    wing.rotation.set(Math.PI / 2, 0, side * 0.5);
    g.add(wing);
    const hornMesh = part(kit, kit.cone(0.09, 0.3, 6), spike, side * 0.26, 0.9, -0.05);
    hornMesh.rotation.z = -side * 0.4;
    g.add(hornMesh);
    g.add(part(kit, kit.sphere(0.2, 8, 6), scale, side * 0.56, -0.22, 0.14, 1, 1.1, 1, o));
    g.add(part(kit, kit.sphere(0.23, 8, 6), scale, side * 0.3, -0.84, 0.2, 1, 0.8, 1.2, o));
  }
  // Spines down the back and a tail.
  for (let i = 0; i < 4; i++) {
    const s = part(kit, kit.cone(0.08, 0.22, 5), spike, 0, 0.72 - i * 0.28, -0.42 - i * 0.08);
    s.rotation.x = -0.6;
    g.add(s);
  }
  const tail = part(kit, kit.cone(0.16, 0.7, 7), scale, 0, -0.5, -0.78, 1, 1, 1, o);
  tail.rotation.x = -Math.PI / 2 + 0.5;
  g.add(tail);
  addFace(kit, g, { y: 0.56, z: 0.45, spread: 0.2, scale: 0.85, smile: false });
  // Nostrils.
  for (const side of [-1, 1]) g.add(part(kit, kit.sphere(0.035, 5, 4), "#14161C", side * 0.09, 0.3, 0.76));
  return g;
}

export function buildDino(kit: MeshKit, prize: PrizeDef): Group {
  const [skin, belly, dark] = prize.palette;
  const o = finishOpts(prize);
  const g = new Group();
  g.add(part(kit, kit.sphere(0.6, 12, 9), skin, 0, -0.3, -0.1, 1, 0.85, 1.15, o));
  g.add(part(kit, kit.sphere(0.4, 10, 8), belly, 0, -0.3, 0.3, 1, 0.75, 0.6, o));
  g.add(part(kit, kit.sphere(0.42, 12, 9), skin, 0, 0.42, 0.35, 1, 0.9, 1.05, o));
  g.add(part(kit, kit.sphere(0.26, 10, 7), skin, 0, 0.32, 0.72, 1.05, 0.65, 0.8, o));
  const tail = part(kit, kit.cone(0.2, 0.9, 8), skin, 0, -0.42, -0.9, 1, 1, 1, o);
  tail.rotation.x = -Math.PI / 2 + 0.35;
  g.add(tail);
  for (let i = 0; i < 5; i++) {
    const s = part(kit, kit.cone(0.1, 0.26, 5), dark, 0, 0.62 - i * 0.26, -0.1 - i * 0.2, 1, 1, 1, prize.finish === "glow" ? { emissive: belly, emissiveIntensity: 0.5 } : {});
    s.rotation.x = -0.4;
    g.add(s);
  }
  const legGeo = kit.cylinder(0.17, 0.2, 0.42, 8);
  for (const side of [-1, 1]) {
    g.add(part(kit, legGeo, skin, side * 0.36, -0.82, 0.05, 1, 1, 1, o));
    g.add(part(kit, kit.sphere(0.14, 8, 6), skin, side * 0.5, -0.1, 0.42, 1, 1.3, 1, o));
  }
  addFace(kit, g, { y: 0.52, z: 0.68, spread: 0.19, scale: 0.8 });
  return g;
}

export function buildSquishy(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, inner, dark] = prize.palette;
  const o = finishOpts(prize, { rough: 0.9 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.82, 14, 10), fur, 0, -0.1, 0, 1, 0.9, 0.95, o));
  const ear = kit.cone(0.22, 0.4, 5);
  const earIn = kit.cone(0.12, 0.26, 5);
  for (const side of [-1, 1]) {
    const e = part(kit, ear, fur, side * 0.5, 0.78, 0, 1, 1, 1, o);
    e.rotation.z = -side * 0.35;
    g.add(e);
    const ei = part(kit, earIn, inner, side * 0.5, 0.76, 0.08, 1, 1, 1);
    ei.rotation.z = -side * 0.35;
    g.add(ei);
    g.add(part(kit, kit.sphere(0.2, 8, 6), fur, side * 0.36, -0.86, 0.3, 1, 0.7, 1, o));
  }
  g.add(part(kit, kit.sphere(0.07, 6, 5), inner, 0, 0.02, 0.82, 1, 0.7, 0.6));
  addFace(kit, g, { y: 0.18, z: 0.72, spread: 0.3, scale: 0.9, eye: dark });
  addCheeks(kit, g, -0.02, 0.7, 0.48, inner);
  return g;
}
