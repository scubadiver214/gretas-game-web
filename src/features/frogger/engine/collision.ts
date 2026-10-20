import { BAY_TOLERANCE, FROG_HIT_DEPTH, FROG_HIT_WIDTH, HOME_BAYS, VEHICLE_DEPTH, VEHICLE_TRIM } from "../config";
import type { Lane } from "../types";
import { entityLeft } from "./lanes";

/**
 * True if the frog's hitbox centred at (x, y) touches a vehicle. `y` is a
 * fractional row, so a frog mid-hop is tested against both lanes it spans.
 */
export function hitsVehicle(lanes: readonly Lane[], x: number, y: number, t: number): boolean {
  const reach = (FROG_HIT_DEPTH + VEHICLE_DEPTH) / 2;
  const half = FROG_HIT_WIDTH / 2;
  for (const lane of lanes) {
    if (lane.kind !== "road" || Math.abs(y - lane.row) >= reach) continue;
    for (const e of lane.entities) {
      const left = entityLeft(lane, e, t) + VEHICLE_TRIM;
      const right = left + e.length - 2 * VEHICLE_TRIM;
      if (x + half > left && x - half < right) return true;
    }
  }
  return false;
}

/** Index of the home bay the frog centre is over, or -1 for the hedge. */
export function bayAt(x: number): number {
  return HOME_BAYS.findIndex((c) => Math.abs(x - (c + 0.5)) <= BAY_TOLERANCE);
}
