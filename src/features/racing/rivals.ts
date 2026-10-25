import { BUGGY } from "./config";
import type { RivalSetup } from "./engine/RaceEngine";
import type { CarBody, CarLook, VehicleStyle } from "./render/vehicle/styles";
import type { VehicleParams } from "./types";

/** A computer racer: the car it drives, how it looks and how it races. */
export interface Rival extends RivalSetup {
  id: string;
  body: CarBody;
  style: VehicleStyle;
  /** Shown on the menu. */
  emoji: string;
  blurb: string;
  /** Its arrow on the minimap. */
  color: string;
}

const tune = (o: Partial<VehicleParams>): VehicleParams => ({ ...BUGGY, ...o });

/**
 * The four rivals, deliberately all different shapes and sizes. Their handling differs a
 * little (a heavy truck, a nippy bubble car); how fast they actually drive comes from the
 * track's tier (difficulty.ts) times their personality.
 */
export const RIVALS: readonly Rival[] = [
  {
    id: "bertha",
    name: "Big Bertha",
    emoji: "🛻",
    blurb: "A monster truck on giant wheels",
    color: "#a855f7",
    body: "monster",
    params: tune({ radius: 2.05, maxSpeed: 37, accel: 19, grip: 8.2, yawRate: 1.85, wheelRadius: 0.98 }),
    personality: { pace: 0.98, cornering: -0.04, lane: -0.32, weave: 0.12, mistakes: 1, aggression: 0.35 },
    style: { id: "bertha", name: "Big Bertha", body: "#8b3fd9", trim: "#1d1430", accent: "#7cf03d", hub: "#c9ced8", decal: "none", helmet: "#7cf03d", skin: "#c68b5e", shirt: "#ff8a1f" },
  },
  {
    id: "zippy",
    name: "Zippy",
    emoji: "🫧",
    blurb: "A tiny bubble car that zips round bends",
    color: "#2dd4bf",
    body: "bubble",
    params: tune({ radius: 1.15, maxSpeed: 36, accel: 28, grip: 10, yawRate: 2.3, wheelRadius: 0.36 }),
    personality: { pace: 0.97, cornering: 0.14, lane: 0.3, weave: 0.24, mistakes: 1.2, aggression: 0.65 },
    style: { id: "zippy", name: "Zippy", body: "#2fd3c1", trim: "#ff5fa2", accent: "#fff3a6", hub: "#ffffff", decal: "none", helmet: "#ff5fa2", skin: "#f2c29b", shirt: "#fff3a6" },
  },
  {
    id: "rocket",
    name: "Rocket Rita",
    emoji: "🚀",
    blurb: "A long, low racer that loves a straight",
    color: "#ef4444",
    body: "formula",
    params: tune({ radius: 1.45, maxSpeed: 40, accel: 21, grip: 9.4, yawRate: 1.95, wheelRadius: 0.55 }),
    personality: { pace: 1.03, cornering: 0.04, lane: 0, weave: 0.08, mistakes: 0.8, aggression: 0.85 },
    style: { id: "rocket", name: "Rocket Rita", body: "#e3262b", trim: "#15161b", accent: "#ffd23f", hub: "#e8e8ee", decal: "none", helmet: "#ffd23f", skin: "#8d5a3b", shirt: "#e3262b" },
  },
  {
    id: "buster",
    name: "Bus-ter",
    emoji: "🚌",
    blurb: "A school bus full of cheering kids",
    color: "#facc15",
    body: "bus",
    params: tune({ radius: 1.95, maxSpeed: 37, accel: 17, grip: 8.6, yawRate: 1.8, wheelRadius: 0.62 }),
    personality: { pace: 0.96, cornering: -0.08, lane: 0.22, weave: 0.1, mistakes: 1.3, aggression: 0.25 },
    style: { id: "buster", name: "Bus-ter", body: "#ffc21a", trim: "#16171d", accent: "#e53935", hub: "#d5d9e2", decal: "none", helmet: "#3b82f6", skin: "#f2c29b", shirt: "#3b82f6" },
  },
];

/** How the renderer should draw each rival, in grid order after the player. */
export function rivalLooks(rivals: readonly Rival[]): CarLook[] {
  return rivals.map((r) => ({ body: r.body, style: r.style }));
}
