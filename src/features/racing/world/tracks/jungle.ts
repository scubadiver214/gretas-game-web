import { SURFACES } from "../../config";
import type { TrackDefinition } from "../track";

/**
 * World 5, Jungle Roar Rally: a muddy red-earth road winding through the
 * rainforest, up and down over low hills — two extra climbs and drops sit
 * between the older swells. Lions, tigers and giraffes wait at the roadside
 * and dash across when a car comes, and more of them roam the clearings. A
 * left-hand kink after the start, a sharper chicane in the middle, and stone
 * idols, stumps and crates to dodge. Two laps.
 */
export const JUNGLE_ROAR_RALLY: TrackDefinition = {
  id: "jungle-rally",
  name: "Jungle Roar Rally",
  world: "jungle",
  seed: "jungle-roar-rally",
  tier: 3,
  laps: 2,
  roadWidth: 24,
  shoulder: 8,
  checkpoints: 6,
  surfaces: { road: SURFACES.jungleDirt, shoulder: SURFACES.grass },
  points: [
    { x: 0, z: 0, width: 28 },
    { x: 130, z: -4, width: 28 },
    { x: 195, z: -22 },
    { x: 260, z: -6 },
    { x: 330, z: 40 },
    { x: 370, z: 90 },
    { x: 390, z: 150 },
    { x: 350, z: 235 },
    { x: 270, z: 270 },
    { x: 200, z: 235 },
    { x: 145, z: 158 },
    { x: 80, z: 150 },
    { x: 10, z: 185 },
    { x: -30, z: 260 },
    { x: -110, z: 300 },
    { x: -200, z: 280 },
    { x: -250, z: 210 },
    { x: -235, z: 120 },
    { x: -170, z: 50 },
    { x: -90, z: 15, width: 28 },
  ],
  ramps: [
    { at: 0.06, length: 12, height: 2.2 },
    { at: 0.52, length: 12, height: 2.3 },
  ],
  hills: [
    { at: 0.12, length: 200, height: 6 },
    { at: 0.31, length: 190, height: 7 },
    { at: 0.43, length: 125, height: 7 },
    { at: 0.6, length: 200, height: 6 },
    { at: 0.77, length: 180, height: 7 },
    { at: 0.91, length: 130, height: 7 },
  ],
  animals: [
    { at: 0.1, kind: "lion", side: 1 },
    { at: 0.27, kind: "giraffe", side: -1 },
    { at: 0.38, kind: "tiger", side: 1 },
    { at: 0.47, kind: "giraffe", side: 1 },
    { at: 0.58, kind: "lion", side: -1 },
    { at: 0.72, kind: "tiger", side: -1 },
    { at: 0.86, kind: "giraffe", side: 1 },
    { at: 0.95, kind: "lion", side: -1 },
  ],
  roamers: 12,
  coinTrails: [
    { from: 0.015, to: 0.055, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 0, speed: 32 } },
    { from: 0.13, to: 0.25, spacing: 6, weave: { amplitude: 6, wavelength: 70 } },
    { from: 0.3, to: 0.36, spacing: 6, lateral: 5 },
    { from: 0.4, to: 0.45, spacing: 6, lateral: -4 },
    { from: 0.485, to: 0.515, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 1, speed: 32 } },
    { from: 0.61, to: 0.7, spacing: 6, weave: { amplitude: 6, wavelength: 64 } },
    { from: 0.78, to: 0.84, spacing: 6, lateral: 5 },
    { from: 0.88, to: 0.93, spacing: 6, lateral: -4 },
  ],
  gems: [
    { at: 0.2, lateral: 16 },
    { at: 0.43, lateral: -16 },
    { at: 0.66, lateral: 16 },
    { at: 0.9, lateral: -16 },
  ],
  obstacles: [
    { at: 0.14, lateral: 15.5, kind: "stump" },
    { at: 0.2, lateral: -13.5, kind: "crate" },
    { at: 0.23, lateral: 15.5, kind: "idol" },
    { at: 0.33, lateral: -15.5, kind: "stump" },
    { at: 0.36, lateral: 13.5, kind: "idol" },
    { at: 0.43, lateral: 15.5, kind: "boulder" },
    { at: 0.55, lateral: -15.5, kind: "idol" },
    { at: 0.62, lateral: 13.5, kind: "stump" },
    { at: 0.66, lateral: -15.5, kind: "crate" },
    { at: 0.69, lateral: 15.5, kind: "boulder" },
    { at: 0.76, lateral: -13.5, kind: "idol" },
    { at: 0.8, lateral: 15.5, kind: "stump" },
    { at: 0.9, lateral: -15.5, kind: "crate" },
    { at: 0.94, lateral: 15.5, kind: "boulder" },
  ],
};
