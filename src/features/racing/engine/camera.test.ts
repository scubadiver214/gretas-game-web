import { describe, expect, it } from "vitest";
import { CAMERA } from "../config";
import { ChaseCamera, type CameraOptions, type CameraTarget, type CameraWorld } from "./camera";
import { angleDiff } from "./math";

const openWorld: CameraWorld = { clearance: () => 1, groundAt: () => 0 };

function opts(over: Partial<CameraOptions> = {}): CameraOptions {
  return { distanceScale: 1, reducedMotion: false, world: openWorld, ...over };
}

function target(over: Partial<CameraTarget> = {}): CameraTarget {
  return { x: 0, y: 0, z: 0, heading: 0, speed: 0, yawRate: 0, boosting: false, ...over };
}

describe("ChaseCamera", () => {
  it("snaps to rest behind and above the car, looking down the road", () => {
    const cam = new ChaseCamera();
    cam.snap(target(), opts());
    expect(cam.z).toBeCloseTo(-CAMERA.distance, 3);
    expect(cam.x).toBeCloseTo(0, 6);
    expect(cam.y).toBeCloseTo(CAMERA.height, 3);
    expect(cam.lookZ).toBeCloseTo(CAMERA.lookAhead, 6);
    expect(cam.fov).toBeCloseTo(CAMERA.baseFov, 6);
  });

  it("sits behind the car whichever way it faces", () => {
    const cam = new ChaseCamera();
    cam.snap(target({ heading: Math.PI / 2 }), opts());
    // Heading 90 degrees faces +x, so the camera is at -x.
    expect(cam.x).toBeCloseTo(-CAMERA.distance, 3);
    expect(Math.abs(cam.z)).toBeLessThan(1e-6);
  });

  it("opens the field of view with speed and settles back when slow", () => {
    const cam = new ChaseCamera();
    cam.snap(target(), opts());
    for (let i = 0; i < 120; i++) cam.update(1 / 60, target({ speed: 40 }), opts());
    expect(cam.fov).toBeGreaterThan(CAMERA.baseFov + 10);
    expect(cam.fov).toBeLessThanOrEqual(CAMERA.maxFov + 0.5);
    for (let i = 0; i < 240; i++) cam.update(1 / 60, target({ speed: 0 }), opts());
    expect(cam.fov).toBeCloseTo(CAMERA.baseFov, 0);
  });

  it("widens the view a bit more while boosting", () => {
    const a = new ChaseCamera();
    const b = new ChaseCamera();
    a.snap(target(), opts());
    b.snap(target(), opts());
    for (let i = 0; i < 180; i++) {
      a.update(1 / 60, target({ speed: 38 }), opts());
      b.update(1 / 60, target({ speed: 38, boosting: true }), opts());
    }
    expect(b.fov).toBeGreaterThan(a.fov + 3);
  });

  it("swings round behind a turning car over a moment, not instantly", () => {
    const cam = new ChaseCamera();
    cam.snap(target(), opts());
    const turned = target({ heading: Math.PI / 2 });
    cam.update(1 / 60, turned, opts());
    // One frame later the camera is still mostly behind the old heading...
    expect(cam.x).toBeGreaterThan(-3);
    for (let i = 0; i < 240; i++) cam.update(1 / 60, turned, opts());
    // ...and eventually fully behind the new one.
    expect(cam.x).toBeCloseTo(-CAMERA.distance, 1);
    expect(Math.abs(angleDiff(Math.atan2(-cam.x, -cam.z), Math.PI / 2))).toBeLessThan(0.05);
  });

  it("keeps a rigid distance at speed: no lag behind a moving car", () => {
    const cam = new ChaseCamera();
    cam.snap(target(), opts());
    let z = 0;
    for (let i = 0; i < 300; i++) {
      z += 38 / 60;
      cam.update(1 / 60, target({ z, speed: 38 }), opts());
    }
    const gap = z - cam.z;
    expect(gap).toBeGreaterThan(CAMERA.distance);
    expect(gap).toBeLessThan(CAMERA.distance + CAMERA.speedPull + 0.1);
  });

  it("tilts into a turn, and the other way for the other turn, within limits", () => {
    const right = new ChaseCamera();
    const left = new ChaseCamera();
    right.snap(target(), opts());
    left.snap(target(), opts());
    for (let i = 0; i < 120; i++) {
      right.update(1 / 60, target({ speed: 30, yawRate: -2 }), opts());
      left.update(1 / 60, target({ speed: 30, yawRate: 2 }), opts());
    }
    expect(Math.sign(right.roll)).toBe(-Math.sign(left.roll));
    expect(Math.abs(right.roll)).toBeGreaterThan(0.02);
    expect(Math.abs(right.roll)).toBeLessThanOrEqual(CAMERA.tiltMax + 1e-9);
  });

  it("goes calm under reduced motion: no tilt, no FOV punch, no shake", () => {
    const cam = new ChaseCamera();
    const calm = opts({ reducedMotion: true });
    cam.snap(target(), calm);
    cam.kick(1);
    for (let i = 0; i < 120; i++) cam.update(1 / 60, target({ speed: 40, yawRate: -2, boosting: true }), calm);
    expect(cam.roll).toBe(0);
    expect(cam.fov).toBeCloseTo(CAMERA.baseFov, 3);
    expect(cam.shakeX).toBe(0);
    expect(cam.shakeY).toBe(0);
  });

  it("shakes when kicked, and settles", () => {
    const cam = new ChaseCamera();
    cam.snap(target(), opts());
    cam.kick(0.8);
    cam.update(1 / 60, target(), opts());
    expect(Math.hypot(cam.shakeX, cam.shakeY)).toBeGreaterThan(0.02);
    for (let i = 0; i < 240; i++) cam.update(1 / 60, target(), opts());
    expect(cam.shakeX).toBe(0);
    expect(cam.shakeY).toBe(0);
  });

  it("stops short of an obstruction but never closer than the minimum distance", () => {
    const cam = new ChaseCamera();
    const half: CameraWorld = { clearance: () => 0.5, groundAt: () => 0 };
    cam.snap(target(), opts({ world: half }));
    expect(cam.z).toBeCloseTo(-CAMERA.distance * 0.5, 2);
    const blocked: CameraWorld = { clearance: () => 0, groundAt: () => 0 };
    cam.snap(target(), opts({ world: blocked }));
    expect(-cam.z).toBeGreaterThanOrEqual(CAMERA.minDistance - 1e-6);
  });

  it("never dips into the ground", () => {
    const cam = new ChaseCamera();
    const hill: CameraWorld = { clearance: () => 1, groundAt: () => 10 };
    cam.snap(target(), opts({ world: hill }));
    expect(cam.y).toBeGreaterThanOrEqual(11.4 - 1e-6);
  });

  it("follows a jump with a delay in height (airy), not rigidly", () => {
    const cam = new ChaseCamera();
    cam.snap(target(), opts());
    cam.update(1 / 60, target({ y: 4 }), opts());
    expect(cam.y).toBeLessThan(4 + CAMERA.height - 0.5);
    for (let i = 0; i < 240; i++) cam.update(1 / 60, target({ y: 4 }), opts());
    expect(cam.y).toBeCloseTo(4 + CAMERA.height, 1);
  });

  it("scales its distance with the player's camera setting", () => {
    const close = new ChaseCamera();
    const far = new ChaseCamera();
    close.snap(target(), opts({ distanceScale: 0.78 }));
    far.snap(target(), opts({ distanceScale: 1.28 }));
    expect(-far.z).toBeGreaterThan(-close.z * 1.4);
  });

  it("orbits the target for the menu and hands over to the chase camera smoothly", () => {
    const cam = new ChaseCamera();
    cam.orbit(target(), 0, 9, 3);
    expect(cam.z).toBeCloseTo(9, 6);
    expect(cam.y).toBeCloseTo(3, 6);
    expect(cam.lookZ).toBe(0);
    // Chase starts from the orbit bearing: first frame is still on that side of the car.
    cam.update(1 / 60, target(), opts());
    expect(cam.z).toBeGreaterThan(0);
  });
});
