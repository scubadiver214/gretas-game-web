import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry, type Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { MeshKit } from "@/components/three/kit";
import { VehicleAnimator } from "./animator";
import { loft, profileOf, type Station } from "./loft";
import type { CarBody, VehicleStyle } from "./styles";
import { colored, Parts, type V3, type VehicleVisual } from "./visual";

interface Wheel {
  x: number;
  z: number;
  r: number;
  /** Tyre width. */
  w: number;
  steers: boolean;
  /** Chunky tread blocks (monster truck). */
  knobbly?: boolean;
}

/** What a body builder hands back: the wheels to hang under it and where the boost flames come out. */
interface Chassis {
  wheels: Wheel[];
  exhausts: V3[];
}

/** Everything a body builder draws with. All positions are in car space: origin on the ground, nose toward +z. */
interface Kit {
  style: VehicleStyle;
  body: Parts;
  glass: Parts;
  tail: Parts;
  driver: Parts;
  paint: Material;
  trim: Material;
  accent: Material;
  chrome: Material;
  glassMat: Material;
  light: Material;
  tailMat: Material;
  white: Material;
  /** Clear-coated paint taken from vertex colours (lofted, two-tone bodies). */
  vertexPaint: Material;
  skinMat: (hex: string) => Material;
  box: (w: number, h: number, d: number) => BufferGeometry;
  rb: (w: number, h: number, d: number, r: number) => BufferGeometry;
  cyl: (rt: number, rb: number, h: number, seg?: number) => BufferGeometry;
  ball: (r: number, w?: number, h?: number) => BufferGeometry;
  /** Any other geometry: registered so it is freed once merged. */
  geo: <T extends BufferGeometry>(g: T) => T;
  /** A seated driver, `seat` being the bottom of the torso. */
  seat: (at: V3, scale?: number, skin?: string) => void;
}

const HALF_PI = Math.PI / 2;

/** Big Bertha: a monster truck. Giant knobbly wheels, a body perched high on chrome shocks, a light bar and twin stacks. */
function monster(k: Kit): Chassis {
  const { body, glass, tail } = k;
  // Frame, axles and shocks.
  for (const sx of [-1, 1]) body.add(k.trim, k.box(0.2, 0.24, 3.8), [sx * 0.55, 1.15, 0]);
  for (const sz of [-1, 1]) {
    body.add(k.trim, k.cyl(0.12, 0.12, 2.3, 10), [0, 0.98, sz * 1.55], [0, 0, HALF_PI]);
    for (const sx of [-1, 1]) {
      body.add(k.chrome, k.cyl(0.07, 0.07, 1.1, 10), [sx * 0.95, 1.5, sz * 1.2]);
      body.add(k.accent, k.cyl(0.15, 0.15, 0.55, 12), [sx * 0.95, 1.55, sz * 1.2]);
    }
  }
  // Tub, cab and bonnet.
  body.add(k.paint, k.rb(2.35, 0.8, 4.4, 0.2), [0, 2.4, 0]);
  body.add(k.paint, k.rb(2.0, 0.95, 2.0, 0.22), [0, 3.25, -0.4]);
  body.add(k.trim, k.rb(0.8, 0.28, 1.0, 0.1), [0, 2.88, 1.25]);
  body.add(k.chrome, k.box(0.6, 0.12, 0.08), [0, 2.9, 1.77]);
  // Racing stripes down the flanks.
  for (const sx of [-1, 1]) body.add(k.accent, k.box(0.04, 0.16, 3.9), [sx * 1.18, 2.45, 0]);
  // Bumpers, headlights and the roof light bar.
  body.add(k.chrome, k.rb(2.3, 0.28, 0.3, 0.1), [0, 2.0, 2.25]);
  body.add(k.chrome, k.rb(2.3, 0.28, 0.3, 0.1), [0, 2.0, -2.25]);
  for (const sx of [-1, 1]) body.add(k.light, k.rb(0.42, 0.22, 0.08, 0.06), [sx * 0.78, 2.5, 2.2]);
  body.add(k.trim, k.box(1.7, 0.14, 0.22), [0, 3.8, 0.15]);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) body.add(k.light, k.ball(0.11, 12, 8), [x, 3.82, 0.3]);
  // Twin exhaust stacks behind the cab.
  for (const sx of [-1, 1]) {
    body.add(k.chrome, k.cyl(0.1, 0.1, 1.3, 12), [sx * 0.85, 3.3, -1.5]);
    body.add(k.trim, k.cyl(0.11, 0.11, 0.08, 12), [sx * 0.85, 3.96, -1.5]);
  }
  // Windows: windscreen, sides and back.
  glass.add(k.glassMat, k.box(1.75, 0.62, 0.06), [0, 3.3, 0.62], [-0.22, 0, 0]);
  for (const sx of [-1, 1]) glass.add(k.glassMat, k.box(0.06, 0.55, 1.45), [sx * 1.0, 3.32, -0.4]);
  glass.add(k.glassMat, k.box(1.6, 0.5, 0.06), [0, 3.35, -1.42]);
  for (const sx of [-1, 1]) tail.add(k.tailMat, k.box(0.36, 0.16, 0.06), [sx * 0.85, 2.5, -2.22]);
  k.seat([0, 2.75, -0.3]);
  return {
    wheels: [
      { x: 1.32, z: 1.55, r: 0.98, w: 0.78, steers: true, knobbly: true },
      { x: -1.32, z: 1.55, r: 0.98, w: 0.78, steers: true, knobbly: true },
      { x: 1.32, z: -1.55, r: 0.98, w: 0.78, steers: false, knobbly: true },
      { x: -1.32, z: -1.55, r: 0.98, w: 0.78, steers: false, knobbly: true },
    ],
    exhausts: [
      [-0.6, 2.0, -2.4],
      [0.6, 2.0, -2.4],
    ],
  };
}

/** Zippy: a tiny round bubble car with a glass dome, big headlight eyes, a smile and an antenna. */
function bubble(k: Kit): Chassis {
  const { body, glass, tail } = k;
  body.add(k.paint, k.ball(1, 28, 18), [0, 0.8, 0], [0, 0, 0], [0.82, 0.62, 1.1]);
  body.add(k.trim, k.ball(1, 28, 10), [0, 0.6, 0], [0, 0, 0], [0.85, 0.12, 1.13]);
  // Eyes: white headlights with dark pupils.
  for (const sx of [-1, 1]) {
    body.add(k.light, k.ball(0.21, 16, 12), [sx * 0.36, 0.98, 0.92]);
    body.add(k.trim, k.ball(0.1, 12, 8), [sx * 0.36, 1.0, 1.1]);
  }
  body.add(k.trim, k.geo(new TorusGeometry(0.26, 0.035, 6, 18, Math.PI)), [0, 0.74, 1.06], [0.35, 0, Math.PI]);
  // Antenna with a bobble.
  body.add(k.chrome, k.cyl(0.02, 0.02, 0.75, 6), [0.32, 1.75, -0.55]);
  body.add(k.accent, k.ball(0.11, 12, 8), [0.32, 2.14, -0.55]);
  glass.add(k.glassMat, k.geo(new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, HALF_PI)), [0, 1.18, -0.05], [0, 0, 0], [0.64, 0.58, 0.78]);
  for (const sx of [-1, 1]) tail.add(k.tailMat, k.ball(0.11, 12, 8), [sx * 0.42, 0.85, -1.06]);
  k.seat([0, 0.98, -0.1], 0.72);
  return {
    wheels: [
      { x: 0.68, z: 0.72, r: 0.36, w: 0.28, steers: true },
      { x: -0.68, z: 0.72, r: 0.36, w: 0.28, steers: true },
      { x: 0.68, z: -0.72, r: 0.36, w: 0.28, steers: false },
      { x: -0.68, z: -0.72, r: 0.36, w: 0.28, steers: false },
    ],
    exhausts: [[0.3, 0.42, -1.15]],
  };
}

/** The formula racer's body, tail to nose: a long, narrow, low needle. */
const FORMULA_KEYS: Station[] = [
  { z: -2.25, bottom: 0.3, top: 0.62, hw: 0.2 },
  { z: -1.95, bottom: 0.2, top: 0.86, hw: 0.5 },
  { z: -1.1, bottom: 0.18, top: 0.86, hw: 0.6 },
  { z: -0.3, bottom: 0.18, top: 0.78, hw: 0.55 },
  { z: 0.6, bottom: 0.2, top: 0.64, hw: 0.4 },
  { z: 1.6, bottom: 0.22, top: 0.52, hw: 0.28 },
  { z: 2.5, bottom: 0.24, top: 0.42, hw: 0.16 },
  { z: 2.9, bottom: 0.27, top: 0.34, hw: 0.05 },
];
const FORMULA = profileOf(FORMULA_KEYS, 6);

/** Rocket Rita: a long, low formula racer with open wheels, front and rear wings and an airbox. */
function formula(k: Kit): Chassis {
  const { body, tail, style } = k;
  const tub = k.geo(
    loft(FORMULA, {
      around: 24,
      squareness: 2.6,
      paint: (_x, _y, _z, v, out) => void out.set(v < -0.35 ? style.trim : style.body),
    }),
  );
  body.add(k.vertexPaint, tub, [0, 0, 0]);
  for (const sx of [-1, 1]) {
    body.add(k.paint, k.rb(0.5, 0.42, 1.7, 0.16), [sx * 0.66, 0.42, -0.75]);
    // Suspension arms out to the wheels.
    body.add(k.trim, k.box(0.85, 0.04, 0.07), [sx * 0.62, 0.5, 1.7]);
    body.add(k.trim, k.box(0.75, 0.04, 0.07), [sx * 0.62, 0.55, -1.5]);
  }
  // Airbox behind the driver's head.
  body.add(k.trim, k.rb(0.36, 0.42, 0.75, 0.12), [0, 1.02, -0.95]);
  body.add(k.accent, k.box(0.2, 0.16, 0.05), [0, 1.08, -0.56]);
  // Front wing with end plates.
  body.add(k.accent, k.box(2.35, 0.06, 0.48), [0, 0.2, 2.6]);
  for (const sx of [-1, 1]) body.add(k.trim, k.box(0.05, 0.26, 0.52), [sx * 1.18, 0.28, 2.6]);
  // Rear wing on pillars.
  body.add(k.accent, k.box(1.95, 0.09, 0.52), [0, 1.3, -2.1]);
  body.add(k.accent, k.box(1.95, 0.06, 0.3), [0, 1.08, -2.2]);
  for (const sx of [-1, 1]) {
    body.add(k.trim, k.box(0.06, 0.6, 0.62), [sx * 0.98, 1.12, -2.12]);
    body.add(k.trim, k.box(0.08, 0.55, 0.16), [sx * 0.26, 0.9, -2.02]);
  }
  tail.add(k.tailMat, k.box(0.28, 0.12, 0.05), [0, 0.42, -2.26]);
  k.seat([0, 0.42, -0.25], 0.9);
  return {
    wheels: [
      { x: 1.05, z: 1.7, r: 0.5, w: 0.42, steers: true },
      { x: -1.05, z: 1.7, r: 0.5, w: 0.42, steers: true },
      { x: 1.02, z: -1.5, r: 0.58, w: 0.6, steers: false },
      { x: -1.02, z: -1.5, r: 0.58, w: 0.6, steers: false },
    ],
    exhausts: [[0, 0.62, -2.3]],
  };
}

const KID_SKINS = ["#f2c29b", "#8d5a3b", "#c68b5e", "#ffdcb8", "#5b3a29", "#e0a87c"];

/** Bus-ter: a long, tall school bus with a row of windows, kids waving inside and a stop sign. */
function bus(k: Kit): Chassis {
  const { body, glass, tail, driver } = k;
  body.add(k.paint, k.rb(2.3, 2.0, 6.3, 0.24), [0, 1.78, 0]);
  body.add(k.white, k.rb(2.1, 0.08, 5.9, 0.03), [0, 2.8, 0]);
  // Black rub rails and bumpers.
  for (const y of [1.05, 1.45]) body.add(k.trim, k.box(2.33, 0.07, 6.1), [0, y, 0]);
  for (const sz of [-1, 1]) body.add(k.trim, k.rb(2.4, 0.32, 0.24, 0.08), [0, 0.88, sz * 3.15]);
  // Lights: headlights, roof warning lights.
  for (const sx of [-1, 1]) {
    body.add(k.light, k.rb(0.4, 0.26, 0.06, 0.06), [sx * 0.78, 1.15, 3.16]);
    body.add(k.accent, k.rb(0.22, 0.16, 0.06, 0.04), [sx * 0.8, 2.6, 3.15]);
  }
  // The stop sign on the driver's side.
  body.add(k.accent, k.cyl(0.3, 0.3, 0.04, 8), [-1.2, 1.95, 1.9], [0, 0, HALF_PI]);
  body.add(k.white, k.cyl(0.24, 0.24, 0.045, 8), [-1.2, 1.95, 1.9], [0, 0, HALF_PI]);
  body.add(k.accent, k.cyl(0.21, 0.21, 0.05, 8), [-1.2, 1.95, 1.9], [0, 0, HALF_PI]);
  // Windows all down both sides, a windscreen and a back window.
  const windows = [-2.35, -1.5, -0.65, 0.2, 1.05, 1.9];
  for (const sx of [-1, 1]) for (const z of windows) glass.add(k.glassMat, k.box(0.04, 0.62, 0.72), [sx * 1.16, 2.22, z]);
  glass.add(k.glassMat, k.box(2.0, 0.85, 0.05), [0, 2.15, 3.16]);
  glass.add(k.glassMat, k.box(1.6, 0.6, 0.05), [0, 2.3, -3.16]);
  // Kids at the windows.
  windows.slice(0, 5).forEach((z, n) => {
    for (const sx of [-1, 1]) {
      if ((n + (sx > 0 ? 1 : 0)) % 3 === 2) continue;
      const skin = KID_SKINS[(n * 2 + (sx > 0 ? 1 : 0)) % KID_SKINS.length];
      driver.add(k.skinMat(skin), k.ball(0.17, 12, 10), [sx * 0.82, 2.18, z]);
    }
  });
  for (const sx of [-1, 1]) tail.add(k.tailMat, k.rb(0.3, 0.3, 0.06, 0.06), [sx * 0.86, 1.2, -3.16]);
  k.seat([-0.55, 1.4, 2.45]);
  return {
    wheels: [
      { x: 1.02, z: 2.05, r: 0.62, w: 0.5, steers: true },
      { x: -1.02, z: 2.05, r: 0.62, w: 0.5, steers: true },
      { x: 1.02, z: -1.85, r: 0.62, w: 0.5, steers: false },
      { x: -1.02, z: -1.85, r: 0.62, w: 0.5, steers: false },
    ],
    exhausts: [[-0.8, 0.7, -3.25]],
  };
}

/** Where each body pivots when it pitches and rolls (about the middle of its mass). */
const PIVOT: Record<Exclude<CarBody, "fitzmagic">, number> = { monster: 2.4, bubble: 0.8, formula: 0.55, bus: 1.7 };

/** One wheel as a single vertex-coloured mesh: tyre, rim and hub cap (and tread blocks if knobbly). */
function wheelGeometry(w: Wheel, style: VehicleStyle): BufferGeometry {
  const list: BufferGeometry[] = [colored(new CylinderGeometry(w.r, w.r, w.w, 26).rotateZ(HALF_PI), "#16171d")];
  const rim = w.r * (w.knobbly ? 0.55 : 0.68);
  list.push(colored(new CylinderGeometry(rim, rim, w.w + 0.02, 20).rotateZ(HALF_PI), style.hub));
  list.push(colored(new CylinderGeometry(rim * 0.35, rim * 0.35, w.w + 0.05, 12).rotateZ(HALF_PI), style.accent));
  if (w.knobbly) {
    const block = new BoxGeometry(w.w * 1.04, 0.16, 0.26);
    for (let i = 0; i < 16; i++) list.push(colored(block.clone().translate(0, w.r, 0).rotateX((i / 16) * Math.PI * 2), "#1f2027"));
    block.dispose();
  }
  const merged = mergeGeometries(
    list.map((g) => (g.index ? g.toNonIndexed() : g)),
    false,
  );
  for (const g of list) g.dispose();
  return merged as BufferGeometry;
}

/**
 * A rival's car. Each body is its own shape and size (a monster truck towers over the
 * Fitzmagic, a bubble car comes up to its door handles), but they all share the same
 * contract, animator, wheels, brake lights and boost flames, so the renderer treats
 * them exactly like the player's car.
 */
export function buildRival(body: Exclude<CarBody, "fitzmagic">, style: VehicleStyle, kit: MeshKit): VehicleVisual {
  const pivotY = PIVOT[body];
  const root = new Group();
  root.rotation.order = "YXZ";
  const shell = new Group();
  shell.rotation.order = "YXZ";
  shell.position.y = pivotY;
  root.add(shell);

  const sources: BufferGeometry[] = [];
  const src = <T extends BufferGeometry>(g: T): T => {
    sources.push(g);
    return g;
  };
  const skins = new Map<string, Material>();
  const shirt = kit.mat(style.shirt, { flat: false, rough: 0.7 });
  const helmet = kit.mat(style.helmet, { flat: false, rough: 0.25, metal: 0.15 });
  const visor = kit.mat("#14171f", { flat: false, rough: 0.15, metal: 0.4 });
  const k: Kit = {
    style,
    body: new Parts(pivotY),
    glass: new Parts(pivotY),
    tail: new Parts(pivotY),
    driver: new Parts(pivotY),
    paint: kit.track(new MeshPhysicalMaterial({ color: style.body, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 })),
    trim: kit.mat(style.trim, { flat: false, rough: 0.35, metal: 0.3 }),
    accent: kit.mat(style.accent, { flat: false, rough: 0.3, metal: 0.35 }),
    chrome: kit.mat("#dfe3ea", { flat: false, rough: 0.2, metal: 0.9 }),
    glassMat: kit.track(new MeshPhysicalMaterial({ color: "#1c2842", roughness: 0.1, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false })),
    light: kit.mat("#fffbe6", { flat: false, rough: 0.2, emissive: "#fff2b0", emissiveIntensity: 1.3 }),
    tailMat: kit.track(new MeshStandardMaterial({ color: "#c81e1e", emissive: "#ff1a1a", emissiveIntensity: 0.9, roughness: 0.4 })),
    white: kit.mat("#ffffff", { flat: false, rough: 0.35, metal: 0.05 }),
    vertexPaint: kit.track(new MeshPhysicalMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 })),
    box: (w, h, d) => src(new BoxGeometry(w, h, d)),
    rb: (w, h, d, r) => src(new RoundedBoxGeometry(w, h, d, 3, r)),
    cyl: (rt, rbot, h, seg = 16) => src(new CylinderGeometry(rt, rbot, h, seg)),
    ball: (r, w = 16, h = 12) => src(new SphereGeometry(r, w, h)),
    geo: src,
    skinMat: (hex) => {
      let m = skins.get(hex);
      if (!m) {
        m = kit.mat(hex, { flat: false, rough: 0.7 });
        skins.set(hex, m);
      }
      return m;
    },
    seat: (at, scale = 1, skin = style.skin) => {
      const [x, y, z] = at;
      const s = scale;
      k.driver.add(shirt, k.rb(0.56 * s, 0.42 * s, 0.34 * s, 0.12 * s), [x, y + 0.21 * s, z]);
      k.driver.add(k.skinMat(skin), k.ball(0.19 * s, 14, 10), [x, y + 0.51 * s, z + 0.02 * s]);
      k.driver.add(helmet, src(new SphereGeometry(0.235 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6)), [x, y + 0.55 * s, z + 0.02 * s]);
      k.driver.add(visor, k.box(0.36 * s, 0.09 * s, 0.1 * s), [x, y + 0.54 * s, z + 0.24 * s]);
    },
  };
  const chassis = body === "monster" ? monster(k) : body === "bubble" ? bubble(k) : body === "formula" ? formula(k) : bus(k);

  const name = `rival-${style.id}-${body}`;
  for (const m of k.body.meshes(kit, `${name}-body`)) shell.add(m);
  for (const m of k.glass.meshes(kit, `${name}-glass`, false)) shell.add(m);
  for (const m of k.tail.meshes(kit, `${name}-tail`, false)) shell.add(m);
  const driver = new Group();
  for (const m of k.driver.meshes(kit, `${name}-driver`)) driver.add(m);
  shell.add(driver);

  // Boost flames out of every exhaust.
  const flames = new Group();
  const flameParts = new Parts(pivotY);
  const cone = src(new ConeGeometry(0.18, 1.3, 8).rotateX(-HALF_PI));
  const flameMat = kit.track(new MeshBasicMaterial({ color: "#ff9a1f", transparent: true, opacity: 0.92 }));
  const flameCore = kit.track(new MeshBasicMaterial({ color: "#aee6ff", transparent: true, opacity: 0.95 }));
  for (const [x, y, z] of chassis.exhausts) {
    flameParts.add(flameMat, cone, [x, y, z - 0.65]);
    flameParts.add(flameCore, cone, [x, y, z - 0.4], [0, 0, 0], [0.5, 0.5, 0.55]);
  }
  for (const m of flameParts.meshes(kit, `${name}-flame`, false)) flames.add(m);
  flames.visible = false;
  shell.add(flames);

  for (const g of sources) g.dispose();

  // Wheels: a steering pivot holding a spinning wheel.
  const wheelMat = kit.track(new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }));
  const pivots: Group[] = [];
  const spins: Group[] = [];
  const rest: number[] = [];
  for (const w of chassis.wheels) {
    const geo = kit.geo(`${name}-wheel-${w.r}-${w.w}`, () => wheelGeometry(w, style));
    const pivot = new Group();
    pivot.position.set(w.x, w.r, w.z);
    const spin = new Group();
    const mesh = new Mesh(geo, wheelMat);
    mesh.castShadow = true;
    spin.add(mesh);
    pivot.add(spin);
    root.add(pivot);
    pivots.push(pivot);
    spins.push(spin);
    rest.push(w.r);
  }

  const animator = new VehicleAnimator();
  const tail = k.tailMat as MeshStandardMaterial;
  return {
    root,
    land: (impact) => animator.land(impact),
    update(s, dt) {
      root.position.set(s.x, s.y, s.z);
      root.rotation.y = s.heading;
      animator.update(dt, { accel: s.accel, yawRate: s.yawRate, speed: s.speed, grounded: s.grounded, vy: s.vy, slope: s.slope, bumpiness: s.bumpiness });
      shell.position.y = pivotY + animator.bounce;
      shell.rotation.x = animator.pitch;
      shell.rotation.z = animator.roll;
      driver.rotation.z = -animator.roll * 0.5;
      for (let i = 0; i < pivots.length; i++) {
        // Wheels map front-left, front-right, rear-left, rear-right onto the animator's four corners.
        pivots[i].position.y = rest[i] + animator.wheels[i % 4];
        if (chassis.wheels[i].steers) pivots[i].rotation.y = -s.steer * 0.5;
        spins[i].rotation.x = s.wheelSpin;
      }
      flames.visible = s.boosting;
      if (s.boosting) flames.scale.set(1, 1, 0.8 + 0.4 * Math.sin(s.time * 55) + 0.2 * Math.sin(s.time * 31));
      tail.emissiveIntensity = s.braking ? 3 : 0.9;
      root.visible = s.grace <= 0 || Math.floor(s.time * 14) % 2 === 0;
    },
  };
}
