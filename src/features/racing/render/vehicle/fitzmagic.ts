import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, MathUtils, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MeshKit } from "@/components/three/kit";
import { BUGGY } from "../../config";
import type { RacingTextures } from "../textures";
import { VehicleAnimator } from "./animator";
import { loft, profileOf, sampleAt, topPitch, type Profile, type Station } from "./loft";
import type { VehicleStyle } from "./styles";
import { colored, Parts, type VehicleVisual } from "./visual";

export type { VehicleVisual, VehicleVisualState } from "./visual";

const WHEEL_X = 1.1;
const WHEEL_Z = 1.5;
const PIVOT_Y = 1;
const SQUARENESS = 3.2;

/** The tub, rear to nose: a wide, low, wedge-shaped hypercar. */
const BODY_KEYS: Station[] = [
  { z: -2.5, bottom: 0.55, top: 0.78, hw: 0.3 },
  { z: -2.3, bottom: 0.38, top: 1.0, hw: 0.78 },
  { z: -1.8, bottom: 0.3, top: 1.16, hw: 1.02 },
  { z: -1.0, bottom: 0.27, top: 1.14, hw: 1.07 },
  { z: 0, bottom: 0.26, top: 1.02, hw: 1.07 },
  { z: 1.0, bottom: 0.25, top: 0.9, hw: 1.07 },
  { z: 1.7, bottom: 0.25, top: 0.74, hw: 1.0 },
  { z: 2.2, bottom: 0.27, top: 0.58, hw: 0.84 },
  { z: 2.5, bottom: 0.32, top: 0.46, hw: 0.5 },
  { z: 2.6, bottom: 0.35, top: 0.42, hw: 0.18 },
];

/** The canopy: a smooth black bubble that rises out of the tub. */
const CANOPY_KEYS: Station[] = [
  { z: -1.25, bottom: 1.05, top: 1.1, hw: 0.25 },
  { z: -1.0, bottom: 1.05, top: 1.38, hw: 0.56 },
  { z: -0.45, bottom: 0.98, top: 1.74, hw: 0.74 },
  { z: 0.2, bottom: 0.95, top: 1.8, hw: 0.76 },
  { z: 0.75, bottom: 0.86, top: 1.5, hw: 0.66 },
  { z: 1.2, bottom: 0.8, top: 1.04, hw: 0.4 },
  { z: 1.4, bottom: 0.78, top: 0.9, hw: 0.18 },
];

const BODY = profileOf(BODY_KEYS, 7);
const CANOPY = profileOf(CANOPY_KEYS, 6);

/** 0 below `a`, 1 above `b` (or the reverse when a > b), smoothly in between. */
function smooth(a: number, b: number, x: number): number {
  return MathUtils.smoothstep((x - a) / (b - a), 0, 1);
}

/** Where the surface of the tub is, at height `y` and station `z`: the x of its right-hand wall. */
function flankX(profile: Profile, z: number, y: number): number {
  const s = sampleAt(profile, z);
  const yc = (s.top + s.bottom) / 2;
  const hh = (s.top - s.bottom) / 2;
  const t = Math.min(0.97, Math.abs((y - yc) / hh));
  return s.hw * (1 - t ** SQUARENESS) ** (1 / SQUARENESS);
}

/** Height of the tub's top surface at (x, z). */
function deckY(profile: Profile, z: number, x: number): number {
  const s = sampleAt(profile, z);
  const t = Math.min(0.97, Math.abs(x) / s.hw);
  return (s.top + s.bottom) / 2 + ((s.top - s.bottom) / 2) * (1 - t ** SQUARENESS) ** (1 / SQUARENESS);
}

/** A grid of vertices laid over the bodywork. `at(u, v)` gives a point for texture coordinates u, v in [0, 1]. */
function decalMesh(cols: number, rows: number, at: (u: number, v: number) => [number, number, number]): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const v = j / rows;
      pos.push(...at(u, v));
      uv.push(u, v);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      index.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/**
 * The Fitzmagic hypercar: pearl flanks and tail, a glossy black nose and skirts, a black
 * canopy, an LED strip and a gold roundel up front, big multi-spoke wheels and the logo
 * down both sides and across the tail. The body is lofted from a handful of sections,
 * so it is one smooth sculpted shape, not a pile of boxes.
 */
export function buildFitzmagic(style: VehicleStyle, kit: MeshKit, textures: RacingTextures): VehicleVisual {
  const root = new Group();
  root.rotation.order = "YXZ";
  const body = new Group();
  body.rotation.order = "YXZ";
  body.position.y = PIVOT_Y;
  root.add(body);

  // Materials.
  const paint = kit.track(new MeshPhysicalMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.28, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06 }));
  const pearl = kit.track(new MeshPhysicalMaterial({ color: style.body, roughness: 0.28, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, side: DoubleSide }));
  const black = kit.mat(style.trim, { flat: false, rough: 0.2, metal: 0.45 });
  const glass = kit.track(new MeshPhysicalMaterial({ color: "#16203a", roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1, transparent: true, opacity: 0.82, depthWrite: false }));
  const gold = kit.mat(style.accent, { flat: false, rough: 0.25, metal: 0.9 });
  const chrome = kit.mat("#dfe3ea", { flat: false, rough: 0.2, metal: 0.9 });
  const rubber = kit.mat("#16171d", { flat: false, rough: 0.9 });
  const led = kit.mat("#e9fbff", { flat: false, emissive: "#9fe6ff", emissiveIntensity: 2.2 });
  const tail = kit.track(new MeshStandardMaterial({ color: "#c81e1e", emissive: "#ff1a1a", emissiveIntensity: 0.9, roughness: 0.4 }));
  const decal = kit.track(new MeshStandardMaterial({ map: textures.fitzmagic, roughness: 0.35, transparent: true, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));

  const sources: BufferGeometry[] = [];
  const src = <T extends BufferGeometry>(g: T): T => {
    sources.push(g);
    return g;
  };
  const box = (w: number, h: number, d: number) => src(new BoxGeometry(w, h, d));
  const rb = (w: number, h: number, d: number, r: number) => src(new RoundedBoxGeometry(w, h, d, 3, r));

  const pearlC = new Color(style.body);
  const blackC = new Color(style.trim);

  // The tub: pearl above the sills, glossy black on the nose, under the skirts and in the diffuser.
  const tub = src(
    loft(BODY, {
      around: 32,
      squareness: SQUARENESS,
      paint: (_x, _y, z, v, out) => {
        const mix = Math.max(smooth(1.35, 1.75, z), smooth(-0.1, -0.55, v), smooth(-1.95, -2.25, z) * smooth(0.5, -0.1, v));
        out.copy(pearlC).lerp(blackC, mix);
      },
    }),
  );
  const canopy = src(loft(CANOPY, { around: 24, squareness: 2.4, paint: (_x, _y, _z, _v, out) => void out.set("#ffffff") }));

  const parts = new Parts(PIVOT_Y);
  parts.add(paint, tub, [0, 0, 0]);

  // Arches over the wheels.
  const arch = src(new CylinderGeometry(0.62, 0.62, 0.5, 18, 1, true, 0, Math.PI));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) parts.add(pearl, arch, [sx * WHEEL_X, BUGGY.wheelRadius, sz * WHEEL_Z], [0, 0, Math.PI / 2]);
  }

  // Nose: the LED strip across the leading edge, a dark mouth with silver fins, the gold roundel.
  const stripZ = 2.02;
  const strip = sampleAt(BODY, stripZ);
  const stripPitch = topPitch(BODY, stripZ);
  parts.add(led, box(1.5, 0.04, 0.06), [0, strip.top + 0.012, stripZ], [stripPitch, 0, 0]);
  for (const sx of [-1, 1]) parts.add(led, box(0.42, 0.04, 0.06), [sx * 0.9, strip.top - 0.03, stripZ - 0.06], [stripPitch, sx * 0.55, 0]);
  parts.add(black, box(1.15, 0.16, 0.3), [0, 0.42, 2.3]);
  for (const y of [0.37, 0.42, 0.47]) parts.add(chrome, box(1.1, 0.025, 0.07), [0, y, 2.44]);
  const roundelZ = 1.7;
  parts.add(gold, src(new CylinderGeometry(0.2, 0.2, 0.025, 24)), [0, deckY(BODY, roundelZ, 0) + 0.008, roundelZ], [topPitch(BODY, roundelZ), 0, 0]);
  parts.add(black, src(new CylinderGeometry(0.1, 0.1, 0.03, 20)), [0, deckY(BODY, roundelZ, 0) + 0.012, roundelZ], [topPitch(BODY, roundelZ), 0, 0]);

  // Mirrors, exhausts.
  for (const sx of [-1, 1]) {
    parts.add(black, rb(0.12, 0.1, 0.26, 0.04), [sx * 0.86, 1.2, 0.5]);
    parts.add(black, box(0.05, 0.05, 0.05), [sx * 0.8, 1.12, 0.5]);
    parts.add(chrome, src(new CylinderGeometry(0.11, 0.13, 0.3, 14)), [sx * 0.42, 0.5, -2.5], [Math.PI / 2, 0, 0]);
    parts.add(black, src(new CylinderGeometry(0.075, 0.075, 0.32, 12)), [sx * 0.42, 0.5, -2.5], [Math.PI / 2, 0, 0]);
  }
  // Rear diffuser fins.
  for (const x of [-0.45, -0.15, 0.15, 0.45]) parts.add(black, box(0.04, 0.14, 0.3), [x, 0.36, -2.3]);
  for (const m of parts.meshes(kit, "fitz-body")) body.add(m);

  // Canopy.
  const glassParts = new Parts(PIVOT_Y);
  glassParts.add(glass, canopy, [0, 0, 0]);
  for (const m of glassParts.meshes(kit, "fitz-canopy", false)) body.add(m);

  // The logo, bent to follow the bodywork: down both flanks and across the tail.
  if (style.decal === "fitzmagic") {
    const decals = new Parts(PIVOT_Y);
    const len = 1.62;
    const rise = 0.07;
    const height = 0.4;
    for (const side of [-1, 1]) {
      // The viewer's right is toward the tail on the left flank and toward the nose on the right flank.
      const z0 = side > 0 ? len / 2 : -len / 2;
      const z1 = -z0;
      decals.add(
        decal,
        src(
          decalMesh(28, 6, (u, v) => {
            const z = z0 + (z1 - z0) * u;
            const s = sampleAt(BODY, z);
            const y = (s.top + s.bottom) / 2 + rise + (v - 0.5) * height;
            return [side * (flankX(BODY, z, y) + 0.012), y, z];
          }),
        ),
        [0, 0, 0],
      );
    }
    decals.add(
      decal,
      src(
        decalMesh(24, 4, (u, v) => {
          const x = 0.62 - 1.24 * u;
          const z = -1.93 + 0.31 * v;
          return [x, deckY(BODY, z, x) + 0.012, z];
        }),
      ),
      [0, 0, 0],
    );
    for (const m of decals.meshes(kit, "fitz-decal", false)) body.add(m);
  }

  // Tail lights are separate so they can brighten under braking.
  const tailParts = new Parts(PIVOT_Y);
  tailParts.add(tail, box(1.25, 0.09, 0.06), [0, 0.8, -2.33]);
  for (const m of tailParts.meshes(kit, "fitz-tail", false)) body.add(m);

  // Exhaust flames, shown while boosting.
  const flames = new Group();
  flames.position.set(0, 0.5 - PIVOT_Y, -2.7);
  const flameParts = new Parts();
  const flameCone = src(new ConeGeometry(0.2, 1.5, 8).rotateX(-Math.PI / 2));
  const flameMat = kit.track(new MeshBasicMaterial({ color: "#ff9a1f", transparent: true, opacity: 0.92 }));
  const flameCore = kit.track(new MeshBasicMaterial({ color: "#aee6ff", transparent: true, opacity: 0.95 }));
  for (const sx of [-1, 1]) {
    flameParts.add(flameMat, flameCone, [sx * 0.42, 0, -0.75]);
    flameParts.add(flameCore, flameCone, [sx * 0.42, 0, -0.45], [0, 0, 0], [0.5, 0.5, 0.55]);
  }
  for (const m of flameParts.meshes(kit, "fitz-flame", false)) flames.add(m);
  flames.visible = false;
  body.add(flames);

  // The driver, visible through the canopy, who leans into corners a little less than the car does.
  const driver = new Group();
  const driverParts = new Parts(PIVOT_Y);
  const shirt = kit.mat(style.shirt, { flat: false, rough: 0.7 });
  const skin = kit.mat(style.skin, { flat: false, rough: 0.7 });
  const helmet = kit.mat(style.helmet, { flat: false, rough: 0.25, metal: 0.15 });
  const visor = kit.mat("#14171f", { flat: false, rough: 0.15, metal: 0.4 });
  driverParts.add(shirt, rb(0.56, 0.42, 0.34, 0.12), [0, 1.1, -0.12]);
  driverParts.add(skin, src(new SphereGeometry(0.19, 14, 10)), [0, 1.4, -0.1]);
  driverParts.add(helmet, src(new SphereGeometry(0.235, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6)), [0, 1.44, -0.1]);
  driverParts.add(visor, box(0.36, 0.09, 0.1), [0, 1.43, 0.12]);
  for (const m of driverParts.meshes(kit, "fitz-driver")) driver.add(m);
  body.add(driver);

  // Wheels: a steering pivot, a spinning group, a tyre and a multi-spoke rim.
  const R = BUGGY.wheelRadius;
  const tireGeo = kit.geo("fitz-tire", () => new CylinderGeometry(R, R, 0.46, 28).rotateZ(Math.PI / 2));
  const rimGeo = kit.geo(`fitz-rim-${style.hub}-${style.accent}`, () => {
    const list: BufferGeometry[] = [colored(new CylinderGeometry(0.4, 0.4, 0.47, 24).rotateZ(Math.PI / 2), "#1d2028"), colored(new CylinderGeometry(0.1, 0.1, 0.5, 14).rotateZ(Math.PI / 2), style.accent)];
    const spoke = new BoxGeometry(0.045, 0.3, 0.075);
    for (const face of [-1, 1]) {
      list.push(colored(new CylinderGeometry(0.405, 0.405, 0.03, 24).rotateZ(Math.PI / 2).translate(face * 0.225, 0, 0), style.hub));
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        list.push(colored(spoke.clone().translate(face * 0.235, 0.22, 0).rotateX(a), k % 2 ? style.hub : "#8d93a1"));
      }
    }
    spoke.dispose();
    const merged = mergeGeometries(
      list.map((g) => (g.index ? g.toNonIndexed() : g)),
      false,
    );
    for (const g of list) g.dispose();
    return merged as BufferGeometry;
  });
  const rimMat = kit.track(new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.7 }));
  const pivots: Group[] = [];
  const spins: Group[] = [];
  // Front-left, front-right, rear-left, rear-right: the first two steer.
  const corners: [number, number][] = [
    [WHEEL_X, WHEEL_Z],
    [-WHEEL_X, WHEEL_Z],
    [WHEEL_X, -WHEEL_Z],
    [-WHEEL_X, -WHEEL_Z],
  ];
  for (const [x, z] of corners) {
    const pivot = new Group();
    pivot.position.set(x, R, z);
    const spin = new Group();
    const tire = new Mesh(tireGeo, rubber);
    const rim = new Mesh(rimGeo, rimMat);
    tire.castShadow = true;
    spin.add(tire, rim);
    pivot.add(spin);
    root.add(pivot);
    pivots.push(pivot);
    spins.push(spin);
  }

  for (const g of sources) g.dispose();

  const animator = new VehicleAnimator();
  return {
    root,
    land: (impact) => animator.land(impact),
    update(s, dt) {
      root.position.set(s.x, s.y, s.z);
      root.rotation.y = s.heading;
      animator.update(dt, { accel: s.accel, yawRate: s.yawRate, speed: s.speed, grounded: s.grounded, vy: s.vy, slope: s.slope, bumpiness: s.bumpiness });
      body.position.y = PIVOT_Y + animator.bounce;
      body.rotation.x = animator.pitch;
      body.rotation.z = animator.roll;
      driver.rotation.z = -animator.roll * 0.8;
      driver.rotation.x = animator.pitch * -0.5;
      for (let i = 0; i < 4; i++) {
        pivots[i].position.y = R + animator.wheels[i];
        // Right steering turns the front wheels toward the car's right (negative rotation about +y).
        if (i < 2) pivots[i].rotation.y = -s.steer * 0.5;
        spins[i].rotation.x = s.wheelSpin;
      }
      flames.visible = s.boosting;
      if (s.boosting) flames.scale.set(1, 1, 0.8 + 0.4 * Math.sin(s.time * 55) + 0.2 * Math.sin(s.time * 31));
      tail.emissiveIntensity = s.braking ? 3 : 0.9;
      // Respawn flicker.
      root.visible = s.grace <= 0 || Math.floor(s.time * 14) % 2 === 0;
    },
  };
}
