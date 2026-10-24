import { CylinderGeometry, Group } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";
import { addFace, finishOpts, part } from "./parts";

/** Vehicles, robots and treasure. All fit a unit sphere. */

export function buildCar(kit: MeshKit, prize: PrizeDef): Group {
  const [paint, dark, trim] = prize.palette;
  const o = finishOpts(prize, { rough: 0.35, flat: false });
  const g = new Group();
  g.add(part(kit, kit.box(1.7, 0.42, 0.86), paint, 0, -0.2, 0, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.9, 0.4, 0.74), paint, -0.12, 0.2, 0, 1, 1, 1, o));
  // Windows wrap the cabin.
  g.add(part(kit, kit.box(0.92, 0.26, 0.6), "#BFE7FF", -0.12, 0.24, 0, 1, 1, 1.05, { rough: 0.1, metal: 0.1, flat: false }));
  const wheel = kit.cylinder(0.27, 0.27, 0.18, 14);
  const hub = kit.cylinder(0.13, 0.13, 0.2, 10);
  for (const [x, z] of [
    [-0.55, 0.45],
    [0.55, 0.45],
    [-0.55, -0.45],
    [0.55, -0.45],
  ]) {
    const w = part(kit, wheel, dark, x, -0.4, z, 1, 1, 1, { rough: 0.9 });
    w.rotation.x = Math.PI / 2;
    g.add(w);
    const h = part(kit, hub, trim, x, -0.4, z, 1, 1, 1, { metal: 0.5, rough: 0.3 });
    h.rotation.x = Math.PI / 2;
    g.add(h);
  }
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.sphere(0.08, 6, 5), "#FFF4B8", 0.86, -0.12, side * 0.28, 1, 1, 1, { emissive: "#FFF4B8", emissiveIntensity: 0.6 }));
    g.add(part(kit, kit.sphere(0.06, 6, 5), "#FF3B3B", -0.86, -0.12, side * 0.28, 1, 1, 1, { emissive: "#FF3B3B", emissiveIntensity: 0.5 }));
  }
  g.add(part(kit, kit.box(0.3, 0.06, 0.9), trim, -0.55, 0.05, 0));
  if (prize.id.includes("race")) g.add(part(kit, kit.box(1.6, 0.02, 0.2), trim, 0, 0.42, 0));
  return g;
}

export function buildPlane(kit: MeshKit, prize: PrizeDef): Group {
  const [body, wing, accent] = prize.palette;
  const o = finishOpts(prize, { rough: 0.4, flat: false });
  const g = new Group();
  const fuselage = part(kit, kit.cylinder(0.26, 0.3, 1.6, 12), body, 0, 0, -0.1, 1, 1, 1, o);
  fuselage.rotation.x = Math.PI / 2;
  g.add(fuselage);
  const nose = part(kit, kit.cone(0.26, 0.4, 12), accent, 0, 0, 0.9, 1, 1, 1, o);
  nose.rotation.x = Math.PI / 2;
  g.add(nose);
  g.add(part(kit, kit.box(2.0, 0.08, 0.5), wing, 0, 0.05, 0.1, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.9, 0.06, 0.3), wing, 0, 0.1, -0.8, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.08, 0.45, 0.36), accent, 0, 0.3, -0.8, 1, 1, 1, o));
  g.add(part(kit, kit.sphere(0.2, 10, 7), "#BFE7FF", 0, 0.28, 0.25, 1, 0.7, 1.2, { rough: 0.1, flat: false }));
  for (const rot of [0, Math.PI / 2]) {
    const blade = part(kit, kit.box(0.08, 0.7, 0.04), "#2B2D42", 0, 0, 1.12);
    blade.rotation.z = rot;
    g.add(blade);
  }
  for (const side of [-1, 1]) {
    const w = part(kit, kit.cylinder(0.12, 0.12, 0.1, 10), "#2B2D42", side * 0.35, -0.38, 0.2);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  return g;
}

export function buildRocket(kit: MeshKit, prize: PrizeDef): Group {
  const [body, fin, window] = prize.palette;
  const o = finishOpts(prize, { rough: 0.4, flat: false });
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.38, 0.42, 1.2, 14), body, 0, -0.15, 0, 1, 1, 1, o));
  g.add(part(kit, kit.cone(0.4, 0.6, 14), fin, 0, 0.75, 0, 1, 1, 1, o));
  const finGeo = kit.box(0.1, 0.5, 0.4);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const f = part(kit, finGeo, fin, Math.cos(a) * 0.48, -0.72, Math.sin(a) * 0.48, 1, 1, 1, o);
    f.rotation.y = -a;
    g.add(f);
  }
  g.add(part(kit, kit.torus(0.2, 0.05, 8, 18), fin, 0, 0.12, 0.38));
  g.add(part(kit, kit.sphere(0.18, 10, 7), window, 0, 0.12, 0.36, 1, 1, 0.5, { emissive: window, emissiveIntensity: 0.25, flat: false }));
  g.add(part(kit, kit.cylinder(0.26, 0.3, 0.2, 12), "#555B6E", 0, -0.85, 0, 1, 1, 1, { metal: 0.6, rough: 0.4 }));
  g.add(part(kit, kit.cone(0.22, 0.4, 8), "#FFB347", 0, -1.05, 0, 1, 1, 1, { emissive: "#FF6A57", emissiveIntensity: 0.7 })).rotation.x = Math.PI;
  return g;
}

export function buildRobot(kit: MeshKit, prize: PrizeDef): Group {
  const [metal, dark, light] = prize.palette;
  const o = finishOpts(prize, { rough: 0.4, metal: 0.35, flat: false });
  const g = new Group();
  g.add(part(kit, kit.box(0.9, 0.78, 0.6), metal, 0, -0.25, 0, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.76, 0.6, 0.66), metal, 0, 0.5, 0, 1, 1, 1, o));
  g.add(part(kit, kit.box(0.5, 0.3, 0.1), dark, 0, -0.15, 0.32));
  for (const side of [-1, 1]) {
    g.add(part(kit, kit.cylinder(0.1, 0.1, 0.1, 10), light, side * 0.2, 0.55, 0.34, 1, 1, 1, { emissive: light, emissiveIntensity: 0.8 })).rotation.x = Math.PI / 2;
    g.add(part(kit, kit.box(0.18, 0.6, 0.22), dark, side * 0.58, -0.2, 0, 1, 1, 1, { rough: 0.6 }));
    g.add(part(kit, kit.sphere(0.13, 8, 6), metal, side * 0.58, -0.55, 0, 1, 1, 1, o));
    g.add(part(kit, kit.box(0.26, 0.3, 0.3), dark, side * 0.24, -0.8, 0.02, 1, 1, 1, { rough: 0.6 }));
    g.add(part(kit, kit.box(0.08, 0.14, 0.08), dark, side * 0.42, 0.6, 0, 1, 1, 1));
  }
  g.add(part(kit, kit.box(0.5, 0.06, 0.1), dark, 0, 0.32, 0.34));
  g.add(part(kit, kit.cylinder(0.03, 0.03, 0.3, 6), dark, 0, 0.95, 0));
  g.add(part(kit, kit.sphere(0.09, 8, 6), light, 0, 1.12, 0, 1, 1, 1, { emissive: light, emissiveIntensity: 0.9 }));
  for (let i = 0; i < 3; i++) g.add(part(kit, kit.sphere(0.05, 6, 4), [light, "#FFD54D", "#3DFF88"][i], -0.18 + i * 0.18, -0.15, 0.38, 1, 1, 1, { emissive: [light, "#FFD54D", "#3DFF88"][i], emissiveIntensity: 0.8 }));
  if (prize.id.includes("hero")) {
    const cape = part(kit, kit.box(0.9, 1.0, 0.06), dark, 0, -0.2, -0.36, 1, 1, 1, { rough: 0.9 });
    cape.rotation.x = 0.15;
    g.add(cape);
  }
  return g;
}

export function buildChest(kit: MeshKit, prize: PrizeDef): Group {
  const [wood, gold, gem] = prize.palette;
  const metal = { metal: 0.75, rough: 0.3 };
  const g = new Group();
  g.add(part(kit, kit.box(1.4, 0.76, 0.9), wood, 0, -0.38, 0, 1, 1, 1, { rough: 0.85 }));
  const lidGeo = kit.geo("chest-lid", () => {
    const c = new CylinderGeometry(0.45, 0.45, 1.4, 12, 1, false, 0, Math.PI);
    c.rotateZ(Math.PI / 2);
    return c;
  });
  g.add(part(kit, lidGeo, wood, 0, 0, 0, 1, 1, 1, { rough: 0.85 }));
  for (const x of [-0.45, 0.45]) {
    g.add(part(kit, kit.box(0.12, 0.8, 0.94), gold, x, -0.38, 0, 1, 1, 1, metal));
    const band = part(kit, kit.torus(0.46, 0.06, 6, 14, Math.PI), gold, x, 0, 0, 1, 1, 1, metal);
    band.rotation.y = Math.PI / 2;
    g.add(band);
  }
  g.add(part(kit, kit.box(0.26, 0.3, 0.1), gold, 0, -0.1, 0.47, 1, 1, 1, metal));
  g.add(part(kit, kit.sphere(0.07, 6, 5), "#2B2D42", 0, -0.12, 0.53));
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    g.add(part(kit, kit.sphere(0.07, 6, 5), i % 2 ? gem : "#41C9FF", Math.sin(a) * 0.42, Math.cos(a) * 0.42 + 0.02, 0.2, 1, 1, 1, { emissive: i % 2 ? gem : "#41C9FF", emissiveIntensity: 0.6 }));
  }
  return g;
}

export function buildGeneric(kit: MeshKit, prize: PrizeDef): Group {
  const [a, b] = prize.palette;
  const g = new Group();
  g.add(part(kit, kit.sphere(0.9, 12, 9), a, 0, 0, 0, 1, 0.9, 1, finishOpts(prize)));
  g.add(part(kit, kit.sphere(0.5, 10, 7), b, 0, -0.15, 0.55, 1, 0.8, 0.6, finishOpts(prize)));
  addFace(kit, g, { y: 0.2, z: 0.8, spread: 0.28 });
  return g;
}
