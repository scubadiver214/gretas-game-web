import { Group, Mesh, type BufferGeometry } from "three";
import type { MeshKit } from "@/components/three/kit";
import type { PrizeDef } from "../../content/prizes";

/** Shared helpers for the procedural toy builders. All builders work in a unit sphere (radius 1). */

export function part(kit: MeshKit, geo: BufferGeometry, color: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, opts: Parameters<MeshKit["mat"]>[1] = {}): Mesh {
  const m = new Mesh(geo, kit.mat(color, opts));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

/** Material options for a prize's finish (gold, glow, sparkle, crystal). */
export function finishOpts(prize: PrizeDef, base?: Parameters<MeshKit["mat"]>[1]): Parameters<MeshKit["mat"]>[1] {
  switch (prize.finish) {
    case "gold":
      return { ...base, metal: 0.75, rough: 0.28 };
    case "glow":
      return { ...base, emissive: prize.palette[0], emissiveIntensity: 0.55 };
    case "sparkle":
      return { ...base, emissive: prize.palette[1], emissiveIntensity: 0.18, rough: 0.45 };
    case "crystal":
      return { ...base, transparent: true, opacity: 0.72, rough: 0.15, metal: 0.1, flat: false };
    default:
      return base ?? {};
  }
}

/** Two round eyes with highlights and a little smile, facing +z. */
export function addFace(kit: MeshKit, parent: Group, opts: { y: number; z: number; spread?: number; scale?: number; eye?: string; smile?: boolean; smileColor?: string }): void {
  const s = opts.scale ?? 1;
  const spread = opts.spread ?? 0.26;
  const eye = kit.sphere(0.1, 8, 6);
  const shine = kit.sphere(0.035, 6, 4);
  for (const side of [-1, 1]) {
    parent.add(part(kit, eye, opts.eye ?? "#14161C", side * spread, opts.y, opts.z, s, s, s * 0.7));
    parent.add(part(kit, shine, "#FFFFFF", side * spread + 0.03 * s, opts.y + 0.04 * s, opts.z + 0.07 * s, s, s, s));
  }
  if (opts.smile !== false) {
    const smile = part(kit, kit.torus(0.13, 0.025, 5, 10, Math.PI), opts.smileColor ?? "#14161C", 0, opts.y - 0.2 * s, opts.z, s, s, s);
    smile.rotation.z = Math.PI;
    parent.add(smile);
  }
}

/** Soft blush dots either side of a face. */
export function addCheeks(kit: MeshKit, parent: Group, y: number, z: number, spread = 0.42, color = "#FF8FB1"): void {
  const geo = kit.sphere(0.07, 6, 4);
  for (const side of [-1, 1]) parent.add(part(kit, geo, color, side * spread, y, z, 1, 0.7, 0.5));
}
