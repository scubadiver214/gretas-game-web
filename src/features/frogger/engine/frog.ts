import { COLS, HOME_ROW, HOP_SECONDS, START_ROW, START_X } from "../config";
import type { Dir, FrogState } from "../types";

export function isRiverRow(row: number): boolean {
  return row >= 1 && row <= 5;
}

export function createFrog(): FrogState {
  return { x: START_X, row: START_ROW, hop: null, facing: "up", queued: null, bestRow: START_ROW };
}

/** Nearest column centre, clamped to the board. */
export function snapToColumn(x: number): number {
  return Math.min(COLS - 0.5, Math.max(0.5, Math.floor(x) + 0.5));
}

/**
 * Where a hop in `dir` would land, or null if the frog is already at that
 * edge. Off river rows the frog lives on column centres; on the river it keeps
 * whatever x the platform carried it to.
 */
export function hopTarget(frog: Pick<FrogState, "x" | "row">, dir: Dir): { x: number; row: number } | null {
  let { x, row } = frog;
  switch (dir) {
    case "up":
      if (row <= HOME_ROW) return null;
      row--;
      break;
    case "down":
      if (row >= START_ROW) return null;
      row++;
      break;
    case "left":
      if (x <= 0.5 + 1e-6) return null;
      x = Math.max(0.5, x - 1);
      break;
    case "right":
      if (x >= COLS - 0.5 - 1e-6) return null;
      x = Math.min(COLS - 0.5, x + 1);
      break;
  }
  if (!isRiverRow(row) && row !== HOME_ROW) x = snapToColumn(x);
  return { x, row };
}

/** Begin a hop now if possible. Returns false at an edge. */
export function startHop(frog: FrogState, dir: Dir): boolean {
  frog.facing = dir;
  const target = hopTarget(frog, dir);
  if (!target) return false;
  frog.hop = { fromX: frog.x, fromRow: frog.row, toX: target.x, toRow: target.row, t: 0, dir };
  return true;
}

/**
 * A move request from the player: hops immediately when resting, otherwise
 * remembers it (latest wins) so a quick double tap isn't lost.
 */
export function requestMove(frog: FrogState, dir: Dir): "started" | "queued" | "blocked" {
  if (frog.hop) {
    frog.queued = dir;
    return "queued";
  }
  return startHop(frog, dir) ? "started" : "blocked";
}

/** Advance the hop tween. Returns true on the step the frog lands. */
export function advanceHop(frog: FrogState, dt: number): boolean {
  const hop = frog.hop;
  if (!hop) return false;
  hop.t = Math.min(1, hop.t + dt / HOP_SECONDS);
  frog.x = hop.fromX + (hop.toX - hop.fromX) * hop.t;
  if (hop.t < 1) return false;
  frog.x = hop.toX;
  frog.row = hop.toRow;
  frog.hop = null;
  return true;
}

/** Fractional row the frog occupies right now (used for collisions mid-hop). */
export function frogY(frog: FrogState): number {
  const hop = frog.hop;
  return hop ? hop.fromRow + (hop.toRow - hop.fromRow) * hop.t : frog.row;
}
