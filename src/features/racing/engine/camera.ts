import { CAMERA } from "../config";
import { clamp, clamp01, damp, dampAngle } from "./math";

/** What the camera needs to know about the world; implemented against the track in cameraWorld.ts. */
export interface CameraWorld {
  /**
   * How far along (ax, az) -> (bx, bz) the way is clear, as a fraction 0..1.
   * 1 means nothing in between; below 1 the camera should stop short.
   */
  clearance(ax: number, az: number, bx: number, bz: number): number;
  /** Terrain height under a point, so the camera never dips into a dune. */
  groundAt(x: number, z: number): number;
}

export interface CameraTarget {
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  yawRate: number;
  boosting: boolean;
}

export interface CameraOptions {
  /** CAMERA_DISTANCE_SCALE value from the player's setting. */
  distanceScale: number;
  /** Turns off tilt, FOV punch and shake. */
  reducedMotion: boolean;
  world: CameraWorld;
}

/**
 * Third-person chase camera. The *angle* behind the car is smoothed (so turns
 * swing the view round and drifts show off the car's side) while the distance
 * is rigid, so there is no speed lag. Height is smoothed so jumps feel airy,
 * FOV opens with speed, the horizon tilts into turns, and the camera shortens
 * itself rather than clip into rocks, walls or dunes. Pure maths; the renderer
 * copies the result into a three.js camera.
 */
export class ChaseCamera {
  x = 0;
  y = 5;
  z = -8;
  lookX = 0;
  lookY = 1;
  lookZ = 0;
  fov: number = CAMERA.baseFov;
  roll = 0;
  shakeX = 0;
  shakeY = 0;

  private heading = 0;
  private lookYSmooth = 1;
  private roll_ = 0;
  private shake = 0;
  private clock = 0;
  private placed = false;

  /** Jolt the view (landing, bumps). Ignored under reduced motion. */
  kick(amount: number): void {
    this.shake = Math.min(1, this.shake + amount);
  }

  /** Jump straight to the rest position behind `t`, with no smoothing. */
  snap(t: CameraTarget, o: CameraOptions): void {
    this.heading = t.heading;
    this.y = t.y + CAMERA.height * o.distanceScale;
    this.lookYSmooth = t.y + CAMERA.lookHeight;
    this.fov = CAMERA.baseFov;
    this.roll_ = 0;
    this.shake = 0;
    this.placed = true;
    this.update(0, t, o);
  }

  /** Menu / attract mode: circle the target. `angle` is the bearing from the target to the camera. */
  orbit(t: CameraTarget, angle: number, radius: number, height: number): void {
    this.x = t.x + Math.sin(angle) * radius;
    this.z = t.z + Math.cos(angle) * radius;
    this.y = t.y + height;
    this.lookX = t.x;
    this.lookY = t.y + 1;
    this.lookZ = t.z;
    this.fov = 50;
    this.roll = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    // Hand over smoothly: the chase camera starts from this bearing.
    this.heading = angle + Math.PI;
    this.lookYSmooth = t.y + 1;
    this.roll_ = 0;
    this.placed = true;
  }

  update(dt: number, t: CameraTarget, o: CameraOptions): void {
    if (!this.placed) this.snap(t, o);
    this.clock += dt;
    const calm = o.reducedMotion;
    const speedFrac = clamp01(Math.abs(t.speed) / 40);

    this.heading = dt > 0 ? dampAngle(this.heading, t.heading, CAMERA.headingLambda, dt) : this.heading;

    const dist = (CAMERA.distance + CAMERA.speedPull * speedFrac) * o.distanceScale;
    const height = CAMERA.height * (0.6 + 0.4 * o.distanceScale);
    const bx = t.x - Math.sin(this.heading) * dist;
    const bz = t.z - Math.cos(this.heading) * dist;

    // Stop short of anything solid, but never closer than minDistance.
    const free = o.world.clearance(t.x, t.z, bx, bz);
    const k = Math.max(free, CAMERA.minDistance / dist);
    this.x = t.x + (bx - t.x) * Math.min(1, k);
    this.z = t.z + (bz - t.z) * Math.min(1, k);

    this.y = dt > 0 ? damp(this.y, t.y + height, CAMERA.heightLambda, dt) : this.y;
    this.y = Math.max(this.y, o.world.groundAt(this.x, this.z) + 1.4);

    this.lookYSmooth = dt > 0 ? damp(this.lookYSmooth, t.y + CAMERA.lookHeight, CAMERA.heightLambda, dt) : this.lookYSmooth;
    this.lookX = t.x + Math.sin(t.heading) * CAMERA.lookAhead;
    this.lookZ = t.z + Math.cos(t.heading) * CAMERA.lookAhead;
    this.lookY = this.lookYSmooth;

    const targetFov = CAMERA.baseFov + (CAMERA.maxFov - CAMERA.baseFov) * Math.pow(speedFrac, 1.4) + (t.boosting && !calm ? CAMERA.boostFov : 0);
    this.fov = dt > 0 ? damp(this.fov, calm ? CAMERA.baseFov : targetFov, CAMERA.fovLambda, dt) : this.fov;

    // The horizon leans into the turn.
    const targetRoll = calm ? 0 : clamp(t.yawRate * CAMERA.tilt * (0.4 + speedFrac), -CAMERA.tiltMax, CAMERA.tiltMax);
    this.roll_ = dt > 0 ? damp(this.roll_, targetRoll, CAMERA.tiltLambda, dt) : this.roll_;
    this.roll = this.roll_;

    this.shake = Math.max(0, this.shake - CAMERA.shakeDecay * dt * 0.25 - this.shake * CAMERA.shakeDecay * dt);
    if (calm || this.shake < 0.002) {
      this.shakeX = 0;
      this.shakeY = 0;
    } else {
      this.shakeX = Math.sin(this.clock * 61) * 0.22 * this.shake;
      this.shakeY = Math.cos(this.clock * 73) * 0.18 * this.shake;
    }
  }
}
