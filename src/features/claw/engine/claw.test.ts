import { describe, expect, it } from "vitest";
import { CABINET } from "../config";
import { RAIL_BOUNDS, aimOnFloor, chooseAim, clampX, clampZ } from "./claw";

describe("rail bounds", () => {
  it("lets the claw travel the whole checkered floor, out to the inner glass", () => {
    expect(RAIL_BOUNDS.minX).toBe(-CABINET.width / 2);
    expect(RAIL_BOUNDS.maxX).toBe(CABINET.width / 2);
    expect(RAIL_BOUNDS.minZ).toBe(-CABINET.depth / 2);
    expect(RAIL_BOUNDS.maxZ).toBe(CABINET.depth / 2);
    expect(CABINET.margin).toBe(0);
  });

  it("can sit over every floor corner, next to the glass", () => {
    const edgeX = CABINET.width / 2;
    const edgeZ = CABINET.depth / 2;
    expect(clampX(edgeX)).toBe(edgeX);
    expect(clampZ(edgeZ)).toBe(edgeZ);
    expect(clampX(-edgeX)).toBe(-edgeX);
    expect(clampZ(-edgeZ)).toBe(-edgeZ);
  });

  it("aims at a tapped floor point, even when that tile is empty", () => {
    expect(aimOnFloor(0, 0)).toEqual({ x: 0, z: 0 });
    expect(aimOnFloor(CABINET.width / 2, CABINET.depth / 2)).toEqual({ x: CABINET.width / 2, z: CABINET.depth / 2 });
    expect(aimOnFloor(-CABINET.width / 2, -CABINET.depth / 2)).toEqual({ x: -CABINET.width / 2, z: -CABINET.depth / 2 });
    expect(aimOnFloor(CABINET.width, 0)).toBeNull();
  });

  it("clamps a tap on the glass to that floor edge", () => {
    expect(aimOnFloor(-CABINET.width / 2 - 0.6, 0.2)).toEqual({ x: -CABINET.width / 2, z: 0.2 });
    expect(aimOnFloor(CABINET.width / 2 + 0.4, -0.3)).toEqual({ x: CABINET.width / 2, z: -0.3 });
  });

  it("sends a tap toward the glass to the floor, not a toy that sat in the line of sight", () => {
    const tile = { x: -CABINET.width / 2, z: 0.4 };
    const toyInTheWay = { x: 0, z: 0, radius: 0.4, status: "resting" as const };
    expect(chooseAim(tile, toyInTheWay)).toEqual(tile);
  });

  it("does not let a nearby pile toy steal a tap on the empty floor by the glass", () => {
    const glass = { x: -CABINET.width / 2, z: 0.4 };
    const pileToy = { x: -1.85, z: 0.35, radius: 0.42, status: "resting" as const };
    expect(chooseAim(glass, pileToy)).toEqual(glass);
  });

  it("still aims at a toy you actually tap", () => {
    const toy = { x: 0.2, z: -0.1, radius: 0.4, status: "resting" as const };
    expect(chooseAim({ x: 0.15, z: -0.08 }, toy)).toEqual({ x: toy.x, z: toy.z });
  });
});
