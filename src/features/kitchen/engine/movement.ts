import { CHEF } from "../config";
import type { Chef, KitchenState } from "./types";

export function isSolid(state: Pick<KitchenState, "width" | "depth" | "solid">, tx: number, tz: number): boolean {
  if (tx < 0 || tz < 0 || tx >= state.width || tz >= state.depth) return true;
  return state.solid[tz * state.width + tx];
}

/** Push a circle out of every solid tile it overlaps. */
function resolveTiles(state: KitchenState, chef: Chef): void {
  const r = CHEF.radius;
  const minX = Math.floor(chef.x - r);
  const maxX = Math.floor(chef.x + r);
  const minZ = Math.floor(chef.z - r);
  const maxZ = Math.floor(chef.z + r);
  for (let tz = minZ; tz <= maxZ; tz++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (!isSolid(state, tx, tz)) continue;
      const cx = Math.max(tx, Math.min(chef.x, tx + 1));
      const cz = Math.max(tz, Math.min(chef.z, tz + 1));
      const dx = chef.x - cx;
      const dz = chef.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        chef.x += (dx / d) * (r - d);
        chef.z += (dz / d) * (r - d);
      } else {
        // Centre inside the tile (spawned badly): shove out along the shortest axis.
        const left = chef.x - tx;
        const right = tx + 1 - chef.x;
        const up = chef.z - tz;
        const down = tz + 1 - chef.z;
        const m = Math.min(left, right, up, down);
        if (m === left) chef.x = tx - r;
        else if (m === right) chef.x = tx + 1 + r;
        else if (m === up) chef.z = tz - r;
        else chef.z = tz + 1 + r;
      }
    }
  }
}

/** One fixed step of walking / dashing with tile collisions. */
export function moveChef(state: KitchenState, chef: Chef, h: number): void {
  let ix = chef.moveX;
  let iz = chef.moveZ;
  const len = Math.hypot(ix, iz);
  if (len > 1) {
    ix /= len;
    iz /= len;
  }
  const speed = CHEF.speed * state.mods.moveSpeed;
  if (chef.dashTime > 0) {
    chef.dashTime = Math.max(0, chef.dashTime - h);
    chef.vx = Math.sin(chef.facing) * CHEF.dashSpeed;
    chef.vz = Math.cos(chef.facing) * CHEF.dashSpeed;
  } else {
    const k = Math.min(1, CHEF.accel * h);
    chef.vx += (ix * speed - chef.vx) * k;
    chef.vz += (iz * speed - chef.vz) * k;
  }
  if (chef.dashCooldown > 0) chef.dashCooldown = Math.max(0, chef.dashCooldown - h);
  if (len > 0.15) chef.facing = Math.atan2(ix, iz);

  chef.x += chef.vx * h;
  resolveTiles(state, chef);
  chef.z += chef.vz * h;
  resolveTiles(state, chef);
}

/** Chefs bump into each other instead of overlapping. */
export function separateChefs(state: KitchenState): void {
  const chefs = state.chefs;
  const min = CHEF.radius * 2;
  for (let i = 0; i < chefs.length; i++) {
    for (let j = i + 1; j < chefs.length; j++) {
      const a = chefs[i];
      const b = chefs[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      const nx = d > 1e-6 ? dx / d : 1;
      const nz = d > 1e-6 ? dz / d : 0;
      const push = (min - d) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
      resolveTiles(state, a);
      resolveTiles(state, b);
    }
  }
}

const PROBE_ANGLES = [0, 0.55, -0.55, 1.0, -1.0];

/** The station tile the chef is facing, probing a little to each side so near-misses still count. */
export function findTarget(state: KitchenState, chef: Chef): number | null {
  for (const a of PROBE_ANGLES) {
    const f = chef.facing + a;
    const px = chef.x + Math.sin(f) * CHEF.reach;
    const pz = chef.z + Math.cos(f) * CHEF.reach;
    const tx = Math.floor(px);
    const tz = Math.floor(pz);
    if (tx < 0 || tz < 0 || tx >= state.width || tz >= state.depth) continue;
    const id = state.stationAt[tz * state.width + tx];
    if (id >= 0) return id;
  }
  return null;
}
