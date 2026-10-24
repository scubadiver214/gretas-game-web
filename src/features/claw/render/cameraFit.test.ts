import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";
import { CABINET } from "../config";
import { RAIL_BOUNDS, aimOnFloor } from "../engine/claw";
import { MARQUEE_H } from "./meshes/cabinet";
import { CAMERA_FOV, TARGET, elevationFor, fitCamera, glassCorners, machineFitCorners, ndcBand } from "./cameraFit";

/** How much of the frame the real cabinet occupies after the camera is placed. */
function coverage(aspect: number, insets: { top: number; bottom: number }) {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 0.5, 200);
  fitCamera(camera, insets);
  const p = new Vector3();
  let maxX = 0;
  let minY = 1;
  let maxY = -1;
  for (const c of glassCorners()) {
    p.copy(c).project(camera);
    maxX = Math.max(maxX, Math.abs(p.x));
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const { lo, hi } = ndcBand(insets);
  return { maxX, minY, maxY, lo, hi, yFill: (maxY - minY) / (hi - lo) };
}

describe("claw camera fit", () => {
  it("fills most of a 16:9 desktop frame with the cabinet, like the kitchen view", () => {
    const c = coverage(16 / 9, { top: 0.07, bottom: 0.09 });
    expect(c.maxX).toBeGreaterThan(0.45);
    expect(c.yFill).toBeGreaterThan(0.82);
  });

  it("fills the width of a tall phone frame", () => {
    const c = coverage(9 / 16, { top: 0.12, bottom: 0.16 });
    expect(c.maxX).toBeGreaterThan(0.78);
  });

  it("keeps the glass inside the HUD band", () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.5, 200);
    const insets = { top: 0.07, bottom: 0.09 };
    fitCamera(camera, insets);
    const { lo, hi } = ndcBand(insets);
    const p = new Vector3();
    for (const c of machineFitCorners()) {
      p.copy(c).project(camera);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.995);
      expect(p.y).toBeGreaterThanOrEqual(lo - 0.02);
      expect(p.y).toBeLessThanOrEqual(hi + 0.02);
    }
  });

  it("looks down a bit more on tall screens so the floor stays large", () => {
    expect(elevationFor(16 / 9)).toBeLessThan(elevationFor(9 / 16));
  });

  it("puts a claw at the left glass over the left floor, not the middle of the pile", () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.5, 200);
    fitCamera(camera, { top: 0.07, bottom: 0.09 });
    const p = new Vector3();
    const clawHead = p.copy(new Vector3(RAIL_BOUNDS.minX, CABINET.height, 0)).project(camera).x;
    const floorLeft = p.copy(new Vector3(-CABINET.width / 2, 0, 0)).project(camera).x;
    const pileMiddle = p.copy(new Vector3(0, 0.04, 0)).project(camera).x;
    expect(Math.abs(clawHead - floorLeft)).toBeLessThan(0.22);
    expect(floorLeft).toBeLessThan(pileMiddle - 0.25);
  });

  it("aims at the play area, not empty sky above the marquee", () => {
    expect(TARGET.y).toBeGreaterThan(CABINET.height * 0.3);
    expect(TARGET.y).toBeLessThan(CABINET.height * 0.5 + MARQUEE_H);
  });

  it("a click on the left glass floor maps back to the left rail, not the pile", () => {
    const camera = new PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.5, 200);
    fitCamera(camera, { top: 0.07, bottom: 0.09 });
    const glass = new Vector3(-CABINET.width / 2, 0, 0.2);
    const ndc = glass.clone().project(camera);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(new Vector2(ndc.x, ndc.y), camera);
    const hit = raycaster.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
    expect(hit).not.toBeNull();
    const aim = aimOnFloor(hit!.x, hit!.z);
    expect(aim).not.toBeNull();
    expect(aim!.x).toBeCloseTo(-CABINET.width / 2, 1);
    expect(aim!.x).toBeLessThan(-2);
  });
});
