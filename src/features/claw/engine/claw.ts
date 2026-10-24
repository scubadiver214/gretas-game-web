import { CABINET, CLAW } from "../config";
import type { ClawState } from "./types";

/** Where the head may travel: the checkered floor, out to the inner glass. */
export const RAIL_BOUNDS = {
  minX: -CABINET.width / 2 + CABINET.margin,
  maxX: CABINET.width / 2 - CABINET.margin,
  minZ: -CABINET.depth / 2 + CABINET.margin,
  maxZ: CABINET.depth / 2 - CABINET.margin,
} as const;

export function createClaw(x: number = CLAW.homeX, z: number = CLAW.homeZ): ClawState {
  return {
    x: clampX(x),
    z: clampZ(z),
    drop: 0,
    jaw: 0.35,
    swingX: 0,
    swingZ: 0,
    swingVX: 0,
    swingVZ: 0,
    stopDrop: 0,
    heldToy: null,
    slipAt: null,
    carryFrom: null,
  };
}

export function clampX(x: number): number {
  return Math.min(RAIL_BOUNDS.maxX, Math.max(RAIL_BOUNDS.minX, x));
}

export function clampZ(z: number): number {
  return Math.min(RAIL_BOUNDS.maxZ, Math.max(RAIL_BOUNDS.minZ, z));
}

/** A point on the checkered floor the claw can travel to, or null if it is way outside the cabinet. */
export function aimOnFloor(x: number, z: number): { x: number; z: number } | null {
  const halfW = CABINET.width / 2;
  const halfD = CABINET.depth / 2;
  // Clicks on the glass or the wall still count: pull them onto that floor edge.
  if (x < -halfW - 2 || x > halfW + 2 || z < -halfD - 2 || z > halfD + 2) return null;
  return { x: clampX(x), z: clampZ(z) };
}

/**
 * Where a pointer tap should send the claw. A toy only wins if it actually
 * sits on that floor tile; a toy that merely sat in the camera's line of
 * sight toward the glass does not steal the aim.
 */
export function chooseAim(
  tile: { x: number; z: number } | null,
  toy: { x: number; z: number; radius: number; status: string } | null,
): { x: number; z: number } | null {
  if (toy && (toy.status === "resting" || toy.status === "falling")) {
    // Only the toy sitting on that floor tile — a neighbour in the pile, or a
    // tall toy along the camera ray toward the glass, must not steal the aim.
    if (!tile || Math.hypot(toy.x - tile.x, toy.z - tile.z) <= toy.radius) {
      return { x: toy.x, z: toy.z };
    }
  }
  return tile;
}

/** World y of the finger tips for a cable extension. */
export function tipY(drop: number): number {
  return CABINET.height - drop - CLAW.fingerLength;
}

/** Cable extension that puts the finger tips at `y`. */
export function dropForTipY(y: number): number {
  return Math.max(0, CABINET.height - CLAW.fingerLength - y);
}

/** Length of the pendulum from the rail to the finger tips. */
export function pendulumLength(claw: ClawState): number {
  return claw.drop + CLAW.fingerLength;
}

/** Finger-tip position including the cable swing. */
export function tipPosition(claw: ClawState): { x: number; y: number; z: number } {
  const len = pendulumLength(claw);
  return {
    x: claw.x + Math.sin(claw.swingX) * len,
    y: tipY(claw.drop) + (1 - Math.cos(claw.swingX)) * len * 0.5,
    z: claw.z + Math.sin(claw.swingZ) * len,
  };
}

/** Moves the head towards a point at `speed`; returns true once it has arrived. */
export function moveToward(claw: ClawState, tx: number, tz: number, speed: number, h: number): boolean {
  const dx = tx - claw.x;
  const dz = tz - claw.z;
  const dist = Math.hypot(dx, dz);
  const stepLen = speed * h;
  if (dist <= stepLen || dist < 1e-6) {
    claw.x = tx;
    claw.z = tz;
    return true;
  }
  claw.x += (dx / dist) * stepLen;
  claw.z += (dz / dist) * stepLen;
  return false;
}

/**
 * Cable swing as a damped pendulum. The head's horizontal acceleration kicks
 * the swing (a sudden stop makes the prize sway), the spring brings it back.
 */
export function stepSwing(claw: ClawState, accelX: number, accelZ: number, h: number): void {
  const { stiffness, damping, kick, max } = CLAW.swing;
  const len = Math.max(0.5, pendulumLength(claw));
  // Longer cables swing slower.
  const k = stiffness / len;
  claw.swingVX += (-k * claw.swingX - damping * claw.swingVX - (accelX * kick) / len) * h;
  claw.swingVZ += (-k * claw.swingZ - damping * claw.swingVZ - (accelZ * kick) / len) * h;
  claw.swingX = Math.max(-max, Math.min(max, claw.swingX + claw.swingVX * h));
  claw.swingZ = Math.max(-max, Math.min(max, claw.swingZ + claw.swingVZ * h));
}
