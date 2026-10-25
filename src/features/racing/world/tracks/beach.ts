import { SURFACES } from "../../config";
import type { TrackDefinition } from "../track";

/**
 * World 4, Breezy Beach Blast: a coast road of hard-packed sand with the sea
 * lapping beside it. Sudden downpours blow in off the water, soaking the sand
 * so the car slides more and the road is harder to see. Unlike the other tracks
 * the road itself rolls: four long swells to climb and coast down, with a jump
 * or two on the flat bits between. A double kink after the start and a
 * sharper shore-side S-bend keep the steering busy. More roadside clutter too:
 * sandcastles, beach balls (they bounce you right back), stacks of surfboards
 * and crates, some out on the road's edge so you have to pick a line. Two laps.
 */
export const BREEZY_BEACH_BLAST: TrackDefinition = {
  id: "beach-blast",
  name: "Breezy Beach Blast",
  world: "beach",
  seed: "breezy-beach-blast",
  tier: 3,
  laps: 2,
  roadWidth: 24,
  shoulder: 8,
  checkpoints: 6,
  surfaces: { road: SURFACES.packedSand, shoulder: SURFACES.sand },
  points: [
    { x: 0, z: 0, width: 28 },
    { x: 140, z: 6, width: 28 },
    { x: 205, z: -18 },
    { x: 275, z: -8 },
    { x: 345, z: -22 },
    { x: 400, z: -45 },
    { x: 470, z: -130 },
    { x: 455, z: -225 },
    { x: 385, z: -290 },
    { x: 290, z: -300 },
    { x: 210, z: -270 },
    { x: 140, z: -268 },
    { x: 55, z: -340 },
    { x: -40, z: -335 },
    { x: -130, z: -290 },
    { x: -175, z: -215 },
    { x: -150, z: -130 },
    { x: -90, z: -60 },
    { x: -40, z: -15, width: 28 },
  ],
  ramps: [
    { at: 0.06, length: 12, height: 2.2 },
    { at: 0.505, length: 12, height: 2.3 },
    { at: 0.91, length: 12, height: 2.2 },
  ],
  hills: [
    { at: 0.13, length: 220, height: 8 },
    { at: 0.3, length: 240, height: 10 },
    { at: 0.58, length: 220, height: 8 },
    { at: 0.74, length: 230, height: 9 },
  ],
  coinTrails: [
    { from: 0.015, to: 0.055, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 0, speed: 32 } },
    { from: 0.14, to: 0.25, spacing: 6, weave: { amplitude: 6, wavelength: 70 } },
    { from: 0.31, to: 0.44, spacing: 6, lateral: 5 },
    { from: 0.46, to: 0.495, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 1, speed: 32 } },
    { from: 0.59, to: 0.7, spacing: 6, weave: { amplitude: 6, wavelength: 64 } },
    { from: 0.75, to: 0.87, spacing: 6, lateral: -5 },
    { from: 0.88, to: 0.9, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 2, speed: 32 } },
    { from: 0.955, to: 0.975, spacing: 6, lateral: 3 },
  ],
  gems: [
    { at: 0.2, lateral: 16 },
    { at: 0.38, lateral: -16 },
    { at: 0.66, lateral: 16 },
    { at: 0.82, lateral: -16 },
  ],
  obstacles: [
    { at: 0.1, lateral: 15.5, kind: "sandcastle" },
    { at: 0.16, lateral: -13.5, kind: "beachball" },
    { at: 0.21, lateral: 15.5, kind: "surfboards" },
    { at: 0.26, lateral: 13.5, kind: "crate" },
    { at: 0.33, lateral: -15.5, kind: "sandcastle" },
    { at: 0.37, lateral: 13.5, kind: "beachball" },
    { at: 0.41, lateral: -13.5, kind: "surfboards" },
    { at: 0.45, lateral: 15.5, kind: "crate" },
    { at: 0.53, lateral: -15.5, kind: "boulder" },
    { at: 0.56, lateral: 13.5, kind: "sandcastle" },
    { at: 0.61, lateral: -13.5, kind: "crate" },
    { at: 0.65, lateral: 15.5, kind: "beachball" },
    { at: 0.69, lateral: -15.5, kind: "surfboards" },
    { at: 0.77, lateral: 13.5, kind: "surfboards" },
    { at: 0.8, lateral: -13.5, kind: "beachball" },
    { at: 0.84, lateral: 15.5, kind: "sandcastle" },
    { at: 0.87, lateral: -15.5, kind: "crate" },
    { at: 0.94, lateral: 15.5, kind: "boulder" },
  ],
};
