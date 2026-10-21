import type { KitchenState } from "../engine/types";

/** Height of a counter top in world units (one tile = one unit). */
export const COUNTER_H = 0.55;
/** Chef rig scale: the 1.8-unit character becomes about one tile tall. */
export const CHEF_SCALE = 0.72;

/** Tile-space x/z (0..width) to world space centred on the kitchen. */
export function worldX(state: Pick<KitchenState, "width">, x: number): number {
  return x - state.width / 2;
}

export function worldZ(state: Pick<KitchenState, "depth">, z: number): number {
  return z - state.depth / 2;
}

type Projector = (wx: number, wy: number, wz: number) => { x: number; y: number };

let projector: Projector | null = null;
let dims = { width: 13, depth: 8 };

/** Called by the camera rig every frame so DOM popups can be anchored to world spots. */
export function setProjector(p: Projector | null, size?: { width: number; depth: number }): void {
  projector = p;
  if (size) dims = size;
}

/** Screen position (viewport fractions) of a tile-space point, for floating popups. */
export function screenPoint(tx: number, tz: number, height = 1.1): { x: number; y: number } {
  if (!projector) return { x: 0.5, y: 0.45 };
  return projector(tx - dims.width / 2, height, tz - dims.depth / 2);
}
