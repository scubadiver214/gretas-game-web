import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, SphereGeometry } from "three";
import { hashString, mulberry32 } from "@/lib/rng";
import { addBoulders, addPosts, cappedRockGeometry, instanced, merge, obstaclePlacement, palette, part, pickColor, posNoise, rockGeometry, type PropContext } from "./propKit";
import { crateGeometry } from "./propsBeach";

const MOSSY_STONE = palette(["#7f8a76", "#6f7c68", "#8a9482", "#62705c"]);
const BOULDER_MOSS = palette(["#7a8070", "#69705f", "#868b7a", "#5f6757"]);
const LEAF = ["#2a8a3a", "#34a046", "#237a34", "#3fae50"];

/**
 * Jungle trees. Variant 0: a tall rainforest giant with a high, dark crown and buttress roots.
 * 1: a broad umbrella tree with a flat crown. 2: a leaning fan palm with big drooping leaves.
 */
function jungleTreeGeometry(variant: number): BufferGeometry {
  const blob = new IcosahedronGeometry(1, 1);
  if (variant === 0) {
    const parts: BufferGeometry[] = [part(new CylinderGeometry(0.35, 0.6, 7.5, 8), "#6b4a2c", [0, 3.75, 0])];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      parts.push(part(new BoxGeometry(0.16, 1.6, 1.1), "#5e4026", [Math.cos(a) * 0.5, 0.8, Math.sin(a) * 0.5], [0, -a, 0.18]));
    }
    parts.push(part(blob, LEAF[2], [0, 8.4, 0], [0, 0.3, 0], [2.6, 1.9, 2.6]));
    parts.push(part(blob, LEAF[0], [1.4, 7.7, 0.6], [0, 1.1, 0], [1.9, 1.4, 1.9]));
    parts.push(part(blob, LEAF[1], [-1.3, 7.9, -0.7], [0, 2.1, 0], [2, 1.5, 2]));
    parts.push(part(blob, LEAF[3], [0.2, 9.6, -0.3], [0, 0.5, 0], [1.5, 1.1, 1.5]));
    // Hanging vines.
    parts.push(part(new CylinderGeometry(0.04, 0.04, 3.4, 4), "#3c7a2c", [1.5, 6.1, 0.9]), part(new CylinderGeometry(0.04, 0.04, 2.6, 4), "#3c7a2c", [-1.6, 6.5, -0.5]));
    return merge(parts);
  }
  if (variant === 1) {
    return merge([
      part(new CylinderGeometry(0.28, 0.5, 4, 7), "#7a5233", [0, 2, 0], [0, 0, 0.08]),
      part(new CylinderGeometry(0.2, 0.3, 2, 6), "#7a5233", [0.5, 4.6, 0], [0, 0, -0.6]),
      part(blob, LEAF[1], [0.7, 5.6, 0], [0, 0.3, 0], [3.3, 0.9, 3.3]),
      part(blob, LEAF[3], [-0.7, 5.3, 0.9], [0, 1.0, 0], [2.3, 0.75, 2.3]),
      part(blob, LEAF[0], [1.9, 5.2, -1.0], [0, 2.0, 0], [2, 0.7, 2]),
    ]);
  }
  const parts: BufferGeometry[] = [part(new CylinderGeometry(0.2, 0.32, 4.2, 7), "#8a6a40", [0.4, 2.1, 0], [0, 0, -0.18])];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push(part(new ConeGeometry(0.42, 3.2, 4), LEAF[i % 4], [0.8 + Math.cos(a) * 1.3, 4.1, Math.sin(a) * 1.3], [Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15], [1, 1, 0.3]));
  }
  return merge(parts);
}

/** A fern: arching fronds, with a bright red tropical flower in some. */
function fernGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const greens = ["#2f9a3f", "#43b052", "#27853a"];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    parts.push(part(new ConeGeometry(0.2, 1.5, 4), greens[i % 3], [Math.cos(a) * 0.5, 0.55, Math.sin(a) * 0.5], [Math.sin(a) * 0.95, 0, -Math.cos(a) * 0.95], [1, 1, 0.3]));
  }
  parts.push(part(new CylinderGeometry(0.03, 0.03, 0.9, 4), "#3a8a30", [0, 0.45, 0]));
  parts.push(part(new ConeGeometry(0.17, 0.4, 6), "#ff4a3a", [0, 1.05, 0]), part(new SphereGeometry(0.1, 6, 5), "#ffd23f", [0, 1.3, 0]));
  return merge(parts);
}

/** A cut tree stump with growth rings, buttress roots and a few mushrooms. */
function stumpGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [
    part(new CylinderGeometry(1.25, 1.5, 1.6, 10), "#7a5233", [0, 0.8, 0]),
    part(new CylinderGeometry(1.2, 1.2, 0.06, 10), "#d9b27a", [0, 1.62, 0]),
    part(new CylinderGeometry(0.85, 0.85, 0.07, 10), "#c79c62", [0, 1.63, 0]),
    part(new CylinderGeometry(0.45, 0.45, 0.08, 10), "#d9b27a", [0, 1.64, 0]),
    part(new CylinderGeometry(0.1, 0.1, 0.09, 8), "#9a7040", [0, 1.65, 0]),
  ];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(part(new BoxGeometry(0.3, 0.7, 0.9), "#6b4527", [Math.cos(a) * 1.45, 0.3, Math.sin(a) * 1.45], [0, -a, 0.3]));
  }
  parts.push(part(new SphereGeometry(0.25, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), "#ff5a3a", [1.0, 1.0, 0.4]), part(new CylinderGeometry(0.06, 0.06, 0.25, 5), "#f3ead2", [1.0, 0.9, 0.4]));
  return merge(parts);
}

/** A carved stone totem: three stacked blocks with a face, glowing eyes and a mossy top. */
function idolGeometry(): BufferGeometry {
  const stone = "#8c8c7c";
  const dark = "#6e6e60";
  return merge([
    part(new BoxGeometry(2.3, 0.9, 2.3), dark, [0, 0.45, 0]),
    part(new BoxGeometry(1.8, 1.4, 1.8), stone, [0, 1.6, 0]),
    part(new BoxGeometry(2.0, 1.2, 2.0), "#989886", [0, 2.9, 0]),
    part(new BoxGeometry(2.3, 0.3, 2.3), "#4f9a42", [0, 3.65, 0]),
    // The face, on the +z side of the head block.
    part(new BoxGeometry(0.4, 0.28, 0.12), "#ffe27a", [-0.5, 3.1, 1.03]),
    part(new BoxGeometry(0.4, 0.28, 0.12), "#ffe27a", [0.5, 3.1, 1.03]),
    part(new BoxGeometry(0.34, 0.5, 0.14), "#5e5e50", [0, 2.8, 1.03]),
    part(new BoxGeometry(1.0, 0.2, 0.12), "#2f2f26", [0, 2.35, 1.03]),
    // Arms carved into the middle block.
    part(new BoxGeometry(0.3, 0.9, 0.12), dark, [-0.5, 1.6, 0.93]),
    part(new BoxGeometry(0.3, 0.9, 0.12), dark, [0.5, 1.6, 0.93]),
  ]);
}

/** A rock tower rising out of the forest: grey-green stone streaked with moss, trees on top; variant 1 has a waterfall. */
function towerGeometry(variant: number, seed: number): BufferGeometry {
  const g = new CylinderGeometry(0.6, 1, 1, 10, 5, false);
  const pos = g.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const side = Math.hypot(x, z) > 0.01;
    const k = side ? 0.8 + posNoise(Math.round(x * 50) / 50, Math.round(y * 4) / 4, Math.round(z * 50) / 50, seed) * 0.45 : 1;
    pos.setXYZ(i, x * k, y, z * k);
    const mossy = posNoise(Math.round(x * 20) / 20, Math.round(y * 6) / 6, Math.round(z * 20) / 20, seed + 3) > 0.62;
    const top = y > 0.49 && !side;
    const fall = variant === 1 && z > 0.35 && Math.abs(x) < 0.16 && y < 0.5;
    let r = 0.52;
    let gr = 0.55;
    let b = 0.5;
    if (mossy) [r, gr, b] = [0.3, 0.52, 0.28];
    if (top) [r, gr, b] = [0.22, 0.55, 0.25];
    if (fall) [r, gr, b] = [0.82, 0.94, 1];
    colors[i * 3] = r;
    colors[i * 3 + 1] = gr;
    colors[i * 3 + 2] = b;
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** The jungle: mossy walls, giant trees and ferns, tree stumps, stone idols, crates and rock towers. */
export function buildJungleProps(ctx: PropContext): void {
  const { kit, content, scratch } = ctx;
  const { scatter, obstacles } = content;

  const stoneMat = ctx.std();
  const rockMat = ctx.std({ vertexColors: true });
  for (let variant = 0; variant < 3; variant++) {
    const stone = kit.geo(`rock-${variant}`, () => rockGeometry(variant + 1));
    ctx.add(instanced(stone, stoneMat, scatter.wallRocks.filter((p) => p.variant === variant), { shadow: true, colorOf: (p) => pickColor(MOSSY_STONE, p.x, p.z, scratch) }));
    const rock = kit.geo(`moss-rock-${variant}`, () => cappedRockGeometry(variant + 31, "#7d8478", "#3f8a3a"));
    ctx.add(instanced(rock, rockMat, scatter.rocks.filter((p) => p.variant === variant), { shadow: true }));
  }
  addBoulders(ctx, BOULDER_MOSS);

  const treeMat = ctx.std({ vertexColors: true, doubleSided: true });
  const solid = obstacles.filter((o) => o.kind === "plant").map((o) => obstaclePlacement(o, 1));
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`jungle-tree-${variant}`, () => jungleTreeGeometry(variant));
    ctx.add(instanced(geo, treeMat, [...scatter.flora.filter((p) => p.variant === variant), ...solid.filter((p) => p.variant === variant)], { shadow: true }));
  }

  const solidMat = ctx.std({ vertexColors: true });
  const place = (kind: string, key: string, build: () => BufferGeometry) => {
    const list = obstacles.filter((o) => o.kind === kind).map((o) => obstaclePlacement(o, 1));
    ctx.add(instanced(kit.geo(key, build), solidMat, list, { shadow: true }));
  };
  place("stump", "stump", stumpGeometry);
  place("idol", "idol", idolGeometry);
  place("crate", "crate", crateGeometry);
  addPosts(ctx, "jungle");

  ctx.add(instanced(kit.geo("fern", fernGeometry), treeMat, scatter.tufts, { receive: false }));

  for (let variant = 0; variant < 2; variant++) {
    const geo = kit.geo(`tower-${variant}`, () => towerGeometry(variant, variant + 5));
    ctx.add(
      instanced(geo, solidMat, scatter.landmarks.filter((p) => p.variant === variant), {
        stretch: [1.1, 1.7, 1.1],
        colorOf: (p) => scratch.setScalar(0.9 + mulberry32(hashString(`t${p.x.toFixed(0)}${p.z.toFixed(0)}`))() * 0.18),
      }),
    );
  }
}
