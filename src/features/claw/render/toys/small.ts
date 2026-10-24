import { ExtrudeGeometry, Group, Mesh, OctahedronGeometry, Shape } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";
import { jarLabelTexture } from "../textures";
import { addFace, finishOpts, part } from "./parts";

/** Small toys and novelties. All fit a unit sphere and face +z. */

export function buildDuck(kit: MeshKit, prize: PrizeDef): Group {
  const [body, beak, dark] = prize.palette;
  const o = finishOpts(prize, { flat: false, rough: 0.5 });
  const g = new Group();
  g.add(part(kit, kit.sphere(0.62, 14, 10), body, 0, -0.3, -0.05, 1, 0.8, 1.15, o));
  g.add(part(kit, kit.sphere(0.42, 14, 10), body, 0, 0.42, 0.3, 1, 1, 1, o));
  const beakMesh = part(kit, kit.cone(0.16, 0.36, 8), beak, 0, 0.34, 0.74, 1.3, 1, 1);
  beakMesh.rotation.x = Math.PI / 2;
  g.add(beakMesh);
  for (const side of [-1, 1]) g.add(part(kit, kit.sphere(0.26, 10, 7), body, side * 0.5, -0.3, -0.1, 0.5, 0.8, 1.1, o));
  const tail = part(kit, kit.cone(0.18, 0.4, 6), body, 0, -0.1, -0.78, 1, 1, 1, o);
  tail.rotation.x = -Math.PI / 2 - 0.7;
  g.add(tail);
  addFace(kit, g, { y: 0.52, z: 0.6, spread: 0.2, scale: 0.8, smile: false, eye: dark });
  if (prize.id.includes("pirate")) {
    // Hat and eyepatch.
    g.add(part(kit, kit.cylinder(0.5, 0.5, 0.06, 12), dark, 0, 0.8, 0.25));
    g.add(part(kit, kit.cylinder(0.3, 0.34, 0.3, 12), dark, 0, 0.96, 0.25));
    g.add(part(kit, kit.box(0.5, 0.06, 0.06), prize.palette[2], 0, 0.9, 0.56));
    g.add(part(kit, kit.sphere(0.13, 8, 6), dark, 0.2, 0.52, 0.62, 1, 1, 0.5));
    g.add(part(kit, kit.box(0.02, 0.02, 0.9), dark, 0.22, 0.6, 0.3, 1, 1, 1)).rotation.y = Math.PI / 2;
  }
  return g;
}

export function buildBall(kit: MeshKit, prize: PrizeDef): Group {
  const [a, b, c] = prize.palette;
  const g = new Group();
  g.add(part(kit, kit.sphere(0.95, 18, 14), a, 0, 0, 0, 1, 1, 1, finishOpts(prize, { flat: false, rough: 0.45 })));
  const band = kit.torus(0.95, 0.09, 8, 36);
  const h = part(kit, band, b, 0, 0, 0, 1, 1, 1, { flat: false, rough: 0.45 });
  h.rotation.x = Math.PI / 2;
  g.add(h);
  const v = part(kit, band, c, 0, 0, 0, 1, 1, 1, { flat: false, rough: 0.45 });
  v.rotation.y = Math.PI / 2;
  g.add(v);
  return g;
}

export function buildYoyo(kit: MeshKit, prize: PrizeDef): Group {
  const [a, b, c] = prize.palette;
  const g = new Group();
  const disc = kit.cylinder(0.9, 0.9, 0.32, 20);
  for (const side of [-1, 1]) {
    const d = part(kit, disc, a, 0, 0, side * 0.26, 1, 1, 1, finishOpts(prize, { flat: false, rough: 0.4 }));
    d.rotation.x = Math.PI / 2;
    g.add(d);
    const ring = part(kit, kit.torus(0.6, 0.06, 6, 24), b, 0, 0, side * 0.43);
    g.add(ring);
    g.add(part(kit, kit.cylinder(0.25, 0.25, 0.04, 16), c, 0, 0, side * 0.44, 1, 1, 1)).rotation.x = Math.PI / 2;
  }
  g.add(part(kit, kit.cylinder(0.14, 0.14, 0.24, 10), "#DDDDDD", 0, 0, 0, 1, 1, 1, { metal: 0.6, rough: 0.3 })).rotation.x = Math.PI / 2;
  // A loop of string hanging off the axle.
  g.add(part(kit, kit.torus(0.2, 0.025, 5, 14), "#FFFFFF", 0, -0.3, 0));
  return g;
}

export function buildRing(kit: MeshKit, prize: PrizeDef): Group {
  const [gem, band] = prize.palette;
  const g = new Group();
  const b = part(kit, kit.torus(0.62, 0.14, 10, 28), band, 0, -0.15, 0, 1, 1, 1, { metal: 0.7, rough: 0.3, flat: false });
  b.rotation.x = Math.PI / 2;
  g.add(b);
  g.add(part(kit, kit.cylinder(0.3, 0.22, 0.2, 8), band, 0, 0.05, 0, 1, 1, 1, { metal: 0.7, rough: 0.3 }));
  const gemGeo = kit.geo("ring-gem", () => new OctahedronGeometry(0.42, 0));
  g.add(part(kit, gemGeo, gem, 0, 0.45, 0, 1, 1.25, 1, { rough: 0.15, metal: 0.2, emissive: gem, emissiveIntensity: 0.25 }));
  return g;
}

export function buildEraser(kit: MeshKit, prize: PrizeDef): Group {
  const [berry, leaf, seed] = prize.palette;
  const g = new Group();
  const body = part(kit, kit.cone(0.78, 1.5, 12), berry, 0, -0.05, 0, 1, 1, 1, { rough: 0.9 });
  body.rotation.x = Math.PI;
  g.add(body);
  g.add(part(kit, kit.sphere(0.78, 12, 6, Math.PI / 2), berry, 0, 0.7, 0, 1, 0.5, 1, { rough: 0.9 }));
  const leafGeo = kit.cone(0.22, 0.5, 4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const l = part(kit, leafGeo, leaf, Math.cos(a) * 0.3, 0.96, Math.sin(a) * 0.3, 1, 0.5, 1);
    l.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    g.add(l);
  }
  g.add(part(kit, kit.cylinder(0.07, 0.07, 0.3, 6), leaf, 0, 1.05, 0));
  const seedGeo = kit.sphere(0.04, 5, 4);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const y = 0.5 - (i / 14) * 1.2;
    const r = 0.78 * (1 - (0.7 - y) / 1.5) + 0.02;
    g.add(part(kit, seedGeo, seed, Math.cos(a) * r, y, Math.sin(a) * r));
  }
  addFace(kit, g, { y: 0.2, z: 0.62, spread: 0.22, scale: 0.75 });
  return g;
}

export function buildStar(kit: MeshKit, prize: PrizeDef): Group {
  const [body, , glow] = prize.palette;
  const g = new Group();
  const geo = kit.geo("star-5", () => {
    const shape = new Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.42 : 0.95;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    const e = new ExtrudeGeometry(shape, { depth: 0.36, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
    e.translate(0, 0, -0.18);
    return e;
  });
  g.add(part(kit, geo, body, 0, 0, 0, 1, 1, 1, finishOpts(prize, { flat: true, rough: 0.5 })));
  addFace(kit, g, { y: 0.05, z: 0.28, spread: 0.22, scale: 0.75, smileColor: glow });
  return g;
}

export function buildFidget(kit: MeshKit, prize: PrizeDef): Group {
  const [a, b, c] = prize.palette;
  const g = new Group();
  const base = part(kit, kit.cylinder(0.95, 0.95, 0.26, 24), a, 0, -0.1, 0, 1, 1, 1, { rough: 0.6, flat: false });
  g.add(base);
  const bubble = kit.sphere(0.2, 10, 7, Math.PI / 2);
  const colors = [b, c, "#FFFFFF"];
  let n = 0;
  for (let ring = 0; ring < 3; ring++) {
    const count = ring === 0 ? 1 : ring * 6;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const r = ring * 0.32;
      g.add(part(kit, bubble, colors[n++ % 3], Math.cos(ang) * r, 0.03, Math.sin(ang) * r, 1, 0.7, 1, { rough: 0.5, flat: false }));
    }
  }
  return g;
}

export function buildSlime(kit: MeshKit, prize: PrizeDef): Group {
  const [goo, lid, shine] = prize.palette;
  const g = new Group();
  const jar = part(kit, kit.cylinder(0.72, 0.68, 1.3, 16), "#DDF3FF", 0, -0.2, 0, 1, 1, 1, { transparent: true, opacity: 0.32, rough: 0.1, metal: 0.05, flat: false });
  jar.castShadow = false;
  jar.renderOrder = 2;
  g.add(part(kit, kit.sphere(0.56, 12, 9), goo, 0, -0.42, 0, 1, 0.78, 1, finishOpts(prize, { flat: false, rough: 0.35 })));
  g.add(part(kit, kit.cylinder(0.76, 0.76, 0.26, 16), lid, 0, 0.56, 0, 1, 1, 1, { rough: 0.5 }));
  g.add(part(kit, kit.cylinder(0.5, 0.5, 0.08, 12), lid, 0, 0.72, 0));
  const label = new Mesh(kit.box(0.9, 0.42, 0.02), kit.mat("#FFFFFF", { map: kit.texture(jarLabelTexture(lid)), flat: false }));
  label.position.set(0, -0.12, 0.7);
  label.castShadow = false;
  g.add(label);
  addFace(kit, g, { y: -0.34, z: 0.46, spread: 0.18, scale: 0.65, smileColor: shine });
  g.add(jar);
  return g;
}

export function buildPen(kit: MeshKit, prize: PrizeDef): Group {
  const [hair, barrel, skin] = prize.palette;
  const g = new Group();
  g.add(part(kit, kit.cylinder(0.17, 0.17, 1.1, 10), barrel, 0, -0.35, 0, 1, 1, 1, { rough: 0.4 }));
  const nib = part(kit, kit.cone(0.17, 0.3, 10), "#DDDDDD", 0, -1.0, 0, 1, 1, 1, { metal: 0.6, rough: 0.3 });
  nib.rotation.x = Math.PI;
  g.add(nib);
  g.add(part(kit, kit.sphere(0.36, 12, 9), skin, 0, 0.4, 0, 1, 1, 1, { flat: false, rough: 0.7 }));
  const tuft = kit.cone(0.13, 0.75, 6);
  const alt = prize.finish === "sparkle" ? [hair, barrel, "#FFD54D", "#3DFF88"] : [hair];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.2;
    const t = part(kit, tuft, alt[i % alt.length], Math.cos(a) * r, 0.98, Math.sin(a) * r, 1, 1, 1, { rough: 0.9 });
    t.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    g.add(t);
  }
  addFace(kit, g, { y: 0.44, z: 0.3, spread: 0.14, scale: 0.6 });
  return g;
}

export function buildBrush(kit: MeshKit, prize: PrizeDef): Group {
  const [body, bristle, accent] = prize.palette;
  const g = new Group();
  const handle = part(kit, kit.cylinder(0.13, 0.17, 1.1, 10), body, 0, -0.5, 0, 1, 1, 1, { rough: 0.35, flat: false });
  g.add(handle);
  g.add(part(kit, kit.sphere(0.5, 12, 9), body, 0, 0.42, 0, 1, 0.42, 0.72, { rough: 0.35, flat: false }));
  const pin = kit.cylinder(0.035, 0.035, 0.34, 5);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      g.add(part(kit, pin, bristle, (c - 2.5) * 0.14, 0.72, (r - 1) * 0.18));
    }
  }
  g.add(part(kit, kit.sphere(0.1, 8, 6), accent, 0, -1.05, 0, 1, 1, 1, { emissive: accent, emissiveIntensity: 0.3 }));
  return g;
}
