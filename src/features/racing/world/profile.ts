import type { WorldId } from "./track";

/** How the ground rolls beyond the racing corridor. */
export type TerrainStyle = "dunes" | "drifts" | "alps" | "shore" | "jungle";

/** One kind of scenery scattered beyond the walls. */
export interface Scenery {
  count: number;
  /** Metres outside the wall where placement starts and stops. */
  near: number;
  far: number;
  /** Must be at least this far from every part of the corridor. */
  clearance: number;
  scaleLo: number;
  scaleHi: number;
  variants: number;
  /** Sinks the model into the ground (fraction of its scale). */
  sink?: number;
  /** Skipped on ground higher than this (no pines above the snow line). */
  maxHeight?: number;
  /** Skipped on ground lower than this (nothing grows under the sea). */
  minHeight?: number;
}

/**
 * What a world is made of. Pure data with no rendering in it, so the content
 * builder (and its tests) can use it; render/ turns each scenery list into
 * models: `flora` is cacti in the desert, pines in the snow and trees in the
 * mountains, and so on.
 */
export interface WorldProfile {
  terrain: {
    style: TerrainStyle;
    /** Tallest ground in metres. */
    height: number;
    /** Metres from the wall until the ground reaches full height. */
    fullAt: number;
    /** Level of the ground far from the road (the sea floor on a beach). Defaults to 0. */
    baseline?: number;
  };
  /** Height of the water's surface, for worlds with a sea. */
  water?: number;
  /** Solid plants standing on the shoulders. */
  solidPlants: number;
  flora: Scenery;
  rocks: Scenery;
  /** Ground cover: dry grass, ice crystals, wildflowers. */
  tufts: Scenery;
  /** Big far-off shapes: mesas, ice spires, crags. */
  landmarks: Scenery;
}

export const PROFILES: Record<WorldId, WorldProfile> = {
  desert: {
    terrain: { style: "dunes", height: 26, fullAt: 80 },
    solidPlants: 14,
    flora: { count: 120, near: 4, far: 90, clearance: 3, scaleLo: 0.8, scaleHi: 1.7, variants: 3 },
    rocks: { count: 80, near: 6, far: 120, clearance: 3, scaleLo: 1.4, scaleHi: 4.2, variants: 3, sink: 0.2 },
    tufts: { count: 340, near: 1.5, far: 100, clearance: 1.5, scaleLo: 0.8, scaleHi: 1.6, variants: 1 },
    landmarks: { count: 14, near: 70, far: 190, clearance: 55, scaleLo: 14, scaleHi: 34, variants: 2, sink: 0.12 },
  },
  winter: {
    terrain: { style: "drifts", height: 62, fullAt: 110 },
    solidPlants: 16,
    flora: { count: 220, near: 4, far: 130, clearance: 3, scaleLo: 0.9, scaleHi: 2, variants: 3 },
    rocks: { count: 46, near: 6, far: 120, clearance: 3, scaleLo: 1.3, scaleHi: 3.6, variants: 3, sink: 0.25 },
    tufts: { count: 230, near: 1.5, far: 90, clearance: 1.5, scaleLo: 0.8, scaleHi: 1.5, variants: 1 },
    landmarks: { count: 10, near: 90, far: 210, clearance: 60, scaleLo: 14, scaleHi: 32, variants: 2, sink: 0.08 },
  },
  alpine: {
    terrain: { style: "alps", height: 210, fullAt: 170 },
    solidPlants: 16,
    flora: { count: 210, near: 4, far: 150, clearance: 3, scaleLo: 0.9, scaleHi: 1.9, variants: 3, maxHeight: 75 },
    rocks: { count: 60, near: 6, far: 140, clearance: 3, scaleLo: 1.3, scaleHi: 3.8, variants: 3, sink: 0.25 },
    tufts: { count: 440, near: 1.5, far: 100, clearance: 1.5, scaleLo: 0.8, scaleHi: 1.5, variants: 1, maxHeight: 60 },
    landmarks: { count: 0, near: 100, far: 220, clearance: 60, scaleLo: 12, scaleHi: 26, variants: 2 },
  },
  // Sandy coast: dunes along the road, then the sea. Palms and rocks only on dry sand; sea stacks stand in the water.
  beach: {
    terrain: { style: "shore", height: 3.6, fullAt: 30, baseline: -6.5 },
    water: -1,
    solidPlants: 12,
    flora: { count: 110, near: 4, far: 60, clearance: 3, scaleLo: 0.9, scaleHi: 1.7, variants: 3, minHeight: 0.35 },
    rocks: { count: 50, near: 6, far: 70, clearance: 3, scaleLo: 1.2, scaleHi: 3.2, variants: 3, sink: 0.2, minHeight: 0.3 },
    tufts: { count: 190, near: 1.5, far: 60, clearance: 1.5, scaleLo: 0.8, scaleHi: 1.5, variants: 1, minHeight: 0.4 },
    landmarks: { count: 9, near: 60, far: 230, clearance: 50, scaleLo: 12, scaleHi: 24, variants: 2, sink: 0.2 },
  },
  // Rolling jungle: tall trees close to the road, ferns underfoot, tree-covered hills and rock towers behind.
  jungle: {
    terrain: { style: "jungle", height: 46, fullAt: 80 },
    solidPlants: 24,
    flora: { count: 340, near: 4, far: 120, clearance: 3, scaleLo: 0.9, scaleHi: 1.9, variants: 3 },
    rocks: { count: 50, near: 6, far: 110, clearance: 3, scaleLo: 1.2, scaleHi: 3.4, variants: 3, sink: 0.25 },
    tufts: { count: 460, near: 1.5, far: 90, clearance: 1.5, scaleLo: 0.8, scaleHi: 1.6, variants: 1 },
    landmarks: { count: 9, near: 80, far: 210, clearance: 60, scaleLo: 14, scaleHi: 30, variants: 2, sink: 0.1 },
  },
};
