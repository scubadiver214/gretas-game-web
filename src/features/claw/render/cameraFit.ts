import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { CABINET } from "../config";

/** Share of the viewport covered by DOM HUD at the top and bottom (0..0.5). */
export interface ViewInsets {
  top: number;
  bottom: number;
}

/** Vertical field of view. Close enough to the kitchen camera that the machine reads at a similar scale. */
export const CAMERA_FOV = 36;

/** Look at the glass play area, slightly toward the player, so zooming in still shows the toys. */
export const TARGET = new Vector3(0, CABINET.height * 0.38, 0.15);

// Steep enough that a claw at the left glass sits over the left floor, not
// the middle of the pile. Kitchen uses a similar downward look.
const ELEVATION = MathUtils.degToRad(32);
const ELEVATION_TALL = MathUtils.degToRad(44);

/** How far the claw camera looks down: a little steeper on tall screens. */
export function elevationFor(aspect: number): number {
  const t = MathUtils.clamp((1.2 - aspect) / (1.2 - 0.55), 0, 1);
  return MathUtils.lerp(ELEVATION, ELEVATION_TALL, t);
}

/** NDC y-range left after the HUD overlays the top and bottom of the canvas. */
export function ndcBand(insets: ViewInsets): { lo: number; hi: number } {
  return {
    lo: -1 + 2 * insets.bottom + 0.01,
    hi: 1 - 2 * insets.top - 0.01,
  };
}

/** The glass box itself, used to measure how large the machine reads on screen. */
export function glassCorners(): Vector3[] {
  const hx = CABINET.width / 2;
  const hz = CABINET.depth / 2;
  const corners: Vector3[] = [];
  for (const x of [-hx, hx]) {
    for (const z of [-hz, hz]) {
      corners.push(new Vector3(x, 0, z), new Vector3(x, CABINET.height, z));
    }
  }
  return corners;
}

/**
 * World-space corners the camera must keep in frame: glass + marquee, tight to
 * the cabinet. The front control shelf may sit under the on-screen D-pad.
 */
export function machineFitCorners(): Vector3[] {
  const hx = CABINET.width / 2 + 0.04;
  // Keep the glass in frame. The marquee may tuck under the top HUD, and the
  // front control shelf may sit behind the on-screen D-pad — same trick the
  // kitchen camera uses so the play area stays large.
  const top = CABINET.height + 0.08;
  const y0 = 0.02;
  const zBack = -CABINET.depth / 2 + 0.05;
  const zFront = CABINET.depth / 2 + 0.05;
  const corners: Vector3[] = [];
  for (const x of [-hx, hx]) {
    for (const z of [zBack, zFront]) {
      corners.push(new Vector3(x, y0, z), new Vector3(x, top, z));
    }
  }
  return corners;
}

const TMP = new Vector3();

/** Pull the camera in until the machine fills the HUD-free band of the frame. */
export function fitCamera(camera: PerspectiveCamera, insets: ViewInsets): number {
  const dir = new Vector3(0, Math.sin(elevationFor(camera.aspect)), Math.cos(elevationFor(camera.aspect)));
  const corners = machineFitCorners();
  const { lo, hi } = ndcBand(insets);
  const fits = (d: number) => {
    camera.position.copy(TARGET).addScaledVector(dir, d);
    camera.lookAt(TARGET);
    camera.updateMatrixWorld();
    return corners.every((c) => {
      TMP.copy(c).project(camera);
      return Math.abs(TMP.x) <= 0.99 && TMP.y >= lo && TMP.y <= hi && TMP.z < 1;
    });
  };
  let a = 4;
  let b = 120;
  for (let i = 0; i < 32; i++) {
    const mid = (a + b) / 2;
    if (fits(mid)) b = mid;
    else a = mid;
  }
  fits(b);
  return b;
}
