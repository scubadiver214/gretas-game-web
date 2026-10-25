import { SURFACES } from "../../config";
import type { TrackDefinition } from "../track";

/**
 * World 1, Dusty Desert Dash: a wide, forgiving dirt loop for Rookie Racers.
 * A long start straight with a first kicker, a double left-hand kink into a
 * sweeping right-hander, a gentle S-bend along the far side, a second jump and
 * a long swoop home. Two laps of roughly 1.5 km.
 */
export const DUSTY_DESERT_DASH: TrackDefinition = {
  id: "desert-dash",
  name: "Dusty Desert Dash",
  world: "desert",
  seed: "dusty-desert-dash",
  tier: 1,
  laps: 2,
  roadWidth: 24,
  shoulder: 9,
  checkpoints: 6,
  surfaces: { road: SURFACES.dirt, shoulder: SURFACES.sand },
  points: [
    { x: 0, z: 0, width: 28 },
    { x: 110, z: 4, width: 28 },
    { x: 165, z: -16 },
    { x: 220, z: -6 },
    { x: 270, z: -18 },
    { x: 320, z: -55 },
    { x: 340, z: -130 },
    { x: 320, z: -215 },
    { x: 250, z: -265, width: 26 },
    { x: 170, z: -245, width: 24 },
    { x: 110, z: -220, width: 24 },
    { x: 50, z: -240, width: 24 },
    { x: -40, z: -272 },
    { x: -120, z: -250 },
    { x: -170, z: -180 },
    { x: -180, z: -90 },
    { x: -150, z: -28 },
    { x: -78, z: 12, width: 26 },
  ],
  ramps: [
    { at: 0.09, length: 11, height: 2.0 },
    { at: 0.635, length: 11, height: 2.2 },
  ],
  coinTrails: [
    { from: 0.025, to: 0.083, spacing: 6, lateral: -4 },
    { from: 0, to: 0, air: { ramp: 0, speed: 30 } },
    { from: 0.14, to: 0.22, spacing: 6, weave: { amplitude: 6, wavelength: 70 } },
    { from: 0.27, to: 0.33, spacing: 6, lateral: 5 },
    { from: 0.38, to: 0.46, spacing: 6, weave: { amplitude: 5, wavelength: 60 } },
    { from: 0.5, to: 0.56, spacing: 6, lateral: -3 },
    { from: 0.585, to: 0.628, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 1, speed: 30 } },
    { from: 0.72, to: 0.8, spacing: 6, weave: { amplitude: 6, wavelength: 64 } },
    { from: 0.86, to: 0.96, spacing: 6, lateral: 0 },
  ],
  gems: [
    { at: 0.31, lateral: -16.5 },
    { at: 0.78, lateral: 16.5 },
  ],
  obstacles: [
    { at: 0.2, lateral: 15.5, kind: "tires" },
    { at: 0.36, lateral: -16, kind: "hay" },
    { at: 0.43, lateral: 15, kind: "hay" },
    { at: 0.52, lateral: 16, kind: "boulder" },
    { at: 0.71, lateral: -15.5, kind: "tires" },
    { at: 0.82, lateral: 15.5, kind: "boulder" },
    { at: 0.9, lateral: -16, kind: "hay" },
  ],
};
