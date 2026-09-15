"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { MathUtils, type PerspectiveCamera } from "three";

/**
 * Computes how far the camera must sit so `fitWidth` world units are visible
 * horizontally at the target plane. Portrait phones get a longer distance,
 * landscape/desktop clamps at `minDistance`.
 */
export function fitDistance(aspect: number, vfovDeg: number, fitWidth: number, minDistance: number): number {
  const halfV = Math.tan(MathUtils.degToRad(vfovDeg / 2));
  return Math.max(minDistance, fitWidth / (2 * aspect * halfV));
}

interface FitCameraProps {
  /** World units that must be visible horizontally at the target. */
  fitWidth: number;
  /** Vertical field of view in degrees. */
  vfov?: number;
  /** Never come closer than this (keeps desktop framing sane). */
  minDistance?: number;
  /** Point the camera orbits around / looks at. */
  target?: [number, number, number];
  /** Camera elevation above the target, in degrees. */
  elevationDeg?: number;
}

export default function FitCamera({
  fitWidth,
  vfov = 50,
  minDistance = 4.5,
  target = [0, 0, 0],
  elevationDeg = 30,
}: FitCameraProps) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);
  const [tx, ty, tz] = target;

  useEffect(() => {
    // Read the camera from the store inside the effect: it is a mutable three.js
    // object owned by R3F, not derived React state.
    const camera = get().camera as PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const d = fitDistance(aspect, vfov, fitWidth, minDistance);
    const elev = MathUtils.degToRad(elevationDeg);
    camera.fov = vfov;
    camera.position.set(tx, ty + Math.sin(elev) * d, tz + Math.cos(elev) * d);
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
  }, [get, size, fitWidth, vfov, minDistance, elevationDeg, tx, ty, tz]);

  return null;
}
