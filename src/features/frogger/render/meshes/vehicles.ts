import { BoxGeometry, Group, Mesh, type Material } from "three";
import type { VehicleKind } from "../../types";
import type { Kit } from "../kit";

/** Bright toy-car paint, like the screenshots: pink, blue, red, green, orange, purple. */
const CAR_PAINT = ["#FF3FA4", "#2FA8FF", "#FF4D4D", "#3DDC84", "#FFA41B", "#A86BFF"];
const RACER_PAINT = ["#22D3EE", "#FF3FA4", "#FFD233"];

function mesh(kit: Kit, geo: Mesh["geometry"], mat: Material | Material[], x: number, y: number, z: number): Mesh {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function wheels(kit: Kit, g: Group, xs: number[], halfWidth: number, r = 0.12): void {
  const geo = kit.geo(`wheel|${r}`, () => kit.cylinder(r, r, 0.1, 8).clone().rotateX(Math.PI / 2));
  const tyre = kit.mat("#1B1D22", { rough: 0.9 });
  for (const x of xs) for (const z of [-halfWidth, halfWidth]) g.add(mesh(kit, geo, tyre, x, r, z));
}

function car(kit: Kit, variant: number): Group {
  const g = new Group();
  const paint = kit.mat(CAR_PAINT[variant % CAR_PAINT.length], { rough: 0.35, metal: 0.15 });
  g.add(mesh(kit, kit.box(0.9, 0.26, 0.66), paint, 0, 0.24, 0));
  g.add(mesh(kit, kit.box(0.48, 0.22, 0.58), paint, -0.06, 0.47, 0));
  // Windows: a slightly smaller glossy band around the cabin.
  g.add(mesh(kit, kit.box(0.5, 0.14, 0.6), kit.mat("#BFE6FF", { rough: 0.15, metal: 0.3 }), -0.06, 0.49, 0));
  for (const z of [-0.22, 0.22]) g.add(mesh(kit, kit.box(0.04, 0.07, 0.12), kit.mat("#FFF4B0", { emissive: "#FFE066" }), 0.46, 0.26, z));
  wheels(kit, g, [-0.28, 0.28], 0.31);
  return g;
}

function racer(kit: Kit, variant: number): Group {
  const g = new Group();
  const paint = kit.mat(RACER_PAINT[variant % RACER_PAINT.length], { rough: 0.3, metal: 0.25 });
  g.add(mesh(kit, kit.box(0.96, 0.18, 0.6), paint, 0, 0.2, 0));
  g.add(mesh(kit, kit.box(0.34, 0.14, 0.44), kit.mat("#1E293B", { rough: 0.2, metal: 0.4 }), -0.08, 0.35, 0));
  g.add(mesh(kit, kit.box(0.08, 0.16, 0.6), paint, -0.46, 0.36, 0));
  g.add(mesh(kit, kit.box(0.5, 0.03, 0.12), kit.mat("#FFFFFF"), 0.18, 0.3, 0));
  wheels(kit, g, [-0.3, 0.3], 0.3, 0.11);
  return g;
}

function bulldozer(kit: Kit): Group {
  const g = new Group();
  const yellow = kit.mat("#FFC21A", { rough: 0.55 });
  const dark = kit.mat("#2A2D33", { rough: 0.9 });
  g.add(mesh(kit, kit.box(0.6, 0.3, 0.6), yellow, -0.06, 0.32, 0));
  g.add(mesh(kit, kit.box(0.3, 0.26, 0.5), yellow, -0.16, 0.6, 0));
  g.add(mesh(kit, kit.box(0.32, 0.18, 0.52), kit.mat("#BFE6FF", { rough: 0.15 }), -0.16, 0.62, 0));
  g.add(mesh(kit, kit.box(0.08, 0.32, 0.78), kit.mat("#9CA3AF", { rough: 0.4, metal: 0.5 }), 0.4, 0.22, 0));
  g.add(mesh(kit, kit.box(0.18, 0.06, 0.06), dark, 0.3, 0.3, -0.2));
  g.add(mesh(kit, kit.box(0.18, 0.06, 0.06), dark, 0.3, 0.3, 0.2));
  for (const z of [-0.31, 0.31]) g.add(mesh(kit, kit.box(0.74, 0.2, 0.16), dark, -0.04, 0.1, z));
  return g;
}

function truck(kit: Kit): Group {
  const g = new Group();
  const red = kit.mat("#E53935", { rough: 0.45, metal: 0.1 });
  const box = kit.mat("#FFD233", { rough: 0.6 });
  const logo = kit.mat("#FFFFFF", { map: kit.textures.truckLogo, flat: false, rough: 0.6 });
  // Trailer with the logo on both long sides (BoxGeometry faces: +x,-x,+y,-y,+z,-z).
  const trailerGeo = kit.geo("truck-trailer", () => new BoxGeometry(1.36, 0.72, 0.74));
  g.add(mesh(kit, trailerGeo, [box, box, box, box, logo, logo], -0.3, 0.52, 0));
  g.add(mesh(kit, kit.box(0.5, 0.56, 0.72), red, 0.68, 0.38, 0));
  g.add(mesh(kit, kit.box(0.06, 0.24, 0.62), kit.mat("#BFE6FF", { rough: 0.15, metal: 0.3 }), 0.93, 0.5, 0));
  g.add(mesh(kit, kit.box(0.16, 0.08, 0.76), kit.mat("#2A2D33"), 0.38, 0.12, 0));
  for (const z of [-0.24, 0.24]) g.add(mesh(kit, kit.box(0.04, 0.07, 0.12), kit.mat("#FFF4B0", { emissive: "#FFE066" }), 0.94, 0.24, z));
  wheels(kit, g, [-0.75, -0.45, 0.65], 0.34, 0.13);
  return g;
}

/** A vehicle model built facing +X; the caller flips it for left-bound lanes. */
export function buildVehicle(kit: Kit, kind: VehicleKind, variant: number): Group {
  switch (kind) {
    case "truck":
      return truck(kit);
    case "bulldozer":
      return bulldozer(kit);
    case "racer":
      return racer(kit, variant);
    default:
      return car(kit, variant);
  }
}
