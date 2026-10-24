import { Group } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";
import { addCheeks, addFace, finishOpts, part } from "./parts";

/** More plushies, sweets and toys. All fit a unit sphere and face +z. */

export function buildBunny(kit: MeshKit, prize: PrizeDef): Group {
  const [fur, inner, dark] = prize.palette;
  const o = finishOpts(prize);
  const g = new Group();
  g.add(part(kit, kit.sphere(0.56, 12, 9), fur, 0, -0.4, 0, 1, 0.95, 0.95, o));
  g.add(part(kit, kit.sphere(0.42, 12, 9), fur, 0, 0.28, 0.05, 1, 0.95, 0.95, o));
  for (const side of [-1, 1]) {
    const ear = part(kit, kit.sphere(0.14, 8, 6), fur, side * 0.18, 0.86, -0.02, 1, 2.6, 0.7, o);
    ear.rotation.z = -side * 0.18;
    g.add(ear);
    const earIn = part(kit, kit.sphere(0.08, 6, 5), inner, side * 0.18, 0.86, 0.06, 1, 2.6, 0.5);
    earIn.rotation.z = -side * 0.18;
    g.add(earIn);
    g.add(part(kit, kit.sphere(0.22, 8, 6), fur, side * 0.3, -0.88, 0.25, 1, 0.65, 1.2, o));
    g.add(part(kit, kit.sphere(0.16, 8, 6), fur, side * 0.46, -0.3, 0.3, 1, 1.2, 1, o));
  }
  g.add(part(kit, kit.sphere(0.2, 8, 6), "#FFFFFF", 0, -0.55, -0.55, 1, 1, 1, { rough: 0.95 }));
  g.add(part(kit, kit.sphere(0.06, 6, 5), inner, 0, 0.24, 0.46, 1.2, 0.8, 0.6));
  addFace(kit, g, { y: 0.36, z: 0.38, spread: 0.17, scale: 0.75, smile: false, eye: dark });
  addCheeks(kit, g, 0.2, 0.36, 0.28, inner);
  return g;
}

export function buildPenguin(kit: MeshKit, prize: PrizeDef): Group {
  const [back, belly, beak] = prize.palette;
  const o = finishOpts(prize, { flat: false, rough: 0.6 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.66, 14, 10), back, 0, -0.25, 0, 0.95, 1.15, 0.9, o));
  g.add(part(kit, kit.sphere(0.52, 14, 10), belly, 0, -0.3, 0.2, 0.9, 1.05, 0.75, o));
  g.add(part(kit, kit.sphere(0.3, 12, 8), belly, 0, 0.4, 0.38, 1.3, 0.9, 0.6, o));
  const b = part(kit, kit.cone(0.1, 0.24, 8), beak, 0, 0.32, 0.74, 1.3, 1, 1);
  b.rotation.x = Math.PI / 2;
  g.add(b);
  for (const side of [-1, 1]) {
    const flipper = part(kit, kit.sphere(0.24, 8, 6), back, side * 0.62, -0.2, 0, 0.35, 1.2, 0.8, o);
    flipper.rotation.z = side * 0.35;
    g.add(flipper);
    g.add(part(kit, kit.sphere(0.16, 8, 6), beak, side * 0.24, -0.98, 0.25, 1.1, 0.4, 1.4));
  }
  addFace(kit, g, { y: 0.48, z: 0.56, spread: 0.18, scale: 0.7, smile: false });
  addCheeks(kit, g, 0.3, 0.56, 0.32);
  if (prize.rarity === "rare" || prize.rarity === "legendary") {
    // A little gold crown for the emperor.
    g.add(part(kit, kit.cylinder(0.24, 0.2, 0.16, 8), beak, 0, 0.88, 0.05, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(part(kit, kit.cone(0.05, 0.14, 5), beak, Math.cos(a) * 0.2, 1.0, 0.05 + Math.sin(a) * 0.2, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
    }
  }
  return g;
}

export function buildPanda(kit: MeshKit, prize: PrizeDef): Group {
  const [white, black, blush] = prize.palette;
  const o = finishOpts(prize, { rough: 0.85 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.6, 12, 9), white, 0, -0.34, 0, 1, 0.95, 0.9, o));
  g.add(part(kit, kit.sphere(0.5, 12, 9), white, 0, 0.4, 0, 1.05, 0.92, 0.95, o));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.17, 8, 6), black, side * 0.38, 0.8, -0.04, 1, 1, 0.7));
    // Eye patches tilted outwards, with the eyes on top.
    const patch = part(kit, kit.sphere(0.13, 8, 6), black, side * 0.18, 0.48, 0.38, 1.1, 1.5, 0.5);
    patch.rotation.z = side * 0.5;
    g.add(patch);
    g.add(part(kit, kit.sphere(0.06, 6, 5), "#FFFFFF", side * 0.18, 0.5, 0.45));
    g.add(part(kit, kit.sphere(0.035, 5, 4), "#14161C", side * 0.18, 0.5, 0.5));
    g.add(part(kit, kit.sphere(0.22, 8, 6), black, side * 0.6, -0.18, 0.12, 1, 1.25, 1));
    g.add(part(kit, kit.sphere(0.25, 8, 6), black, side * 0.32, -0.86, 0.22, 1, 0.8, 1.2));
  }
  g.add(part(kit, kit.sphere(0.2, 10, 7), white, 0, 0.26, 0.42, 1, 0.72, 0.7, o));
  g.add(part(kit, kit.sphere(0.07, 6, 5), black, 0, 0.32, 0.58, 1.2, 0.8, 0.7));
  addCheeks(kit, g, 0.28, 0.4, 0.33, blush);
  return g;
}

export function buildOctopus(kit: MeshKit, prize: PrizeDef): Group {
  const [skin, spots, dark] = prize.palette;
  const o = finishOpts(prize, { flat: false, rough: 0.5 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.62, 14, 10), skin, 0, 0.22, 0, 1, 1.05, 1, o));
  for (const [x, y, z] of [
    [-0.3, 0.6, 0.35],
    [0.35, 0.5, 0.4],
    [0.1, 0.78, 0.25],
  ]) {
    g.add(part(kit, kit.sphere(0.08, 6, 5), spots, x, y, z, 1, 1, 0.5));
  }
  const arm = kit.sphere(0.16, 8, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const t = part(kit, arm, skin, Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5, 1, 1.9, 1, o);
    t.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(t);
    g.add(part(kit, kit.sphere(0.12, 6, 5), spots, Math.cos(a) * 0.72, -0.82, Math.sin(a) * 0.72, 1, 0.6, 1, o));
  }
  addFace(kit, g, { y: 0.18, z: 0.58, spread: 0.22, scale: 0.85, eye: dark });
  addCheeks(kit, g, 0.02, 0.56, 0.38, spots);
  return g;
}

export function buildCupcake(kit: MeshKit, prize: PrizeDef): Group {
  const [frosting, wrapper, cherry] = prize.palette;
  const o = finishOpts(prize, { flat: false, rough: 0.55 });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.62, 0.46, 0.7, 14), wrapper, 0, -0.55, 0, 1, 1, 1, { rough: 0.7 }));
  // Ridges on the paper case.
  const ridge = kit.box(0.06, 0.7, 0.04);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = part(kit, ridge, wrapper, Math.cos(a) * 0.55, -0.55, Math.sin(a) * 0.55, 1, 1, 1, { rough: 0.5 });
    r.rotation.y = -a;
    g.add(r);
  }
  g.add(part(kit, kit.sphere(0.66, 14, 9), frosting, 0, -0.08, 0, 1, 0.55, 1, o));
  g.add(part(kit, kit.sphere(0.5, 12, 8), frosting, 0, 0.22, 0, 1, 0.55, 1, o));
  g.add(part(kit, kit.sphere(0.3, 10, 7), frosting, 0, 0.48, 0, 1, 0.7, 1, o));
  g.add(part(kit, kit.sphere(0.16, 10, 7), cherry, 0, 0.78, 0, 1, 1, 1, { flat: false, rough: 0.25 }));
  const sprinkle = kit.box(0.1, 0.03, 0.03);
  const colors = ["#FFD54D", "#41C9FF", "#3DFF88", "#FF4FD8"];
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4;
    const r = 0.25 + (i % 3) * 0.13;
    const s = part(kit, sprinkle, colors[i % colors.length], Math.cos(a) * r, 0.1 + (i % 3) * 0.12, Math.sin(a) * r);
    s.rotation.set(0, a, 0.4);
    g.add(s);
  }
  addFace(kit, g, { y: -0.48, z: 0.55, spread: 0.2, scale: 0.7 });
  return g;
}

export function buildIceCream(kit: MeshKit, prize: PrizeDef): Group {
  const [scoop, cone, topScoop] = prize.palette;
  const o = finishOpts(prize, { flat: false, rough: 0.6 });
  const g = new Group();
  const c = part(kit, kit.cone(0.42, 1.1, 12), cone, 0, -0.45, 0, 1, 1, 1, { rough: 0.8 });
  c.rotation.x = Math.PI;
  g.add(c);
  // Waffle lines.
  for (let i = 0; i < 3; i++) {
    const ring = part(kit, kit.torus(0.34 - i * 0.1, 0.02, 4, 16), "#B47A40", 0, -0.12 - i * 0.26, 0);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  g.add(part(kit, kit.sphere(0.44, 14, 10), scoop, 0, 0.2, 0, 1, 0.9, 1, o));
  g.add(part(kit, kit.sphere(0.34, 12, 9), topScoop, 0, 0.62, 0, 1, 0.9, 1, o));
  g.add(part(kit, kit.sphere(0.11, 8, 6), "#E63946", 0, 0.94, 0, 1, 1, 1, { flat: false, rough: 0.25 }));
  addFace(kit, g, { y: 0.22, z: 0.42, spread: 0.15, scale: 0.65 });
  return g;
}

export function buildTop(kit: MeshKit, prize: PrizeDef): Group {
  const [a, b, c] = prize.palette;
  const shiny = { flat: false, rough: 0.35 };
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.85, 0.08, 0.9, 18), a, 0, -0.35, 0, 1, 1, 1, finishOpts(prize, shiny)));
  g.add(part(kit, kit.cylinder(0.5, 0.85, 0.3, 18), b, 0, 0.25, 0, 1, 1, 1, shiny));
  const stripe = part(kit, kit.torus(0.62, 0.06, 6, 24), c, 0, -0.05, 0, 1, 1, 1, shiny);
  stripe.rotation.x = Math.PI / 2;
  g.add(stripe);
  g.add(part(kit, kit.cylinder(0.1, 0.1, 0.45, 10), c, 0, 0.6, 0, 1, 1, 1, shiny));
  g.add(part(kit, kit.sphere(0.14, 8, 6), b, 0, 0.86, 0, 1, 1, 1, shiny));
  g.add(part(kit, kit.cone(0.08, 0.16, 8), "#DDE4F0", 0, -0.86, 0, 1, 1, 1, { metal: 0.6, rough: 0.3 })).rotation.x = Math.PI;
  return g;
}
