import { SURFACES } from "../../config";
import type { TrackDefinition } from "../track";

/**
 * World 3, Sunny Summit Sprint: a fast, grippy mountain road through green
 * meadows and wildflowers, with snow-capped peaks all around and bright sun
 * overhead, for Turbo Racers. A long start straight with a jump, a double
 * left-hand kink into a huge right-hand sweeper, a tight switchback back toward
 * the start, a jump on the fast section and a long left-hand sweep home. Two
 * laps of roughly 2.0 km.
 */
export const SUNNY_SUMMIT_SPRINT: TrackDefinition = {
  id: "sunny-summit",
  name: "Sunny Summit Sprint",
  world: "alpine",
  seed: "sunny-summit-sprint",
  tier: 3,
  laps: 2,
  roadWidth: 24,
  shoulder: 8,
  checkpoints: 6,
  surfaces: { road: SURFACES.tarmac, shoulder: SURFACES.grass },
  points: [
    { x: 0, z: 0, width: 28 },
    { x: 150, z: 6, width: 28 },
    { x: 215, z: -18 },
    { x: 285, z: -8 },
    { x: 355, z: -22 },
    { x: 420, z: -50 },
    { x: 480, z: -140 },
    { x: 440, z: -230 },
    { x: 350, z: -270 },
    { x: 260, z: -250 },
    { x: 200, z: -200 },
    { x: 150, z: -160 },
    { x: 80, z: -170 },
    { x: 10, z: -210 },
    { x: -60, z: -260 },
    { x: -150, z: -285 },
    { x: -250, z: -260 },
    { x: -300, z: -190 },
    { x: -290, z: -110 },
    { x: -230, z: -50 },
    { x: -150, z: -10 },
    { x: -70, z: 10, width: 28 },
  ],
  ramps: [
    { at: 0.075, length: 12, height: 2.2 },
    { at: 0.575, length: 12, height: 2.3 },
    { at: 0.905, length: 12, height: 2.2 },
  ],
  coinTrails: [
    { from: 0.015, to: 0.07, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 0, speed: 32 } },
    { from: 0.12, to: 0.2, spacing: 6, weave: { amplitude: 6, wavelength: 70 } },
    { from: 0.22, to: 0.3, spacing: 6, lateral: 5 },
    { from: 0.32, to: 0.42, spacing: 6, weave: { amplitude: 5, wavelength: 60 } },
    { from: 0.44, to: 0.47, spacing: 6, lateral: 0 },
    { from: 0.52, to: 0.57, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 1, speed: 32 } },
    { from: 0.64, to: 0.72, spacing: 6, weave: { amplitude: 6, wavelength: 64 } },
    { from: 0.74, to: 0.82, spacing: 6, lateral: -5 },
    { from: 0.84, to: 0.89, spacing: 6, lateral: 0 },
    { from: 0, to: 0, air: { ramp: 2, speed: 32 } },
    { from: 0.955, to: 0.975, spacing: 6, lateral: 3 },
  ],
  gems: [
    { at: 0.3, lateral: 16 },
    { at: 0.69, lateral: -16 },
    { at: 0.86, lateral: 16 },
  ],
  obstacles: [
    { at: 0.14, lateral: 15.5, kind: "logs" },
    { at: 0.24, lateral: -15, kind: "hay" },
    { at: 0.34, lateral: 15.5, kind: "boulder" },
    { at: 0.43, lateral: -16, kind: "logs" },
    { at: 0.48, lateral: 15.5, kind: "hay" },
    { at: 0.54, lateral: -15.5, kind: "boulder" },
    { at: 0.62, lateral: 15, kind: "logs" },
    { at: 0.7, lateral: 15.5, kind: "hay" },
    { at: 0.78, lateral: -16, kind: "boulder" },
    { at: 0.86, lateral: -15, kind: "logs" },
    { at: 0.93, lateral: 15.5, kind: "hay" },
  ],
};
