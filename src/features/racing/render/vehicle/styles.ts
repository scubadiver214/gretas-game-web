/**
 * How a vehicle is painted. A style is pure data: the garage (later) edits these, the
 * AI picks its own, and any VehicleVisual (procedural now, GLB later) reads them.
 */
export interface VehicleStyle {
  id: string;
  name: string;
  /** Main paint: the flanks and tail. */
  body: string;
  /** Glossy black parts: the nose, skirts and canopy trim. */
  trim: string;
  /** The nose roundel and the wheel centres. */
  accent: string;
  /** Wheel spokes. */
  hub: string;
  /** Painted lettering on the panels. */
  decal: "fitzmagic" | "none";
  /** Driver's helmet. */
  helmet: string;
  skin: string;
  shirt: string;
}

/** Which model a car is built from. Each has its own shape and size (see render/vehicle/rivals.ts). */
export type CarBody = "fitzmagic" | "monster" | "bubble" | "formula" | "bus";

/** Everything the renderer needs to draw one car. */
export interface CarLook {
  body: CarBody;
  style: VehicleStyle;
}

/** The starter: a pearl-white hypercar with a glossy black nose, a gold roundel and the Fitzmagic logo down its flanks. */
export const FITZMAGIC: VehicleStyle = {
  id: "fitzmagic",
  name: "Fitzmagic",
  body: "#f4f6fb",
  trim: "#0c0e13",
  accent: "#f0b429",
  hub: "#d5d9e2",
  decal: "fitzmagic",
  helmet: "#3b82f6",
  skin: "#f2c29b",
  shirt: "#ffd23f",
};
