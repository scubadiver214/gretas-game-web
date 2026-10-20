import { Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { mulberry32 } from "@/lib/rng";
import { COLS, HOME_BAYS, MEDIAN_ROW, ROWS, START_ROW } from "../../config";
import type { Kit } from "../kit";

/** Extra ground drawn beyond each side of the board so the edges never show the void. */
export const SIDE_EXTRA = 10;
const WIDTH = COLS + SIDE_EXTRA * 2;

/** World X for a board tile x. */
export function worldX(x: number): number {
  return x - COLS / 2;
}

/** World Z for a (fractional) row; the start row is nearest the camera. */
export function worldZ(row: number): number {
  return row - (ROWS - 1) / 2;
}

export interface BoardRig {
  root: Group;
  /** Lily pads in the five home bays (frogs sit on these). */
  pads: Mesh[];
}

function slab(kit: Kit, color: string, z0: number, z1: number, top: number, opts: { map?: boolean } = {}): Mesh {
  const depth = z1 - z0;
  const mat = opts.map ? kit.mat(color, { map: kit.textures.grass, rough: 0.95 }) : kit.mat(color, { rough: 0.95 });
  const m = new Mesh(kit.box(WIDTH, 0.6, depth), mat);
  m.position.set(0, top - 0.3, (z0 + z1) / 2);
  m.receiveShadow = true;
  return m;
}

/**
 * Static scenery: start strip, road with lane dashes, grass median, river bed,
 * the home hedge with five lily-pad bays, and a little countryside around it.
 */
export function buildBoard(kit: Kit): BoardRig {
  const root = new Group();
  const rowEdge = (row: number) => worldZ(row) - 0.5;

  kit.textures.grass.repeat.set(WIDTH / 2, 2);

  // Near meadow + start strip.
  root.add(slab(kit, "#FFFFFF", rowEdge(START_ROW), rowEdge(START_ROW) + 6, 0, { map: true }));
  root.add(slab(kit, "#B9A7E8", rowEdge(START_ROW) + 0.08, rowEdge(START_ROW) + 0.92, 0.02));
  // Road.
  root.add(slab(kit, "#3A3D44", rowEdge(7), rowEdge(START_ROW), 0));
  // Median.
  root.add(slab(kit, "#FFFFFF", rowEdge(MEDIAN_ROW), rowEdge(7), 0.03, { map: true }));
  root.add(slab(kit, "#C7CCD6", rowEdge(7) - 0.12, rowEdge(7), 0.06));
  root.add(slab(kit, "#C7CCD6", rowEdge(MEDIAN_ROW), rowEdge(MEDIAN_ROW) + 0.12, 0.06));
  // River bed (the animated water surface sits above it).
  root.add(slab(kit, "#1C4E9E", rowEdge(1), rowEdge(MEDIAN_ROW), -0.5));

  // Lane dashes and solid edge lines.
  const dashes = new InstancedMesh(kit.box(0.5, 0.02, 0.07), kit.mat("#F4F6FA", { rough: 0.6 }), 4 * Math.ceil(WIDTH));
  const m = new Matrix4();
  let n = 0;
  for (let row = 8; row <= 11; row++) {
    for (let x = -WIDTH / 2; x < WIDTH / 2; x += 1) {
      m.makeTranslation(x + 0.25, 0.01, rowEdge(row));
      dashes.setMatrixAt(n++, m);
    }
  }
  dashes.count = n;
  dashes.receiveShadow = true;
  root.add(dashes);
  for (const z of [rowEdge(7) + 0.1, rowEdge(START_ROW) - 0.1]) {
    const line = new Mesh(kit.box(WIDTH, 0.02, 0.06), kit.mat("#FFD233"));
    line.position.set(0, 0.01, z);
    root.add(line);
  }

  // Home hedge: hedge blocks between the bays, water + lily pad inside each bay.
  const hedgeTop = kit.mat("#3FA34D", { rough: 0.9 });
  const hedgeSide = kit.mat("#2E7D32", { rough: 0.9 });
  const homeZ = worldZ(0);
  const bayEdges = [-SIDE_EXTRA, ...HOME_BAYS.flatMap((c) => [c, c + 1]), COLS + SIDE_EXTRA];
  for (let i = 0; i < bayEdges.length; i += 2) {
    const x0 = bayEdges[i];
    const x1 = bayEdges[i + 1];
    const w = x1 - x0;
    const hedge = new Mesh(kit.box(w, 0.55, 1), [hedgeSide, hedgeSide, hedgeTop, hedgeSide, hedgeSide, hedgeSide]);
    hedge.position.set(worldX((x0 + x1) / 2), 0.27, homeZ);
    hedge.castShadow = true;
    hedge.receiveShadow = true;
    root.add(hedge);
  }
  const pads: Mesh[] = [];
  for (const c of HOME_BAYS) {
    const water = new Mesh(kit.box(1, 0.1, 1), kit.mat("#2F8CFF", { rough: 0.3 }));
    water.position.set(worldX(c + 0.5), -0.12, homeZ);
    root.add(water);
    const pad = new Mesh(kit.cylinder(0.4, 0.4, 0.05, 10), kit.mat("#4CC35A"));
    pad.position.set(worldX(c + 0.5), -0.03, homeZ);
    pad.receiveShadow = true;
    root.add(pad);
    pads.push(pad);
  }

  // Back meadow with a few low-poly trees.
  root.add(slab(kit, "#FFFFFF", rowEdge(0) - 9, rowEdge(0), 0.02, { map: true }));
  const rnd = mulberry32(42);
  const trunk = kit.mat("#7A4B22");
  const leaves = [kit.mat("#2E9E44"), kit.mat("#3FB950"), kit.mat("#228B3A")];
  for (let i = 0; i < 26; i++) {
    const x = (rnd() - 0.5) * (WIDTH - 2);
    const z = rowEdge(0) - 1.2 - rnd() * 6;
    const s = 0.7 + rnd() * 0.7;
    const t = new Mesh(kit.cylinder(0.08, 0.1, 0.5, 6), trunk);
    t.position.set(x, 0.25 * s, z);
    t.scale.setScalar(s);
    t.castShadow = true;
    const crown = new Mesh(kit.geo("tree-crown", () => kit.cylinder(0, 0.45, 1.1, 7)), leaves[i % leaves.length]);
    crown.position.set(x, (0.5 + 0.5) * s, z);
    crown.scale.setScalar(s);
    crown.castShadow = true;
    root.add(t, crown);
  }

  // Dim the ground outside the playable columns (just above the water and
  // grass) so the board edges read as straight lines from the tilted camera.
  const shade = new MeshBasicMaterial({ color: new Color("#05080D"), transparent: true, opacity: 0.4, depthWrite: false });
  kit.track(shade);
  const shadeGeo = kit.geo("edge-shade", () => new PlaneGeometry(SIDE_EXTRA, ROWS + 0.2).rotateX(-Math.PI / 2));
  for (const side of [-1, 1]) {
    const s = new Mesh(shadeGeo, shade);
    s.position.set(side * (COLS / 2 + SIDE_EXTRA / 2), 0.62, 0);
    s.renderOrder = 10;
    root.add(s);
  }

  return { root, pads };
}
