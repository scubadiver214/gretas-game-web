/**
 * The pizzeria floor plan as a tile map. Each character is one tile; the
 * chefs walk on "." and work at the stations around them.
 *
 *   .  floor              #  counter (holds one item)
 *   P  pantry crate       R  dough table (roll dough into a base)
 *   K  chopping board     O  oven
 *   o  extra oven slot (a counter until the "Extra oven" upgrade)
 *   S  slicing station    W  serving pass (hand pizzas to customers)
 *   B  bin
 */

export type StationKind = "counter" | "pantry" | "roll" | "chop" | "oven" | "slice" | "pass" | "bin";

export interface LayoutDef {
  id: string;
  rows: readonly string[];
  /** Chef spawn points in tile units (centre of a floor tile). */
  spawns: readonly { x: number; z: number }[];
}

export const LUNCH_RUSH_LAYOUT: LayoutDef = {
  id: "lunch-rush",
  rows: [
    "#PPPPPP##OOo#",
    "#...........W",
    "P...........W",
    "P..#RR#KK#..#",
    "P...........S",
    "P...........#",
    "#...........#",
    "#B##KR##P#P##",
  ],
  spawns: [
    { x: 3.5, z: 1.5 },
    { x: 9.5, z: 5.5 },
    { x: 5.5, z: 5.5 },
    { x: 7.5, z: 1.5 },
  ],
};

export const TILE_KINDS: Record<string, StationKind | "floor" | "extraOven"> = {
  ".": "floor",
  "#": "counter",
  P: "pantry",
  R: "roll",
  K: "chop",
  O: "oven",
  o: "extraOven",
  S: "slice",
  W: "pass",
  B: "bin",
};

export function layoutSize(layout: LayoutDef): { width: number; depth: number } {
  return { width: Math.max(...layout.rows.map((r) => r.length)), depth: layout.rows.length };
}
