import { describe, expect, it } from "vitest";
import { VehicleAnimator, type AnimatorInput } from "./animator";

const DT = 1 / 60;

function input(over: Partial<AnimatorInput> = {}): AnimatorInput {
  return { accel: 0, yawRate: 0, speed: 20, grounded: true, vy: 0, slope: 0, bumpiness: 0, ...over };
}

function settle(a: VehicleAnimator, i: AnimatorInput, seconds = 1.5): void {
  for (let k = 0; k < seconds / DT; k++) a.update(DT, i);
}

describe("VehicleAnimator", () => {
  it("pitches the nose UP under power and DOWN under braking (negative rotation.x is nose-up)", () => {
    const power = new VehicleAnimator();
    settle(power, input({ accel: 18 }));
    expect(power.pitch).toBeLessThan(-0.03);
    const brake = new VehicleAnimator();
    settle(brake, input({ accel: -40 }));
    expect(brake.pitch).toBeGreaterThan(0.03);
  });

  it("leans the roof OUT of a corner: a right turn (negative yaw) rolls negative, a left turn positive", () => {
    const right = new VehicleAnimator();
    settle(right, input({ yawRate: -1.6 }));
    const left = new VehicleAnimator();
    settle(left, input({ yawRate: 1.6 }));
    expect(right.roll).toBeLessThan(-0.05);
    expect(left.roll).toBeGreaterThan(0.05);
  });

  it("keeps lean and pitch within sane limits however hard the input", () => {
    const a = new VehicleAnimator();
    settle(a, input({ accel: 500, yawRate: -20, speed: 80 }));
    expect(Math.abs(a.roll)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(a.pitch)).toBeLessThanOrEqual(0.2);
  });

  it("tips the nose up on a ramp and follows the arc of a jump", () => {
    const ramp = new VehicleAnimator();
    settle(ramp, input({ slope: 0.2 }));
    expect(ramp.pitch).toBeLessThan(-0.1);
    const rising = new VehicleAnimator();
    settle(rising, input({ grounded: false, vy: 6 }));
    const falling = new VehicleAnimator();
    settle(falling, input({ grounded: false, vy: -8 }));
    expect(rising.pitch).toBeLessThan(0);
    expect(falling.pitch).toBeGreaterThan(0);
  });

  it("bounces on rough ground and not on smooth ground", () => {
    const rough = new VehicleAnimator();
    const smooth = new VehicleAnimator();
    let roughRange = 0;
    let smoothRange = 0;
    for (let k = 0; k < 300; k++) {
      rough.update(DT, input({ bumpiness: 1, speed: 30 }));
      smooth.update(DT, input({ bumpiness: 0, speed: 30 }));
      roughRange = Math.max(roughRange, Math.abs(rough.bounce));
      smoothRange = Math.max(smoothRange, Math.abs(smooth.bounce));
    }
    expect(roughRange).toBeGreaterThan(0.01);
    expect(smoothRange).toBe(0);
    expect(rough.wheels.some((w) => w !== 0)).toBe(true);
  });

  it("thumps down after a landing and then settles", () => {
    const a = new VehicleAnimator();
    settle(a, input());
    a.land(14);
    let lowest = 0;
    for (let k = 0; k < 20; k++) {
      a.update(DT, input());
      lowest = Math.min(lowest, a.bounce);
    }
    expect(lowest).toBeLessThan(-0.03);
    settle(a, input(), 3);
    expect(Math.abs(a.bounce)).toBeLessThan(0.01);
  });

  it("lets the wheels hang while airborne", () => {
    const a = new VehicleAnimator();
    settle(a, input({ grounded: false, vy: 2 }));
    expect(a.wheels.every((w) => w < -0.05)).toBe(true);
  });

  it("does nothing for a zero or negative time step", () => {
    const a = new VehicleAnimator();
    a.update(0, input({ accel: 30 }));
    a.update(-1, input({ accel: 30 }));
    expect(a.pitch).toBe(0);
  });
});
