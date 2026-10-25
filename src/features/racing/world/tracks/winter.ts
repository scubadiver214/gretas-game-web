import { SURFACES } from "../../config";
import type { TrackDefinition } from "../track";

/**
 * World 2, Frosty Flurry Run: a twisty loop through snowy pine hills for
 * Speedy Starters. Packed snow is a little slidey (that is the fun of it) and
 * the deep snow on the sides slows you right down. Snowstorms roll in at times
 * and cut the view, making the road even slippier. A long start straight with a
 * first jump, a double left-hand kink into a big right-hand sweeper, a
 * left-right S-bend through the middle, a second jump on the back straight and
 * a wide sweeper home. Two laps of roughly 1.7 km.
 */
export const FROSTY_FLURRY_RUN: TrackDefinition = {
  id: "frosty-flurry",
  name: "Frosty Flurry Run",
  world: "winter",
  seed: "frosty-flurry-run",
  tier: 2,
  laps: 2,
  roadWidth: 22,
  shoulder: 10,
  checkpoints: 6,
  surfaces: { road: SURFACES.snow, shoulder: SURFACES.deepSnow },
  points: [
    { x: 0, z: 0, width: 26 },
    { x: 110, z: 0, width: 26 },
    { x: 165, z: -18 },
    { x: 220, z: -8 },
    { x: 270, z: -20 },
    { x: 320, z: -60 },
    { x: 345, z: -130 },
    { x: 315, z: -205 },
    { x: 248, z: -245 },
    { x: 178, z: -222 },
    { x: 150, z: -155 },
    { x: 120, z: -105 },
    { x: 70, z: -90 },
    { x: 22, z: -118 },
    { x: -2, z: -175 },
    { x: -42, z: -238 },
    { x: -115, z: -262 },
    { x: -200, z: -225 },
    { x: -230, z: -145 },
    { x: -200, z: -65 },
    { x: -120, z: -18, width: 26 },
  ],
  ramps: [
    { at: 0.055, length: 11, height: 2.0 },
    { at: 0.575, length: 11, height: 2.2 },
  ],
  coinTrails: [
    { from: 0.02, to: 0.05, spacing: 6, lateral: -4 },
    { from: 0, to: 0, air: { ramp: 0, speed: 30 } },
    { from: 0.1, to: 0.17, spacing: 6, weave: { amplitude: 5, wavelength: 62 } },
    { from: 0.19, to: 0.25, spacing: 6, lateral: 5 },
    { from: 0.27, to: 0.35, spacing: 6, weave: { amplitude: 6, wavelength: 70 } },
    { from: 0.37, to: 0.41, spacing: 6, lateral: 0 },
    { from: 0.45, to: 0.52, spacing: 6, weave: { amplitude: 5, wavelength: 55 } },
    { from: 0.54, to: 0.57, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 1, speed: 30 } },
    { from: 0.65, to: 0.73, spacing: 6, weave: { amplitude: 6, wavelength: 64 } },
    { from: 0.76, to: 0.84, spacing: 6, lateral: -4 },
    { from: 0.88, to: 0.96, spacing: 6, lateral: 0 },
  ],
  gems: [
    { at: 0.24, lateral: -15.5 },
    { at: 0.5, lateral: 15.5 },
    { at: 0.8, lateral: -15.5 },
  ],
  obstacles: [
    { at: 0.16, lateral: 15, kind: "snowman" },
    { at: 0.23, lateral: -15.5, kind: "iceblock" },
    { at: 0.33, lateral: 15, kind: "snowman" },
    { at: 0.4, lateral: -15, kind: "iceblock" },
    { at: 0.47, lateral: 15.5, kind: "boulder" },
    { at: 0.52, lateral: -15, kind: "snowman" },
    { at: 0.62, lateral: 15, kind: "iceblock" },
    { at: 0.7, lateral: -15.5, kind: "snowman" },
    { at: 0.79, lateral: 15, kind: "iceblock" },
    { at: 0.9, lateral: -15, kind: "snowman" },
  ],
};
