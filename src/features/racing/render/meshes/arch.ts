import { BoxGeometry, BufferGeometry, CatmullRomCurve3, DoubleSide, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MeshKit } from "@/components/three/kit";
import { ARCH } from "../../config";
import type { Checkpoint } from "../../world/track";
import type { RacingTextures } from "../textures";

const TUBE = 0.78;

/**
 * A big striped decorative arch across the road, like the reference: a barber-pole
 * tube, concrete feet, a ring of bulbs and a hanging banner. `kind` picks the colours
 * (red for the start and finish line, blue for checkpoints).
 */
export function buildArch(gate: Checkpoint, kind: "start" | "gate", kit: MeshKit, textures: RacingTextures): Group {
  const rx = gate.halfWidth + ARCH.legOffset;
  const ry = ARCH.height;
  const key = `${kind}-${rx.toFixed(2)}`;
  const stripes = kind === "start" ? textures.archRed : textures.archBlue;
  stripes.repeat.set(34, 1);

  const pts: Vector3[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI;
    pts.push(new Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0));
  }
  const tube = kit.geo(`arch-tube-${key}`, () => new TubeGeometry(new CatmullRomCurve3(pts, false, "centripetal"), 72, TUBE, 10, false));
  const tubeMat = kit.track(new MeshStandardMaterial({ map: stripes, roughness: 0.5, metalness: 0.05 }));
  const tubeMesh = new Mesh(tube, tubeMat);
  tubeMesh.castShadow = true;

  // Feet.
  const foot = new BoxGeometry(2.3, 1.1, 2.3);
  const feet = kit.geo(`arch-feet-${key}`, () => {
    const a = foot.clone().translate(-rx, 0.55, 0);
    const b = foot.clone().translate(rx, 0.55, 0);
    const merged = mergeGeometries([a, b], false) as BufferGeometry;
    a.dispose();
    b.dispose();
    return merged;
  });
  foot.dispose();
  const feetMesh = new Mesh(feet, kit.mat(kind === "start" ? "#f4f0e6" : "#e6eef7", { rough: 0.8 }));
  feetMesh.castShadow = true;

  // Bulbs along the inside of the arch.
  const bulb = new SphereGeometry(0.26, 8, 6);
  const bulbs = kit.geo(`arch-bulbs-${key}`, () => {
    const list: BufferGeometry[] = [];
    for (let i = 1; i < 22; i++) {
      const a = (i / 22) * Math.PI;
      list.push(bulb.clone().translate(Math.cos(a) * (rx - 0.2), Math.sin(a) * (ry - 0.2) - 0.75, 0.0));
    }
    const merged = mergeGeometries(list, false) as BufferGeometry;
    for (const g of list) g.dispose();
    return merged;
  });
  bulb.dispose();
  const bulbMesh = new Mesh(bulbs, kit.mat("#fff0a8", { emissive: "#ffd54d", emissiveIntensity: 1.4 }));

  // Hanging banner.
  const width = rx * 1.05;
  const bannerGeo = kit.geo(`arch-banner-${key}`, () => new PlaneGeometry(width, width * 0.25));
  const banner = new Mesh(bannerGeo, kit.track(new MeshStandardMaterial({ map: kind === "start" ? textures.bannerStart : textures.bannerGate, roughness: 0.7, side: DoubleSide })));
  banner.position.y = ry * 0.85 - width * 0.125 - 0.4;
  // The plane's front faces +z (the way the track runs); turn it to face the cars coming at the arch.
  banner.rotation.y = Math.PI;
  banner.castShadow = true;

  const group = new Group();
  group.add(tubeMesh, feetMesh, bulbMesh, banner);
  group.position.set(gate.x, gate.y, gate.z);
  group.rotation.y = gate.heading;
  return group;
}
