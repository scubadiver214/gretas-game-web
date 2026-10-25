import { describe, expect, it } from "vitest";
import { BUGGY, GRAVITY, SURFACES } from "../config";
import { neutralControls, type Controls, type SurfaceProps } from "../types";
import { angleDiff } from "./math";
import { createVehicle, integrateDrive, integrateVertical, placeVehicle, type DriveOptions, type VehicleState, type VerticalResult } from "./vehicle";

const DT = 1 / 60;
const road = SURFACES.dirt;
const sand = SURFACES.sand;

function ctl(c: Partial<Controls>): Controls {
  return { ...neutralControls(), ...c };
}

/** A car pointing +z at the origin, optionally already moving. */
function car(speed = 0): VehicleState {
  const v = createVehicle(0);
  placeVehicle(v, 0, 0, 0);
  v.vz = speed;
  v.speed = speed;
  v.grip = BUGGY.grip;
  return v;
}

function run(v: VehicleState, c: Controls, seconds: number, surface: SurfaceProps = road, assistSteer = 0, extra: Partial<DriveOptions> = {}): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) integrateDrive(v, c, BUGGY, surface, { accelScale: 1, assistSteer, ...extra }, DT);
}

/** Right of a car with heading h is (-cos h, sin h). */
function lateralOf(v: VehicleState, h = 0): number {
  return v.x * -Math.cos(h) + v.z * Math.sin(h);
}

describe("acceleration and braking", () => {
  it("accelerates smoothly from rest toward top speed without exceeding it", () => {
    const v = car();
    let last = 0;
    for (let i = 0; i < 60 * 12; i++) {
      integrateDrive(v, ctl({ throttle: 1 }), BUGGY, road, { accelScale: 1, assistSteer: 0 }, DT);
      expect(v.speed).toBeGreaterThanOrEqual(last - 1e-9);
      expect(v.speed).toBeLessThanOrEqual(BUGGY.maxSpeed + 1e-6);
      last = v.speed;
    }
    expect(last).toBeGreaterThan(BUGGY.maxSpeed * 0.95);
  });

  it("pulls harder when slow than near top speed", () => {
    const slow = car(2);
    const fast = car(BUGGY.maxSpeed * 0.9);
    run(slow, ctl({ throttle: 1 }), 0.1);
    run(fast, ctl({ throttle: 1 }), 0.1);
    expect(slow.speed - 2).toBeGreaterThan(fast.speed - BUGGY.maxSpeed * 0.9);
  });

  it("gentle acceleration (assist) is slower", () => {
    const normal = car();
    const gentle = car();
    for (let i = 0; i < 60; i++) {
      integrateDrive(normal, ctl({ throttle: 1 }), BUGGY, road, { accelScale: 1, assistSteer: 0 }, DT);
      integrateDrive(gentle, ctl({ throttle: 1 }), BUGGY, road, { accelScale: 0.85, assistSteer: 0 }, DT);
    }
    expect(gentle.speed).toBeLessThan(normal.speed);
  });

  it("coasts to a stop without the throttle", () => {
    const v = car(30);
    run(v, neutralControls(), 1);
    expect(v.speed).toBeLessThan(30);
    expect(v.speed).toBeGreaterThan(20);
    run(v, neutralControls(), 20);
    expect(v.speed).toBeCloseTo(0, 1);
  });

  it("brakes hard and stops before it reverses", () => {
    const v = car(30);
    run(v, ctl({ brake: 1 }), 0.5);
    // 46 u/s^2 of braking: well slowed, still rolling forward, never negative yet.
    expect(v.speed).toBeGreaterThan(1);
    expect(v.speed).toBeLessThan(10);
    run(v, ctl({ brake: 1 }), 0.3);
    // Holding the brake past a standstill gently reverses.
    expect(v.speed).toBeLessThan(1);
    expect(v.speed).toBeGreaterThan(-5);
  });

  it("reverses when braking from a standstill, up to the reverse limit", () => {
    const v = car();
    run(v, ctl({ brake: 1 }), 4);
    expect(v.speed).toBeLessThan(-5);
    expect(v.speed).toBeGreaterThanOrEqual(-BUGGY.reverseSpeed - 1e-9);
  });

  it("brakes before reversing when the gas is released into the brake", () => {
    const v = car(20);
    let minSpeedWhileBraking = Infinity;
    for (let i = 0; i < 40; i++) {
      integrateDrive(v, ctl({ brake: 1 }), BUGGY, road, { accelScale: 1, assistSteer: 0 }, DT);
      if (v.speed > 0.8) minSpeedWhileBraking = Math.min(minSpeedWhileBraking, v.speed);
    }
    expect(minSpeedWhileBraking).toBeGreaterThan(0);
    expect(v.braking || v.speed <= 0.8).toBe(true);
  });
});

describe("steering", () => {
  it("steers right toward the driver's right and left toward the left", () => {
    const right = car(25);
    run(right, ctl({ throttle: 1, steer: 1 }), 1);
    expect(lateralOf(right)).toBeGreaterThan(2);
    expect(angleDiff(right.heading, 0)).toBeLessThan(-0.3);

    const left = car(25);
    run(left, ctl({ throttle: 1, steer: -1 }), 1);
    expect(lateralOf(left)).toBeLessThan(-2);
    expect(angleDiff(left.heading, 0)).toBeGreaterThan(0.3);
  });

  it("cannot pivot on the spot: no steering at a standstill", () => {
    const v = car();
    run(v, ctl({ steer: 1 }), 1);
    expect(v.heading).toBe(0);
  });

  it("turns tighter at medium speed than crawling, and a little slower at top speed", () => {
    const rate = (speed: number) => {
      const v = car(speed);
      run(v, ctl({ throttle: speed > 20 ? 1 : 0, steer: 1 }), 0.5);
      return Math.abs(v.yawRate);
    };
    expect(rate(2)).toBeLessThan(rate(12) * 0.6);
    expect(rate(BUGGY.maxSpeed)).toBeLessThan(rate(0.55 * BUGGY.maxSpeed));
    expect(rate(BUGGY.maxSpeed)).toBeGreaterThan(rate(0.55 * BUGGY.maxSpeed) * 0.5);
  });

  it("ramps steering in and out instead of snapping", () => {
    const v = car(20);
    integrateDrive(v, ctl({ steer: 1 }), BUGGY, road, { accelScale: 1, assistSteer: 0 }, DT);
    expect(v.steer).toBeGreaterThan(0);
    expect(v.steer).toBeLessThan(0.2);
    run(v, ctl({ steer: 1 }), 1);
    expect(v.steer).toBeCloseTo(1, 3);
    run(v, ctl({ steer: 0 }), 0.05);
    expect(v.steer).toBeLessThan(1);
    expect(v.steer).toBeGreaterThan(0);
    run(v, ctl({ steer: 0 }), 1);
    expect(v.steer).toBeCloseTo(0, 3);
  });

  it("steers in reverse the way a real car does (the nose swings the other way)", () => {
    const fwd = car(8);
    run(fwd, ctl({ steer: 1, throttle: 1 }), 0.4);
    const back = car(-8);
    run(back, ctl({ steer: 1, brake: 1 }), 0.4);
    expect(Math.sign(fwd.yawRate)).toBe(-Math.sign(back.yawRate));
  });

  it("adds assist steering on top of the player's, and clamps the total", () => {
    const a = car(25);
    run(a, ctl({ throttle: 1, steer: 0 }), 0.5, road, 0.6);
    expect(a.heading).toBeLessThan(-0.05);
    // Full lock plus full assist cannot turn harder than the car is able to.
    const b = car(25);
    run(b, ctl({ throttle: 1, steer: 1 }), 0.5, road, 1);
    expect(Math.abs(b.yawRate)).toBeLessThanOrEqual(BUGGY.yawRate + 1e-9);
    expect(Math.abs(b.yawRate)).toBeGreaterThan(1);
  });

  it("keeps travelling roughly where it points: grip pulls the velocity round", () => {
    const v = car(25);
    run(v, ctl({ throttle: 1, steer: 1 }), 1.5);
    const velHeading = Math.atan2(v.vx, v.vz);
    expect(Math.abs(angleDiff(velHeading, v.heading))).toBeLessThan(0.3);
  });
});

describe("drifting and boost", () => {
  it("handbrake plus steering slides: more sideways velocity and a tighter turn", () => {
    const grip = car(30);
    run(grip, ctl({ throttle: 1, steer: 1 }), 0.8);
    const drift = car(30);
    run(drift, ctl({ throttle: 1, steer: 1, handbrake: true }), 0.8);
    const slip = (v: VehicleState) => Math.abs(angleDiff(Math.atan2(v.vx, v.vz), v.heading));
    expect(drift.drifting).toBe(true);
    expect(slip(drift)).toBeGreaterThan(slip(grip) + 0.1);
    expect(Math.abs(drift.heading)).toBeGreaterThan(Math.abs(grip.heading));
  });

  it("cannot be spun out by holding the handbrake at full lock: the slip angle is capped", () => {
    const v = car(30);
    let worstSlip = 0;
    for (let i = 0; i < 60 * 4; i++) {
      integrateDrive(v, ctl({ throttle: 1, steer: 1, handbrake: true }), BUGGY, road, { accelScale: 1, assistSteer: 0 }, DT);
      if (Math.hypot(v.vx, v.vz) > 6) worstSlip = Math.max(worstSlip, Math.abs(angleDiff(Math.atan2(v.vx, v.vz), v.heading)));
    }
    expect(worstSlip).toBeLessThan(1.25);
    // And it keeps moving: a drift is a slide, not a stop.
    expect(Math.hypot(v.vx, v.vz)).toBeGreaterThan(8);
  });

  it("keeps its speed through a drift: sliding redirects momentum, it does not throw it away", () => {
    const v = car(32);
    run(v, ctl({ throttle: 1, steer: 1, handbrake: true }), 1);
    expect(v.drifting).toBe(true);
    const ground = Math.hypot(v.vx, v.vz);
    // A full second of handbrake slide at full lock still carries most of the speed.
    expect(ground).toBeGreaterThan(32 * 0.78);
  });

  it("does not gain speed from gripping: total ground speed never rises while coasting through a turn", () => {
    const v = car(30);
    let last = Math.hypot(v.vx, v.vz);
    for (let i = 0; i < 90; i++) {
      integrateDrive(v, ctl({ steer: 1 }), BUGGY, road, { accelScale: 1, assistSteer: 0 }, DT);
      const now = Math.hypot(v.vx, v.vz);
      expect(now).toBeLessThanOrEqual(last + 1e-6);
      last = now;
    }
  });

  it("does not drift when slow, and regains grip after letting go", () => {
    const slow = car(5);
    run(slow, ctl({ steer: 1, handbrake: true }), 0.5);
    expect(slow.drifting).toBe(false);
    const v = car(30);
    run(v, ctl({ throttle: 1, steer: 1, handbrake: true }), 1);
    expect(v.grip).toBeLessThan(BUGGY.grip * 0.5);
    run(v, ctl({ throttle: 1 }), 2);
    expect(v.grip).toBeGreaterThan(BUGGY.grip * 0.9);
    expect(v.drifting).toBe(false);
  });

  it("charges the boost meter while drifting and not while gripping", () => {
    const drift = car(30);
    run(drift, ctl({ throttle: 1, steer: 1, handbrake: true }), 2);
    expect(drift.boost).toBeGreaterThan(0.15);
    const grip = car(30);
    run(grip, ctl({ throttle: 1, steer: 1 }), 2);
    expect(grip.boost).toBe(0);
  });

  it("boosts past the normal top speed and drains the meter at the set rate", () => {
    const v = car();
    v.boost = 1;
    run(v, ctl({ throttle: 1, boost: true }), 1);
    expect(v.boosting).toBe(true);
    expect(v.boost).toBeCloseTo(1 - BUGGY.boostDrain, 1);
    run(v, ctl({ throttle: 1, boost: true }), 1.2);
    expect(v.speed).toBeGreaterThan(BUGGY.maxSpeed);
    expect(v.speed).toBeLessThanOrEqual(BUGGY.maxSpeed * BUGGY.boostSpeedMult + 1e-6);
    run(v, ctl({ throttle: 1, boost: true }), 1);
    expect(v.boost).toBe(0);
    expect(v.boosting).toBe(false);
  });

  it("will not start boosting on an almost-empty meter, and falls back to normal top speed", () => {
    const v = car();
    v.boost = BUGGY.boostMinToStart / 2;
    run(v, ctl({ throttle: 1, boost: true }), 0.3);
    expect(v.boosting).toBe(false);
    expect(v.boost).toBeCloseTo(BUGGY.boostMinToStart / 2, 6);
    const w = car(BUGGY.maxSpeed * BUGGY.boostSpeedMult);
    run(w, ctl({ throttle: 1 }), 8);
    expect(w.speed).toBeLessThan(BUGGY.maxSpeed * 1.02);
  });
});

describe("storm grip", () => {
  const slip = (v: VehicleState) => Math.abs(angleDiff(Math.atan2(v.vx, v.vz), v.heading));

  it("slides more when the weather cuts tyre grip", () => {
    const dry = car(30);
    run(dry, ctl({ throttle: 1, steer: 1 }), 0.8);
    const wet = car(30);
    run(wet, ctl({ throttle: 1, steer: 1 }), 0.8, road, 0, { gripScale: 0.7 });
    expect(slip(wet)).toBeGreaterThan(slip(dry));
    expect(wet.grip).toBeLessThan(dry.grip);
  });

  it("turns less tightly when the weather cuts steering bite", () => {
    const dry = car(30);
    run(dry, ctl({ throttle: 1, steer: 1 }), 0.8);
    const wet = car(30);
    run(wet, ctl({ throttle: 1, steer: 1 }), 0.8, road, 0, { yawScale: 0.86 });
    expect(Math.abs(wet.heading)).toBeLessThan(Math.abs(dry.heading));
    expect(Math.abs(wet.yawRate)).toBeLessThan(Math.abs(dry.yawRate));
  });
});

describe("surfaces", () => {
  it("slows the car on sand", () => {
    const dirt = car();
    const off = car();
    run(dirt, ctl({ throttle: 1 }), 10, road);
    run(off, ctl({ throttle: 1 }), 10, sand);
    expect(off.speed).toBeLessThan(dirt.speed * 0.7);
    expect(off.speed).toBeLessThanOrEqual(BUGGY.maxSpeed * sand.speedMult + 1);
  });

  it("slows smoothly when it drives onto sand at speed rather than stopping dead", () => {
    const v = car(BUGGY.maxSpeed);
    run(v, ctl({ throttle: 1 }), 0.2, sand);
    expect(v.speed).toBeGreaterThan(BUGGY.maxSpeed * 0.8);
    run(v, ctl({ throttle: 1 }), 4, sand);
    expect(v.speed).toBeLessThan(BUGGY.maxSpeed * 0.7);
  });
});

describe("jumps", () => {
  const out: VerticalResult = { takeoff: false, landed: false, impact: 0 };

  it("follows rising ground, leaves it when the ground drops away, and lands", () => {
    const v = car(30);
    // Climb a ramp rising 5.4 u/s (slope .18 at 30 u/s), then the ground falls to 0.
    let ground = 0;
    for (let i = 0; i < 40; i++) {
      ground += 0.18 * 30 * DT;
      integrateVertical(v, ground, DT, out);
      expect(v.grounded).toBe(true);
      expect(v.y).toBeCloseTo(ground, 6);
    }
    expect(v.vy).toBeGreaterThan(4);
    let tookOff = false;
    let landed = false;
    let apex = v.y;
    let airFrames = 0;
    for (let i = 0; i < 200 && !landed; i++) {
      integrateVertical(v, 0, DT, out);
      tookOff = tookOff || out.takeoff;
      landed = out.landed;
      apex = Math.max(apex, v.y);
      if (!v.grounded) airFrames++;
    }
    expect(tookOff).toBe(true);
    expect(landed).toBe(true);
    expect(out.impact).toBeGreaterThan(3);
    expect(apex).toBeGreaterThan(ground);
    // Roughly the ballistic flight time: v up, falls from height `ground`.
    const vy0 = 0.18 * 30;
    const t = (vy0 + Math.sqrt(vy0 * vy0 + 2 * GRAVITY * ground)) / GRAVITY;
    expect(airFrames * DT).toBeCloseTo(t, 1);
    expect(v.y).toBe(0);
    expect(v.grounded).toBe(true);
  });

  it("stays glued to flat ground", () => {
    const v = car(30);
    for (let i = 0; i < 100; i++) integrateVertical(v, 0, DT, out);
    expect(v.grounded).toBe(true);
    expect(v.y).toBe(0);
  });

  it("has almost no steering and no grip in the air", () => {
    const v = car(30);
    v.grounded = false;
    v.y = 3;
    run(v, ctl({ steer: 1, throttle: 1 }), 0.3);
    const ground = car(30);
    run(ground, ctl({ steer: 1, throttle: 1 }), 0.3);
    expect(Math.abs(v.yawRate)).toBeLessThan(Math.abs(ground.yawRate) * 0.5);
  });
});
