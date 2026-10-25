import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry } from "three";
import { hashString, mulberry32 } from "@/lib/rng";
import { addPosts, instanced, merge, obstaclePlacement, palette, part, pickColor, posNoise, rockGeometry, type PropContext } from "./propKit";

const SANDSTONE = palette(["#dccdaa", "#cdbb92", "#c2ad82", "#e6d8b8"]);
const BOULDER_SAND = palette(["#b49a76", "#a58a68", "#c2a982", "#98805f"]);
const FROND_GREENS = ["#2f9a46", "#3cae4f", "#278a40"];

/** A palm: a curved trunk with ring marks, a crown of drooping fronds and coconuts. Variants differ in height and lean. */
export function palmGeometry(variant: number): BufferGeometry {
  const lean = [0.2, -0.28, 0.1][variant % 3];
  const height = [4.6, 5.6, 3.8][variant % 3];
  const parts: BufferGeometry[] = [];
  const segs = 6;
  let top = { x: 0, y: 0 };
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const bend = (t: number) => lean * height * t * t;
    const x0 = bend(t0);
    const x1 = bend(t1);
    const y0 = t0 * height;
    const y1 = t1 * height;
    const len = Math.hypot(x1 - x0, y1 - y0);
    const tilt = Math.atan2(x1 - x0, y1 - y0);
    parts.push(part(new CylinderGeometry(0.2 - 0.12 * t1, 0.2 - 0.12 * t0 + 0.03, len + 0.02, 7), i % 2 ? "#9a7248" : "#8a6238", [(x0 + x1) / 2, (y0 + y1) / 2, 0], [0, 0, -tilt]));
    top = { x: x1, y: y1 };
  }
  // Fronds: long thin cones fanned out and drooping, with a flatter leaf blade each.
  const count = 8;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + variant;
    const color = FROND_GREENS[i % 3];
    const droop = 1.0 + (i % 2) * 0.25;
    parts.push(part(new ConeGeometry(0.28, 2.7, 4), color, [top.x + Math.cos(a) * 1.15, top.y + 0.15, Math.sin(a) * 1.15], [Math.sin(a) * droop, 0, -Math.cos(a) * droop], [1, 1, 0.35]));
  }
  parts.push(part(new SphereGeometry(0.3, 7, 6), "#6f8f30", [top.x, top.y + 0.1, 0]));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    parts.push(part(new SphereGeometry(0.2, 7, 6), "#7a4b22", [top.x + Math.cos(a) * 0.3, top.y - 0.25, Math.sin(a) * 0.3]));
  }
  return merge(parts);
}

/** A sea stack: a tall tan rock tower banded like the cliffs, with a cap of green. */
function seaStackGeometry(seed: number): BufferGeometry {
  const g = new CylinderGeometry(0.62, 1, 1, 10, 5, false);
  const pos = g.getAttribute("position");
  const bands = ["#b7a58a", "#c9b898", "#a89578", "#d3c3a4"].map((c) => ({ r: parseInt(c.slice(1, 3), 16) / 255, g: parseInt(c.slice(3, 5), 16) / 255, b: parseInt(c.slice(5, 7), 16) / 255 }));
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const side = Math.hypot(x, z) > 0.01;
    const k = side ? 0.82 + posNoise(Math.round(x * 50) / 50, Math.round(y * 4) / 4, Math.round(z * 50) / 50, seed) * 0.4 : 1;
    pos.setXYZ(i, x * k, y, z * k);
    const band = bands[Math.min(bands.length - 1, Math.max(0, Math.floor((y + 0.5) * bands.length)))];
    const grass = y > 0.49 && !side;
    colors[i * 3] = grass ? 0.36 : band.r;
    colors[i * 3 + 1] = grass ? 0.65 : band.g;
    colors[i * 3 + 2] = grass ? 0.28 : band.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Sea oats and beach grass: a pale green tuft. */
function beachGrassGeometry(): BufferGeometry {
  const blade = new ConeGeometry(0.08, 1.1, 4);
  const parts: BufferGeometry[] = [];
  const tones = ["#b9cc72", "#a3bd5c", "#cbd98a"];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push(part(blade, tones[i % 3], [Math.cos(a) * 0.2, 0.55, Math.sin(a) * 0.2], [Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42], [1, 0.8 + (i % 3) * 0.3, 1]));
  }
  return merge(parts);
}

/** A sandcastle: a stepped keep with four turrets, little flags and a door. */
function sandcastleGeometry(): BufferGeometry {
  const sand = "#e9cd92";
  const dark = "#cfae70";
  const parts: BufferGeometry[] = [
    part(new CylinderGeometry(1.6, 1.8, 0.9, 12), sand, [0, 0.45, 0]),
    part(new CylinderGeometry(1.05, 1.2, 0.9, 12), "#efd8a2", [0, 1.35, 0]),
    part(new ConeGeometry(0.9, 0.9, 12), "#d9b878", [0, 2.25, 0]),
    part(new BoxGeometry(0.5, 0.7, 0.2), "#7a5a30", [0, 0.4, 1.78]),
  ];
  for (const [x, z] of [
    [-1.45, -1.0],
    [1.45, -1.0],
    [-1.45, 1.0],
    [1.45, 1.0],
  ] as const) {
    parts.push(part(new CylinderGeometry(0.42, 0.5, 1.4, 8), dark, [x * 0.82, 1.1, z * 0.82]));
    parts.push(part(new ConeGeometry(0.5, 0.55, 8), "#e0c07f", [x * 0.82, 2.05, z * 0.82]));
  }
  parts.push(part(new CylinderGeometry(0.03, 0.03, 1, 5), "#ffffff", [0, 2.95, 0]));
  parts.push(part(new BoxGeometry(0.55, 0.32, 0.03), "#ff4f5a", [0.3, 3.2, 0]));
  return merge(parts);
}

/** A stack of wooden shipping crates with rope handles. */
export function crateGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const crate = (x: number, y: number, z: number, s: number, tone: string, rot: number) => {
    parts.push(part(new BoxGeometry(s, s, s), tone, [x, y + s / 2, z], [0, rot, 0]));
    parts.push(part(new BoxGeometry(s + 0.06, s * 0.12, s + 0.06), "#5e3c1c", [x, y + s * 0.1, z], [0, rot, 0]));
    parts.push(part(new BoxGeometry(s + 0.06, s * 0.12, s + 0.06), "#5e3c1c", [x, y + s * 0.9, z], [0, rot, 0]));
  };
  crate(-0.55, 0, 0.1, 1.5, "#b98048", 0.1);
  crate(0.7, 0, -0.2, 1.35, "#a9703c", -0.15);
  crate(0.05, 1.5, 0, 1.15, "#c48f56", 0.3);
  return merge(parts);
}

/** Surfboards stuck upright in the sand, leaning on each other, in bright colours. */
function surfboardsGeometry(): BufferGeometry {
  const colors = ["#ff4d6d", "#ffd23f", "#2ec4d6", "#7bd957", "#ffffff"];
  const parts: BufferGeometry[] = [];
  const board = new SphereGeometry(1, 10, 8);
  for (let i = 0; i < 5; i++) {
    const x = -0.9 + i * 0.45;
    const lean = (i - 2) * 0.12;
    parts.push(part(board, colors[i], [x, 1.2, 0], [0, 0, -lean], [0.26, 1.2, 0.06]));
    parts.push(part(new BoxGeometry(0.05, 2.2, 0.025), "#ffffff", [x, 1.2, 0.07], [0, 0, -lean]));
  }
  return merge(parts);
}

/** A big striped beach ball. */
function beachBallGeometry(): BufferGeometry {
  const colors = ["#ff4d4d", "#ffffff", "#2e86ff", "#ffffff", "#ffd23f", "#ffffff"];
  const parts: BufferGeometry[] = [];
  const wedge = (Math.PI * 2) / colors.length;
  for (let i = 0; i < colors.length; i++) {
    parts.push(part(new SphereGeometry(1.5, 8, 10, i * wedge, wedge), colors[i], [0, 1.55, 0]));
  }
  parts.push(part(new CylinderGeometry(0.2, 0.2, 0.12, 8), "#ffd23f", [0, 3.05, 0]));
  parts.push(part(new CylinderGeometry(0.2, 0.2, 0.12, 8), "#2e86ff", [0, 0.05, 0]));
  return merge(parts);
}

/** The coast: sandstone walls, palms, sea stacks, sandcastles, beach balls, surfboards and crates. */
export function buildBeachProps(ctx: PropContext): void {
  const { kit, content, scratch } = ctx;
  const { scatter, obstacles } = content;

  const rockMat = ctx.std();
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`rock-${variant}`, () => rockGeometry(variant + 3));
    ctx.add(instanced(geo, rockMat, scatter.wallRocks.filter((p) => p.variant === variant), { shadow: true, colorOf: (p) => pickColor(SANDSTONE, p.x, p.z, scratch) }));
    ctx.add(instanced(geo, rockMat, scatter.rocks.filter((p) => p.variant === variant), { shadow: true, colorOf: (p) => pickColor(BOULDER_SAND, p.x, p.z, scratch) }));
  }
  const boulders = obstacles.filter((o) => o.kind === "boulder");
  if (boulders.length) ctx.add(instanced(kit.geo("rock-0", () => rockGeometry(3)), rockMat, boulders.map((o) => obstaclePlacement(o, o.r * 1.12)), { shadow: true, colorOf: (p) => pickColor(BOULDER_SAND, p.x, p.z, scratch) }));

  const palmMat = ctx.std({ vertexColors: true, doubleSided: true });
  const solid = obstacles.filter((o) => o.kind === "plant").map((o) => obstaclePlacement(o, 1));
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`palm-${variant}`, () => palmGeometry(variant));
    ctx.add(instanced(geo, palmMat, [...scatter.flora.filter((p) => p.variant === variant), ...solid.filter((p) => p.variant === variant)], { shadow: true }));
  }

  const solidMat = ctx.std({ vertexColors: true });
  const place = (kind: string, key: string, build: () => BufferGeometry) => {
    const list = obstacles.filter((o) => o.kind === kind).map((o) => obstaclePlacement(o, 1));
    ctx.add(instanced(kit.geo(key, build), solidMat, list, { shadow: true }));
  };
  place("sandcastle", "sandcastle", sandcastleGeometry);
  place("crate", "crate", crateGeometry);
  place("surfboards", "surfboards", surfboardsGeometry);
  place("beachball", "beachball", beachBallGeometry);
  addPosts(ctx, "beach");

  ctx.add(instanced(kit.geo("beach-grass", beachGrassGeometry), solidMat, scatter.tufts, { receive: false }));

  // Sea stacks standing in the water and on the sand bars.
  const stackMat = ctx.std({ vertexColors: true });
  for (let variant = 0; variant < 2; variant++) {
    const geo = kit.geo(`sea-stack-${variant}`, () => seaStackGeometry(variant + 11));
    ctx.add(
      instanced(geo, stackMat, scatter.landmarks.filter((p) => p.variant === variant), {
        stretch: variant === 0 ? [0.9, 1.5, 0.9] : [1.25, 1.1, 1.25],
        colorOf: (p) => scratch.setScalar(0.92 + mulberry32(hashString(`s${p.x.toFixed(0)}${p.z.toFixed(0)}`))() * 0.14),
      }),
    );
  }
}
