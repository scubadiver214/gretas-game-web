import { BufferGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, SphereGeometry } from "three";
import { addBoulders, addHay, addPosts, cappedRockGeometry, instanced, merge, obstaclePlacement, palette, part, pickColor, pineGeometry, rockGeometry, type PropContext } from "./propKit";

const MOSSY_STONE = palette(["#9aa09a", "#8a948a", "#a4a79f", "#7d877f"]);
const BOULDER_GREY = palette(["#9aa3ab", "#8a949d", "#a8aeb2", "#7f8a92"]);
const PINE_GREENS = ["#2b8a3e", "#33994a", "#3fa856"] as const;

/** A leafy tree: a trunk and a lumpy crown of three blobs. Variant 1 is green, 2 is covered in pink blossom. */
function leafyTreeGeometry(variant: number): BufferGeometry {
  const leaves = variant === 2 ? ["#ffa6cf", "#ff8fc0", "#ffd1e6"] : ["#4cb84a", "#5fc84f", "#43a844"];
  const blob = new IcosahedronGeometry(1, 1);
  return merge([
    part(new CylinderGeometry(0.3, 0.46, 2.6, 7), "#7a5233", [0, 1.3, 0]),
    part(blob, leaves[0], [0, 3.7, 0], [0, 0.4, 0], [1.9, 1.6, 1.9]),
    part(blob, leaves[1], [1.05, 3.1, 0.45], [0, 1.1, 0], [1.35, 1.15, 1.35]),
    part(blob, leaves[2], [-0.95, 3.25, -0.5], [0, 2.0, 0], [1.4, 1.2, 1.4]),
  ]);
}

/** Wildflowers in a tuft of grass: red, yellow, white, purple and orange blooms. */
function wildflowersGeometry(): BufferGeometry {
  const blooms = ["#ff4d6d", "#ffd23f", "#ffffff", "#a06bff", "#ff8a1f", "#ffd23f", "#ff4d6d"];
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const r = 0.18 + (i % 3) * 0.1;
    const lean = [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18] as [number, number, number];
    const h = 0.55 + (i % 4) * 0.12;
    parts.push(part(new CylinderGeometry(0.025, 0.03, h, 4), "#3f9a37", [Math.cos(a) * r, h / 2, Math.sin(a) * r], lean));
    parts.push(part(new SphereGeometry(0.15, 7, 5), blooms[i], [Math.cos(a) * r, h + 0.04, Math.sin(a) * r]));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    parts.push(part(new ConeGeometry(0.08, 0.8, 4), i % 2 ? "#4cb84a" : "#3f9a37", [Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]));
  }
  return merge(parts);
}

/** A stack of three logs, end caps showing. */
function logsGeometry(): BufferGeometry {
  const log = new CylinderGeometry(0.5, 0.5, 2.7, 10);
  const cap = new CylinderGeometry(0.44, 0.44, 0.07, 10);
  const parts: BufferGeometry[] = [];
  for (const [y, z] of [
    [0.5, -0.56],
    [0.5, 0.56],
    [1.32, 0],
  ] as const) {
    parts.push(part(log, "#8a5a33", [0, y, z], [0, 0, Math.PI / 2]));
    for (const x of [-1.36, 1.36]) parts.push(part(cap, "#e0bb86", [x, y, z], [0, 0, Math.PI / 2]));
  }
  return merge(parts);
}

/** The mountain world: mossy stone walls, pines and blossom trees, wildflowers, log piles and hay bales. */
export function buildAlpineProps(ctx: PropContext): void {
  const { kit, content, scratch } = ctx;
  const { scatter, obstacles } = content;

  // Stone boundary, and loose rocks with a cap of moss.
  const stoneMat = ctx.std();
  const rockMat = ctx.std({ vertexColors: true });
  for (let variant = 0; variant < 3; variant++) {
    const stone = kit.geo(`rock-${variant}`, () => rockGeometry(variant + 1));
    ctx.add(instanced(stone, stoneMat, scatter.wallRocks.filter((p) => p.variant === variant), { shadow: true, colorOf: (p) => pickColor(MOSSY_STONE, p.x, p.z, scratch) }));
    const rock = kit.geo(`moss-rock-${variant}`, () => cappedRockGeometry(variant + 21, "#8d979f", "#5fb544"));
    ctx.add(instanced(rock, rockMat, scatter.rocks.filter((p) => p.variant === variant), { shadow: true }));
  }
  addBoulders(ctx, BOULDER_GREY);

  // Trees: a pine, a leafy tree and a blossom tree, scenery plus the solid ones on the shoulders.
  const treeMat = ctx.std({ vertexColors: true });
  const solid = obstacles.filter((o) => o.kind === "plant").map((o) => obstaclePlacement(o, 1));
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`alpine-tree-${variant}`, () => (variant === 0 ? pineGeometry(0, PINE_GREENS, null) : leafyTreeGeometry(variant)));
    const list = [...scatter.flora.filter((p) => p.variant === variant), ...solid.filter((p) => p.variant === variant)];
    ctx.add(instanced(geo, treeMat, list, { shadow: true }));
  }

  ctx.add(instanced(kit.geo("logs", logsGeometry), ctx.std({ vertexColors: true }), obstacles.filter((o) => o.kind === "logs").map((o) => obstaclePlacement(o, 1)), { shadow: true }));
  addHay(ctx);
  addPosts(ctx, "alpine");

  ctx.add(instanced(kit.geo("wildflowers", wildflowersGeometry), ctx.std({ vertexColors: true }), scatter.tufts, { receive: false }));
}
