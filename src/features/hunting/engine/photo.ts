import type { PhotoResult, SpeciesId, Vec3 } from "../types";
import { aimBasis, type Aim } from "./aim";
import { dot, len, sub } from "./vec";

export interface PhotoSubject {
  species: SpeciesId;
  center: Vec3;
  radius: number;
  /** Flying, diving or hopping: worth a little extra. */
  action: boolean;
}

/** Fill (subject height / frame height) needed for 2 and 3 stars. */
export const PHOTO_FILL = { two: 0.04, three: 0.1, tooSmall: 0.015 } as const;
/** How central (1 = dead centre) the subject must be for 2 and 3 stars. */
export const PHOTO_CENTER = { two: 0.5, three: 0.72 } as const;

const NOTHING: PhotoResult = { species: null, stars: 0, centered: 0, fill: 0, action: false, tip: "No animal in this one. Point the camera at an animal and try again!" };

/**
 * Scores a photo: finds the best-framed animal (central and big in the frame) and
 * gives it 1-3 stars. `vFov` is in radians; `aspect` is width / height.
 */
export function evaluatePhoto(eye: Vec3, aim: Aim, vFov: number, aspect: number, subjects: readonly PhotoSubject[]): PhotoResult {
  const { forward, right, up } = aimBasis(aim);
  const tanV = Math.tan(vFov / 2);
  const tanH = tanV * aspect;
  let best: { s: PhotoSubject; centered: number; fill: number; q: number } | null = null;
  for (const s of subjects) {
    const to = sub(s.center, eye);
    const depth = dot(to, forward);
    if (depth <= 0.5) continue;
    const nx = dot(to, right) / depth / tanH;
    const ny = dot(to, up) / depth / tanV;
    if (Math.abs(nx) > 1 || Math.abs(ny) > 1) continue;
    const distance = len(to);
    const fill = (2 * s.radius) / distance / (2 * tanV);
    const centered = Math.max(0, 1 - Math.hypot(nx, ny));
    const q = centered * 0.5 + Math.min(1, fill / 0.25) * 0.5 + (s.action ? 0.08 : 0);
    if (!best || q > best.q) best = { s, centered, fill, q };
  }
  if (!best) return NOTHING;
  const { s, centered, fill } = best;
  let stars: 1 | 2 | 3 = 1;
  if (centered >= PHOTO_CENTER.three && fill >= PHOTO_FILL.three) stars = 3;
  else if (centered >= PHOTO_CENTER.two && fill >= PHOTO_FILL.two) stars = 2;
  let tip = "";
  if (stars === 3) tip = s.action ? "Amazing action shot!" : "Picture perfect!";
  else if (fill < PHOTO_FILL.two) tip = fill < PHOTO_FILL.tooSmall ? "It's tiny! Zoom in to get closer." : "Nice! Zoom in for a bigger picture.";
  else if (centered < PHOTO_CENTER.three) tip = "Nice! Put the animal in the middle for 3 stars.";
  else tip = "Great shot! Zoom in a little more for 3 stars.";
  return { species: s.species, stars, centered, fill, action: s.action, tip };
}
