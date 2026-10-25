import { BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry, TorusGeometry } from "three";
import { addBoulders, addPosts, addTires, cappedRockGeometry, instanced, merge, obstaclePlacement, palette, part, pickColor, pineGeometry, posNoise, rockGeometry, type PropContext } from "./propKit";

const SNOW_BANK = palette(["#f6faff", "#e8f1fa", "#dbe9f6", "#eef5fc"]);
const BOULDER_SNOWY = palette(["#9aa6b6", "#aab4c2", "#8d99aa", "#b3bcc8"]);
const PINE_GREENS = ["#2c6e49", "#347a52", "#3f8a5c"] as const;

/** A cluster of ice crystals standing in the snow. */
function crystalsGeometry(): BufferGeometry {
  const tones = ["#bfe6ff", "#e6f6ff", "#9fd3f5", "#d3eeff"];
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.3 + (i % 2) * 0.1;
    const lean = i === 0 ? 0 : 0.32;
    parts.push(part(new ConeGeometry(0.17, 0.95 + (i % 3) * 0.35, 5), tones[i % 4], [Math.cos(a) * r, 0.5 + (i % 3) * 0.17, Math.sin(a) * r], [Math.sin(a) * lean, 0, -Math.cos(a) * lean]));
  }
  return merge(parts);
}

/** A tall cluster of blue-white ice spires, rock-blue at the foot and glittering white at the tips. */
function spireGeometry(seed: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const spec: [number, number, number, number][] = [
    [0, 0, 1, 1],
    [0.78, 0.3, 0.72, 0.62],
    [-0.62, -0.5, 0.82, 0.55],
    [0.2, -0.85, 0.6, 0.45],
  ];
  const foot = new Color("#8fb0d2");
  const tip = new Color("#ffffff");
  const c = new Color();
  for (const [x, z, h, r] of spec) {
    const g = new ConeGeometry(r, h * 2, 6, 3).translate(0, h, 0);
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const j = 1 + (posNoise(Math.round(pos.getX(i) * 20) / 20, Math.round(pos.getY(i) * 20) / 20, Math.round(pos.getZ(i) * 20) / 20, seed) - 0.5) * 0.28;
      pos.setXYZ(i, pos.getX(i) * j + x, pos.getY(i), pos.getZ(i) * j + z);
      c.copy(foot).lerp(tip, Math.min(1, Math.max(0, pos.getY(i) / (h * 2) - 0.1) * 1.5));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new Float32BufferAttribute(colors, 3));
    parts.push(g);
  }
  return merge(parts);
}

/** A friendly snowman with a top hat, a red scarf and a carrot nose pointing toward +z. */
function snowmanGeometry(): BufferGeometry {
  const ball = (r: number) => new SphereGeometry(r, 14, 10);
  return merge([
    part(ball(1.02), "#ffffff", [0, 0.95, 0]),
    part(ball(0.76), "#fafcff", [0, 2.25, 0]),
    part(ball(0.54), "#ffffff", [0, 3.15, 0]),
    part(new TorusGeometry(0.5, 0.12, 6, 14), "#e53935", [0, 2.82, 0], [Math.PI / 2, 0, 0]),
    part(new BoxGeometry(0.2, 0.7, 0.14), "#e53935", [0.3, 2.45, 0.46], [0, 0, -0.2]),
    part(new ConeGeometry(0.1, 0.55, 6), "#ff8a1f", [0, 3.12, 0.62], [Math.PI / 2, 0, 0]),
    part(ball(0.07), "#1b1d24", [-0.2, 3.3, 0.48]),
    part(ball(0.07), "#1b1d24", [0.2, 3.3, 0.48]),
    part(ball(0.08), "#1b1d24", [0, 2.45, 0.74]),
    part(ball(0.08), "#1b1d24", [0, 2.1, 0.76]),
    part(new CylinderGeometry(0.6, 0.6, 0.08, 14), "#1b1d24", [0, 3.55, 0]),
    part(new CylinderGeometry(0.36, 0.38, 0.55, 14), "#1b1d24", [0, 3.85, 0]),
    part(new CylinderGeometry(0.385, 0.385, 0.1, 14), "#e53935", [0, 3.67, 0]),
    part(new CylinderGeometry(0.04, 0.05, 1.2, 5), "#6b4a2e", [-0.95, 2.45, 0], [0, 0, 1.0]),
    part(new CylinderGeometry(0.04, 0.05, 1.2, 5), "#6b4a2e", [0.95, 2.45, 0], [0, 0, -1.0]),
  ]);
}

/** Three chunky blocks of ice, leaning on each other. */
function iceBlockGeometry(): BufferGeometry {
  return merge([
    part(new BoxGeometry(1.7, 1.25, 1.5), "#b8e3ff", [-0.55, 0.62, 0], [0, 0.25, 0]),
    part(new BoxGeometry(1.4, 1.5, 1.3), "#cdeeff", [0.75, 0.75, 0.2], [0, -0.3, 0]),
    part(new BoxGeometry(1.2, 1.0, 1.1), "#e4f6ff", [0.1, 1.7, 0.1], [0.1, 0.5, 0.18]),
  ]);
}

/** The winter world: snow banks, snowy pines, ice, snowmen. */
export function buildWinterProps(ctx: PropContext): void {
  const { kit, content, scratch } = ctx;
  const { scatter, obstacles } = content;

  // The boundary is a chain of snow banks; loose rocks poke through the snow with white tops.
  const bankMat = ctx.std();
  const rockMat = ctx.std({ vertexColors: true });
  for (let variant = 0; variant < 3; variant++) {
    const bank = kit.geo(`rock-${variant}`, () => rockGeometry(variant + 1));
    ctx.add(instanced(bank, bankMat, scatter.wallRocks.filter((p) => p.variant === variant), { shadow: true, colorOf: (p) => pickColor(SNOW_BANK, p.x, p.z, scratch) }));
    const rock = kit.geo(`snow-rock-${variant}`, () => cappedRockGeometry(variant + 11, "#7b8591", "#f6faff"));
    ctx.add(instanced(rock, rockMat, scatter.rocks.filter((p) => p.variant === variant), { shadow: true }));
  }
  addBoulders(ctx, BOULDER_SNOWY);

  // Pines: scenery plus the solid ones on the shoulders.
  const pineMat = ctx.std({ vertexColors: true });
  const solid = obstacles.filter((o) => o.kind === "plant").map((o) => obstaclePlacement(o, 1));
  for (let variant = 0; variant < 3; variant++) {
    const geo = kit.geo(`pine-snow-${variant}`, () => pineGeometry(variant, PINE_GREENS, "#f4f9ff"));
    const list = [...scatter.flora.filter((p) => p.variant === variant), ...solid.filter((p) => p.variant === variant)];
    ctx.add(instanced(geo, pineMat, list, { shadow: true }));
  }

  // Obstacles.
  const toy = ctx.std({ vertexColors: true });
  ctx.add(instanced(kit.geo("snowman", snowmanGeometry), toy, obstacles.filter((o) => o.kind === "snowman").map((o) => obstaclePlacement(o, 1)), { shadow: true }));
  ctx.add(instanced(kit.geo("iceblock", iceBlockGeometry), ctx.std({ vertexColors: true, rough: 0.25, metal: 0.1 }), obstacles.filter((o) => o.kind === "iceblock").map((o) => obstaclePlacement(o, 1)), { shadow: true }));
  addTires(ctx);

  addPosts(ctx, "winter");

  // Ice crystals in the snow, and spires on the horizon.
  ctx.add(instanced(kit.geo("ice-crystals", crystalsGeometry), ctx.std({ vertexColors: true, rough: 0.2, metal: 0.15 }), scatter.tufts, { receive: false }));
  const spireMat = ctx.std({ vertexColors: true, rough: 0.35, metal: 0.05 });
  for (let variant = 0; variant < 2; variant++) {
    const geo = kit.geo(`ice-spire-${variant}`, () => spireGeometry(variant + 3));
    ctx.add(instanced(geo, spireMat, scatter.landmarks.filter((p) => p.variant === variant), { stretch: [1.1, 1.25, 1.1] }));
  }
}
