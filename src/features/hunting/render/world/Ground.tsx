"use client";

import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { buildTerrain } from "./terrain";

/** Lake basin, banks, hills and the mountain range, as one vertex-coloured mesh. */
export function Terrain({ lowPower }: { lowPower: boolean }) {
  const geometry = useMemo(
    () => buildTerrain({ rings: lowPower ? 110 : 170, segments: lowPower ? 260 : 420, radius: 1500, arc: (285 * Math.PI) / 180 }),
    [lowPower],
  );
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <mesh geometry={geometry} material={material} />;
}
