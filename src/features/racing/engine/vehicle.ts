import { GRAVITY } from "../config";
import { newQuery, type TrackQuery } from "../world/track";
import type { Controls, SurfaceProps, VehicleParams } from "../types";
import { clamp, clamp01, damp, smoothstep, wrapAngle } from "./math";

/**
 * One car. Position, heading and velocity are authoritative; everything the
 * renderer wants beyond that (suspension bounce, body roll) is derived from
 * these in render/vehicle/animator.ts, so the simulation stays small.
 */
export interface VehicleState {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Forward is (sin h, cos h) in (x, z): the same as three.js rotation.y. */
  heading: number;
  vx: number;
  vz: number;
  vy: number;
  yawRate: number;
  /** Smoothed steering, -1..1 (right is positive). */
  steer: number;
  /** Signed forward speed in units per second. */
  speed: number;
  /** Forward acceleration of the last step (drives the body pitch). */
  accel: number;
  grounded: boolean;
  /** Current lateral grip; falls during a drift and recovers afterwards. */
  grip: number;
  drifting: boolean;
  driftTime: number;
  /** Charge gained during the current drift, paid out as an event when it ends. */
  driftCharge: number;
  /** Boost meter, 0..1. */
  boost: number;
  boosting: boolean;
  braking: boolean;
  /** Radians the wheels have turned. */
  wheelSpin: number;
  /** Counts down after a respawn; the renderer flickers the car while it runs. */
  grace: number;
  stuckTime: number;
  wrongWayTime: number;
  /** Where this car is on the track (updated every step). */
  query: TrackQuery;
  /** Pose at the start of the last step, for render interpolation. */
  prev: { x: number; y: number; z: number; heading: number; steer: number; wheelSpin: number };
}

export function createVehicle(id: number): VehicleState {
  return {
    id,
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    yawRate: 0,
    steer: 0,
    speed: 0,
    accel: 0,
    grounded: true,
    grip: 1,
    drifting: false,
    driftTime: 0,
    driftCharge: 0,
    boost: 0,
    boosting: false,
    braking: false,
    wheelSpin: 0,
    grace: 0,
    stuckTime: 0,
    wrongWayTime: 0,
    query: newQuery(),
    prev: { x: 0, y: 0, z: 0, heading: 0, steer: 0, wheelSpin: 0 },
  };
}

/** Puts a car at rest on the ground and forgets its history. */
export function placeVehicle(v: VehicleState, x: number, z: number, heading: number, y = 0): void {
  v.x = x;
  v.y = y;
  v.z = z;
  v.heading = heading;
  v.vx = 0;
  v.vz = 0;
  v.vy = 0;
  v.yawRate = 0;
  v.steer = 0;
  v.speed = 0;
  v.accel = 0;
  v.grounded = true;
  v.drifting = false;
  v.driftTime = 0;
  v.driftCharge = 0;
  v.boosting = false;
  v.braking = false;
  v.stuckTime = 0;
  v.wrongWayTime = 0;
  snapshot(v);
}

/** Records the current pose as "previous" so the renderer does not smear a teleport. */
export function snapshot(v: VehicleState): void {
  v.prev.x = v.x;
  v.prev.y = v.y;
  v.prev.z = v.z;
  v.prev.heading = v.heading;
  v.prev.steer = v.steer;
  v.prev.wheelSpin = v.wheelSpin;
}

/** How much of gravity pulls along a slope: gentle, so hills are felt but never stop a small child's car. */
const HILL_PULL = 0.3;

export interface DriveOptions {
  /** Multiplies acceleration. */
  accelScale: number;
  /** Extra steering from the assist, already weighted (-1..1, positive turns right). */
  assistSteer: number;
  /** Slope of the ground along the car's heading (rise over run): uphill slows it, downhill speeds it. */
  slope?: number;
  /** Multiplies tyre grip (storms pull this below 1). */
  gripScale?: number;
  /** Multiplies steering yaw authority (storms pull this below 1). */
  yawScale?: number;
}

/**
 * Advances a car one fixed step on a flat plane: steering, throttle, braking,
 * drag, tyre grip, drifting, boost. Heading turns first, then the unchanged
 * world velocity is split into forward and sideways parts in the new frame
 * and the sideways part is damped by grip, which is what makes a turn feel
 * like a slide that tightens up rather than a train on rails.
 */
export function integrateDrive(v: VehicleState, input: Controls, p: VehicleParams, surface: SurfaceProps, opt: DriveOptions, dt: number): void {
  // Steering ramps toward the key state; letting go (or reversing direction) returns faster.
  const target = clamp(input.steer, -1, 1);
  const releasing = target === 0 || (v.steer !== 0 && Math.sign(target) !== Math.sign(v.steer));
  const rate = releasing ? p.steerReturn : p.steerRise;
  v.steer += clamp(target - v.steer, -rate * dt, rate * dt);
  const steerOut = clamp(v.steer + opt.assistSteer, -1, 1);

  // Boost: hold to burn the meter, but only start with a little in the tank.
  const wantBoost = input.boost && (v.boosting ? v.boost > 0 : v.boost >= p.boostMinToStart);
  if (wantBoost) v.boost = Math.max(0, v.boost - p.boostDrain * dt);
  v.boosting = wantBoost && v.boost > 0;

  // Drift: handbrake at speed. Grip drops, steering gets sharper, the meter charges.
  const fwdSpeed = v.vx * Math.sin(v.heading) + v.vz * Math.cos(v.heading);
  const absSpeed = Math.abs(fwdSpeed);
  const drifting = input.handbrake && v.grounded && absSpeed > p.driftMinSpeed;
  v.drifting = drifting;
  const weatherGrip = opt.gripScale ?? 1;
  const gripTarget = (drifting ? p.driftGrip : p.grip * surface.gripMult) * weatherGrip;
  v.grip = damp(v.grip, gripTarget, gripTarget < v.grip ? p.gripDrop : p.gripRecover, dt);

  // Yaw: no pivoting on the spot, full authority by `yawFullSpeed`, a little less at top speed.
  let authority = clamp01(absSpeed / p.yawFullSpeed);
  const high = clamp01((absSpeed - 0.55 * p.maxSpeed) / (0.45 * p.maxSpeed));
  authority *= 1 - p.yawHighSpeedLoss * high;
  if (drifting) authority *= p.yawDriftBoost;
  if (!v.grounded) authority *= p.airSteer;
  authority *= opt.yawScale ?? 1;
  const dir = fwdSpeed >= -0.3 ? 1 : -1;
  // Turning right means the heading decreases.
  const targetYaw = -steerOut * p.yawRate * authority * dir;
  v.yawRate = damp(v.yawRate, targetYaw, 14, dt);
  v.heading = wrapAngle(v.heading + v.yawRate * dt);

  // Re-express the world velocity in the new frame.
  const fx = Math.sin(v.heading);
  const fz = Math.cos(v.heading);
  const rx = -fz;
  const rz = fx;
  let vF = v.vx * fx + v.vz * fz;
  let vR = v.vx * rx + v.vz * rz;
  const vFBefore = vF;

  const top = p.maxSpeed * surface.speedMult * (v.boosting ? p.boostSpeedMult : 1);
  if (v.grounded) {
    const gas = input.throttle;
    const brake = input.brake;
    let a = 0;
    if (gas > 0) {
      if (vF >= 0) {
        const r = clamp01(vF / top);
        a += p.accel * surface.accelMult * opt.accelScale * (v.boosting ? p.boostAccelMult : 1) * gas * (1 - Math.pow(r, 2.2));
      } else {
        a += p.brakeDecel * gas;
      }
    }
    v.braking = false;
    if (brake > 0) {
      if (vF > 0.8) {
        a -= p.brakeDecel * brake;
        v.braking = true;
      } else if (gas === 0) {
        const r = clamp01(-vF / p.reverseSpeed);
        a -= p.reverseAccel * brake * (1 - r * r);
      }
    }
    vF += a * dt;
    if (opt.slope) vF -= opt.slope * GRAVITY * HILL_PULL * dt;
    if (gas === 0 && brake === 0) {
      const c = p.coastDecel * surface.dragMult * dt;
      vF -= clamp(vF, -c, c);
    }
    vF -= vF * p.drag * surface.dragMult * dt;
    if (vF > top) vF -= (vF - top) * p.overspeedDrag * dt;
    if (vF < -p.reverseSpeed) vF = -p.reverseSpeed;
    // Hard cornering scrubs a little speed, so lifting for a bend pays off.
    vF -= vF * p.turnDrag * Math.abs(steerOut) * dt;
    // Past a wide slip angle the tyres grab again, so a held drift becomes a controlled
    // slide round a curve instead of a spin-out.
    const slip = Math.atan2(Math.abs(vR), Math.abs(vF) + 1e-3);
    const gripNow = v.grip + (p.grip - v.grip) * smoothstep(p.slipCapStart, p.slipCapEnd, slip);
    // Grip turns the sideways part of the velocity toward where the car points: it does not delete it.
    // Only `slideLoss` of what is redirected is lost as tyre friction, so a drift stays fast.
    const vRAfter = vR * Math.exp(-gripNow * dt);
    const redirected = vR * vR - vRAfter * vRAfter;
    vF = (vF >= 0 ? 1 : -1) * Math.sqrt(vF * vF + redirected * (1 - p.slideLoss));
    vR = vRAfter;
  } else {
    // In the air: no grip, no drive, a touch of drag.
    vF -= vF * 0.01 * dt;
  }

  v.vx = fx * vF + rx * vR;
  v.vz = fz * vF + rz * vR;
  v.x += v.vx * dt;
  v.z += v.vz * dt;
  v.speed = vF;
  v.accel = (vF - vFBefore) / dt;
  v.wheelSpin += (vF / p.wheelRadius) * dt;

  // Drifting past a decent slip angle charges the boost meter.
  if (drifting && Math.abs(vR) > 2.5) {
    v.driftTime += dt;
    const gain = p.driftCharge * dt;
    const before = v.boost;
    v.boost = Math.min(1, v.boost + gain);
    v.driftCharge += v.boost - before;
  } else if (!drifting) {
    v.driftTime = 0;
  }
}

export interface VerticalResult {
  takeoff: boolean;
  landed: boolean;
  /** Downward speed at the moment of landing. */
  impact: number;
}

/**
 * Follows the ground height while grounded; leaves the ground when it falls
 * away faster than a car could drive down it (the end of a ramp), then flies
 * ballistically until it meets the ground again.
 */
export function integrateVertical(v: VehicleState, ground: number, dt: number, out: VerticalResult): void {
  out.takeoff = false;
  out.landed = false;
  out.impact = 0;
  if (v.grounded) {
    const dy = ground - v.y;
    if (dy < -(0.12 + Math.max(0, v.vy) * dt)) {
      v.grounded = false;
      out.takeoff = v.vy > 1;
    } else {
      v.vy = dy / dt;
      v.y = ground;
    }
  }
  if (!v.grounded) {
    v.vy -= GRAVITY * dt;
    v.y += v.vy * dt;
    if (v.y <= ground) {
      out.landed = true;
      out.impact = Math.max(0, -v.vy);
      v.y = ground;
      v.vy = 0;
      v.grounded = true;
    }
  }
}
