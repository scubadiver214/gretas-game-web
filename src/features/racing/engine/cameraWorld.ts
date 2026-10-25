import type { Obstacle, TrackContent } from "../world/content";
import { SpatialGrid } from "../world/spatial";
import { newQuery, type Track } from "../world/track";
import type { CameraWorld } from "./camera";

/** The camera may sit this far past the wall: beyond it the dunes can rise above it. */
const CAMERA_MARGIN = 2;
const CAMERA_RADIUS = 0.7;

/** Builds the camera's view of the world from a track and its content. */
export function makeCameraWorld(track: Track, content: TrackContent): CameraWorld {
  const grid = new SpatialGrid<Obstacle>(20);
  for (const o of content.obstacles) grid.insert(o);
  const near: Obstacle[] = [];
  const q = newQuery();

  const wallFraction = (ax: number, az: number, bx: number, bz: number): number => {
    track.projectGlobal(bx, bz, q);
    if (Math.abs(q.lateral) <= q.boundary + CAMERA_MARGIN) return 1;
    // Bisect between the car (inside) and the wanted position (outside the wall).
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2;
      track.projectGlobal(ax + (bx - ax) * mid, az + (bz - az) * mid, q);
      if (Math.abs(q.lateral) <= q.boundary + CAMERA_MARGIN) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  return {
    clearance(ax, az, bx, bz) {
      let frac = wallFraction(ax, az, bx, bz);
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 1e-3) return 1;
      const found = grid.queryInto(near, (ax + bx) / 2, (az + bz) / 2, len / 2 + 3);
      for (let i = 0; i < found; i++) {
        const o = near[i];
        // Ray / circle: closest approach along the ray.
        const t = ((o.x - ax) * dx + (o.z - az) * dz) / (len * len);
        if (t <= 0 || t >= 1) continue;
        const cx = ax + dx * t - o.x;
        const cz = az + dz * t - o.z;
        const r = o.r + CAMERA_RADIUS;
        if (cx * cx + cz * cz < r * r) frac = Math.min(frac, Math.max(0, t - r / len));
      }
      return frac;
    },
    groundAt(x, z) {
      return content.terrain.heightAt(x, z);
    },
  };
}
