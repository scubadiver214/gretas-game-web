import { hashString, seededRng } from "@/lib/rng";
import type { MixStyle, Scatter } from "../types";

export interface Spot {
  cx: number;
  cy: number;
  r: number;
  index: number;
  mode: "ball" | "swirl" | "half" | "layers";
}

export function seatYFor(serve: "cone" | "cup" | "none"): number {
  return serve === "cup" ? 250 : 300;
}

function ball(cy: number, r: number, index: number): Spot {
  const side = index % 2 === 0 ? -1 : 1;
  const jx = side * (3 + (index % 3));
  return { cx: 160 + jx, cy, r, index, mode: "ball" };
}

/** Where each scoop sits. Ball stacks lean a few pixels so they are not a perfect column. */
export function spots(mix: MixStyle, count: number, seatY: number): Spot[] {
  if (count <= 0) return [];
  if (mix === "swirl" && count >= 2) return [{ cx: 160, cy: seatY - 20, r: 78, index: 0, mode: "swirl" }];
  if (mix === "half" && count >= 2) return [{ cx: 160, cy: seatY - 20, r: 78, index: 0, mode: "half" }];
  if (mix === "layered") return [{ cx: 160, cy: seatY - 6, r: 82, index: 0, mode: "layers" }];
  if (mix === "crazy") {
    const layout = [
      { cx: 116, cy: seatY + 4, r: 48 },
      { cx: 200, cy: seatY - 6, r: 46 },
      { cx: 156, cy: seatY - 72, r: 44 },
      { cx: 158, cy: seatY - 130, r: 34 },
    ];
    return layout.slice(0, count).map((spot, index) => ({ ...spot, index, mode: "ball" as const }));
  }
  if (count === 1) return [ball(seatY - 22, 74, 0)];
  if (count === 2) return [ball(seatY, 66, 0), ball(seatY - 82, 58, 1)];
  return [ball(seatY + 8, 62, 0), ball(seatY - 62, 54, 1), ball(seatY - 128, 48, 2)];
}

export function pieceCount(scatter: Scatter): number {
  if (scatter === "dots") return 10;
  if (scatter === "worms") return 3;
  return 5;
}

export interface ScatterPoint {
  x: number;
  y: number;
  seed: number;
}

/**
 * Toppings rest on the upper dome, inside the scoop.
 * The emoji is drawn from its center, so the point stays clear of the rim.
 */
export function scatterPoints(id: string, count: number, top: { cx: number; cy: number; r: number }): ScatterPoint[] {
  const rng = seededRng(id);
  return Array.from({ length: count }, (_, i) => {
    const angle = rng() * Math.PI;
    const reach = Math.sqrt(rng());
    const x = top.cx + Math.cos(angle) * top.r * 0.55 * reach;
    const y = top.cy - top.r * 0.28 - Math.sin(angle) * top.r * 0.28 * reach;
    const seed = (hashString(`${id}:${i}`) % 1000) / 1000;
    return { x, y, seed };
  });
}

export function highestSpot(layout: readonly Spot[]): Spot | null {
  return layout.reduce<Spot | null>((best, spot) => (!best || spot.cy < best.cy ? spot : best), null);
}

/** Quadratic syrup ribbon down one side of the top scoop. `extra` lengthens it when things overflow. */
export function saucePath(top: { cx: number; cy: number; r: number }, index: number, extra: number): string {
  const [start, bend, end] = saucePoints(top, index, extra);
  return `M ${start.x} ${start.y} Q ${bend.x} ${bend.y} ${end.x} ${end.y}`;
}

/** A ribbon down the outside of the scoop, not a stripe through the middle. */
export function saucePoints(top: { cx: number; cy: number; r: number }, index: number, extra: number): { x: number; y: number }[] {
  const side = index % 2 === 0 ? -1 : 1;
  return [
    { x: top.cx + side * top.r * 0.22, y: top.cy - top.r * 0.08 },
    { x: top.cx + side * top.r * 0.62, y: top.cy + top.r * 0.28 },
    { x: top.cx + side * top.r * 0.34, y: top.cy + top.r * 0.92 + index * 8 + extra },
  ];
}
