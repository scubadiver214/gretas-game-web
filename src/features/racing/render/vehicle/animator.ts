import { clamp, clamp01 } from "../../engine/math";

export interface AnimatorInput {
  /** Forward acceleration (u/s^2): squats and dives the nose. */
  accel: number;
  yawRate: number;
  /** Signed forward speed. */
  speed: number;
  grounded: boolean;
  /** Vertical speed, for pitching with a jump. */
  vy: number;
  /** Ground slope under the car (rise over run), for climbing ramps. */
  slope: number;
  /** 0..1: how rough the surface is. */
  bumpiness: number;
}

/**
 * Secondary motion for a car body: it dives under braking, squats under
 * power, leans out of corners, bounces over rough ground and thumps down after a
 * jump. All visual, driven by springs, and fed from the simulation's state. The
 * simulation never reads any of it.
 */
export class VehicleAnimator {
  bounce = 0;
  pitch = 0;
  roll = 0;
  /** Per-wheel suspension travel (front-left, front-right, rear-left, rear-right). */
  readonly wheels = [0, 0, 0, 0];

  private bounceV = 0;
  private pitchV = 0;
  private rollV = 0;
  private travelled = 0;

  /** Slam into the suspension after a landing. */
  land(impact: number): void {
    this.bounceV -= clamp(impact * 0.5, 0, 6);
    this.pitchV += clamp(impact * 0.03, 0, 0.5);
  }

  update(dt: number, i: AnimatorInput): void {
    if (dt <= 0) return;
    const speedAbs = Math.abs(i.speed);
    const speedFrac = clamp01(speedAbs / 40);

    let pitchTarget = clamp(-i.accel * 0.0062, -0.1, 0.1);
    if (i.grounded) pitchTarget += -Math.atan(i.slope) * 0.9;
    else pitchTarget += -Math.atan2(i.vy, Math.max(8, speedAbs)) * 0.55;
    // Lean out of the corner: a right turn (negative yaw) tips the roof to the left (negative roll).
    const rollTarget = clamp(i.yawRate * speedAbs * 0.0034, -0.15, 0.15);

    this.pitchV += ((pitchTarget - this.pitch) * 80 - this.pitchV * 9) * dt;
    this.pitch += this.pitchV * dt;
    this.rollV += ((rollTarget - this.roll) * 70 - this.rollV * 8.5) * dt;
    this.roll += this.rollV * dt;

    let forcing = 0;
    if (i.grounded) {
      this.travelled += speedAbs * dt;
      const d = this.travelled;
      // The ground's bumps are spaced in metres, so at speed they hit the suspension at a few hertz:
      // low enough for the body spring (about 2 Hz) to follow them, which is what makes a car feel alive.
      const noise = Math.sin(d * 0.35) * 0.5 + Math.sin(d * 0.8 + 1.3) * 0.3 + Math.sin(d * 1.4 + 0.4) * 0.2;
      forcing = noise * i.bumpiness * (0.3 + 0.7 * speedFrac) * 11;
      for (let w = 0; w < 4; w++) {
        const phase = (w < 2 ? 1.45 : -1.45) + (w % 2 ? 1.18 : -1.18) * 0.7;
        this.wheels[w] = (Math.sin((d + phase) * 1.7) * 0.6 + Math.sin((d + phase) * 3.4) * 0.4) * 0.05 * i.bumpiness * speedFrac;
      }
    } else {
      for (let w = 0; w < 4; w++) this.wheels[w] += (-0.08 - this.wheels[w]) * Math.min(1, dt * 8);
    }
    this.bounceV += (forcing - this.bounce * 150 - this.bounceV * 11) * dt;
    this.bounce += this.bounceV * dt;
    this.bounce = clamp(this.bounce, -0.25, 0.25);
  }
}
