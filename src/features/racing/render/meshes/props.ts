import { BufferGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, MeshStandardMaterial, PlaneGeometry, DoubleSide, SphereGeometry } from "three";
import { hashString, mulberry32 } from "@/lib/rng";
import type { MeshKit } from "@/components/three/kit";
import type { TrackContent } from "../../world/content";
import type { WorldId } from "../../world/track";
import type { RacingTextures } from "../textures";
import { buildAlpineProps } from "./propsAlpine";
import { buildBeachProps } from "./propsBeach";
import { buildJungleProps } from "./propsJungle";
import { buildWinterProps } from "./propsWinter";
import { addBoulders, addHay, addPosts, addTires, instanced, makeContext, merge, obstaclePlacement, palette, part, pickColor, posNoise, rockGeometry, signPostsGeometry, type PropContext } from "./propKit";

function mesaGeometry(seed: number): BufferGeometry {
  const g = new CylinderGeometry(0.74, 1, 1, 14, 5, false);
  const pos = g.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const strata = ["#c9754a", "#d98e5a", "#b8613d", "#e0a066", "#c46c44"].map((c) => new Color(c));
  const top = new Color("#e3b27a");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const side = Math.hypot(x, z) > 0.01;
    const k = side ? 0.86 + posNoise(Math.round(x * 50) / 50, Math.round(y * 5) / 5, Math.round(z * 50) / 50, seed) * 0.3 : 1;
    pos.setXYZ(i, x * k, y, z * k);
    const band = Math.min(strata.length - 1, Math.max(0, Math.floor((y + 0.5) * strata.length)));
    const c = y > 0.49 ? top : strata[band];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function cactusGeometry(variant: number): BufferGeometry {
  const trunk = new CapsuleGeometry(0.5, 3, 4, 10);
  const armH = new CapsuleGeometry(0.3, 0.9, 3, 8);
  const armV = new CapsuleGeometry(0.3, variant === 1 ? 0.8 : 1.4, 3, 8);
  const parts = [part(trunk, "#3f9142", [0, 2, 0])];
  const arms: number[] = variant === 0 ? [-1, 1] : variant === 1 ? [1] : [-1];
  for (const side of arms) {
    parts.push(part(armH, "#4aa14a", [side * 0.85, 2.2, 0], [0, 0, Math.PI / 2]));
    parts.push(part(armV, "#4aa14a", [side * 1.3, 2.95, 0]));
  }
  if (variant !== 1) parts.push(part(new SphereGeometry(0.24, 8, 6), "#ff5fa8", [0, 4.05, 0]));
  return merge(parts);
}

function dryGrassGeometry(): BufferGeometry {
  const blade = new ConeGeometry(0.1, 1, 4);
  const parts: BufferGeometry[] = [];
  const tones = ["#c9a45a", "#b58c45", "#d7b56a"];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(part(blade, tones[i % 3], [Math.cos(a) * 0.25, 0.5, Math.sin(a) * 0.25], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], [1, 0.8 + (i % 3) * 0.3, 1]));
  }
  return merge(parts);
}

const ROCK_COLORS = palette(["#c88a58", "#b97a4c", "#d49b66", "#a8714a", "#c27f52"]);
const BOULDER_COLORS = palette(["#a9805f", "#98705a", "#b58b66", "#8f6a55"]);

/**
 * The scenery a world is dressed in. Common to every world: a chain of boulders
 * (or snow banks) along both walls, fence posts with pennants, and turn signs.
 * The rest (plants, ground cover, big far-off shapes and the roadside obstacles)
 * comes from the world's own builder.
 */
export function buildProps(content: TrackContent, kit: MeshKit, textures: RacingTextures, world: WorldId): Group {
  const ctx = makeContext(content, kit, textures);
  switch (world) {
    case "desert":
      buildDesertProps(ctx);
      break;
    case "winter":
      buildWinterProps(ctx);
      break;
    case "alpine":
      buildAlpineProps(ctx);
      break;
    case "beach":
      buildBeachProps(ctx);
      break;
    case "jungle":
      buildJungleProps(ctx);
      break;
  }
  addSigns(ctx);
  return ctx.group;
}

function buildDesertProps(ctx: PropContext): void {
  const { kit, content, scratch } = ctx;
  const { scatter, obstacles } = content;

  // Rocks: the boundary chain and loose boulders share three lumpy shapes.
  const rockMat = ctx.std();
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`rock-${variant}`, () => rockGeometry(variant + 1));
    const wall = scatter.wallRocks.filter((p) => p.variant === variant);
    const loose = scatter.rocks.filter((p) => p.variant === variant);
    ctx.add(instanced(geo, rockMat, [...wall, ...loose], { shadow: true, colorOf: (p) => pickColor(ROCK_COLORS, p.x, p.z, scratch) }));
  }
  addBoulders(ctx, BOULDER_COLORS);

  // Cacti: scenery plus the solid ones on the shoulders.
  const cactusMat = ctx.std({ vertexColors: true });
  const solid = obstacles.filter((o) => o.kind === "plant").map((o) => obstaclePlacement(o, 1));
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`cactus-${variant}`, () => cactusGeometry(variant));
    const list = [...scatter.flora.filter((p) => p.variant === variant), ...solid.filter((p) => p.variant === variant)];
    ctx.add(instanced(geo, cactusMat, list, { shadow: true }));
  }

  addHay(ctx);
  addTires(ctx);
  addPosts(ctx, "desert");
  ctx.add(instanced(kit.geo("tuft", dryGrassGeometry), ctx.std({ vertexColors: true }), scatter.tufts, { receive: false }));

  // Mesas on the horizon.
  const mesaMat = ctx.std({ vertexColors: true });
  for (let variant = 0; variant < 2; variant++) {
    const geo = kit.geo(`mesa-${variant}`, () => mesaGeometry(variant + 7));
    ctx.add(instanced(geo, mesaMat, scatter.landmarks.filter((p) => p.variant === variant), { stretch: [1.5, 0.85, 1.5], colorOf: (p) => scratch.setScalar(0.9 + mulberry32(hashString(`m${p.x.toFixed(0)}${p.z.toFixed(0)}`))() * 0.2) }));
  }
}

/** Turn signs: a red arrow board on two posts, pointing which way the bend goes. */
function addSigns(ctx: PropContext): void {
  const { kit, textures, content } = ctx;
  const postsGeo = kit.geo("sign-posts", signPostsGeometry);
  const boardGeo = kit.geo("sign-board", () => new PlaneGeometry(3.4, 2.55));
  for (const variant of [0, 1]) {
    const list = content.scatter.signs.filter((p) => p.variant === variant);
    if (!list.length) continue;
    const board = instanced(boardGeo, kit.track(new MeshStandardMaterial({ map: variant === 1 ? textures.arrowRight : textures.arrowLeft, roughness: 0.6, side: DoubleSide })), list.map((p) => ({ ...p, y: p.y + 3.1 })), { shadow: true });
    ctx.add(board);
    ctx.add(instanced(postsGeo, ctx.std({ vertexColors: true }), list, { shadow: true }));
  }
}
