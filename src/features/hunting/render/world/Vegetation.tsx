"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Euler, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type BufferGeometry } from "three";
import { KINGFISHER_PERCH, LILY_PADS, REED_BEDS, TURTLE_LOG } from "../../config";
import { lakeDist } from "../../engine/lake";
import { rand } from "../geo";
import { broadleaf, bush, conifer, grassTuft, lilyFlower, lilyPad, palm, reedClump, rock, snag, turtleLog, windify, type WindUniform } from "./flora";
import { terrainHeight, terrainSlope } from "./terrain";

interface Spot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  tilt?: number;
}

interface Scatter {
  count: number;
  yaw: readonly [number, number];
  dist: readonly [number, number];
  lake: readonly [number, number];
  maxHeight?: number;
  minHeight?: number;
  maxSlope?: number;
  scale: readonly [number, number];
  sink?: number;
  /** Bigger with distance so far trees still read. */
  grow?: number;
}

function scatter(seed: number, s: Scatter): Spot[] {
  const r = rand(seed);
  const out: Spot[] = [];
  for (let tries = 0; out.length < s.count && tries < s.count * 40; tries++) {
    const yaw = s.yaw[0] + (s.yaw[1] - s.yaw[0]) * r();
    const d = s.dist[0] + (s.dist[1] - s.dist[0]) * Math.pow(r(), 0.8);
    const x = -Math.sin(yaw) * d;
    const z = -Math.cos(yaw) * d;
    const ld = lakeDist(x, z);
    if (ld < s.lake[0] || ld > s.lake[1]) continue;
    const y = terrainHeight(x, z);
    if (s.maxHeight !== undefined && y > s.maxHeight) continue;
    if (s.minHeight !== undefined && y < s.minHeight) continue;
    if (s.maxSlope !== undefined && terrainSlope(x, z) > s.maxSlope) continue;
    const grow = 1 + (s.grow ?? 0) * (d / s.dist[1]);
    out.push({ x, y: y - (s.sink ?? 0.1), z, yaw: r() * Math.PI * 2, scale: (s.scale[0] + (s.scale[1] - s.scale[0]) * r()) * grow });
  }
  return out;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();

function instanced(geometry: BufferGeometry, material: MeshStandardMaterial, spots: Spot[]): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, spots.length));
  spots.forEach((s, i) => {
    _q.setFromEuler(_e.set(s.tilt ?? 0, s.yaw, 0));
    mesh.setMatrixAt(i, _m.compose(_p.set(s.x, s.y, s.z), _q, _s.setScalar(s.scale)));
  });
  mesh.count = spots.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

const mat = (o: Partial<{ side: typeof DoubleSide; flat: boolean; rough: number }> = {}) =>
  new MeshStandardMaterial({
    vertexColors: true,
    roughness: o.rough ?? 0.92,
    metalness: 0,
    ...(o.side !== undefined ? { side: o.side } : {}),
    ...(o.flat ? { flatShading: true } : {}),
  });

function setWind(wind: WindUniform, t: number): void {
  wind.value = t;
}

/** Everything that grows (and the odd rock and log) around Peaceful Lakeside. */
export function Vegetation({ lowPower }: { lowPower: boolean }) {
  const wind = useMemo<WindUniform>(() => ({ value: 0 }), []);
  const root = useMemo(() => {
    const group = new Group();
    const r = rand(77);
    const add = (geo: BufferGeometry, m: MeshStandardMaterial, spots: Spot[]) => {
      if (spots.length) group.add(instanced(geo, m, spots));
      else geo.dispose();
    };
    const k = lowPower ? 0.55 : 1;

    // Palms along the shore, a few leaning out over the water like the reference shot.
    const palmSpots = scatter(11, { count: Math.round(70 * k), yaw: [-1.9, 1.9], dist: [28, 320], lake: [1.006, 1.09], maxHeight: 4, scale: [0.85, 1.25], sink: 0.2, grow: 0.5 });
    const palmMat = windify(mat({ side: DoubleSide }), wind, 0.22, 10);
    [palm(r, 8.5, 1.4), palm(r, 10.5, -1.1), palm(r, 7.2, 2.0)].forEach((g, i) => add(g, palmMat, palmSpots.filter((_, j) => j % 3 === i)));

    add(broadleaf(r), windify(mat(), wind, 0.06, 6), scatter(12, { count: Math.round(240 * k), yaw: [-2.1, 2.1], dist: [40, 560], lake: [1.06, 1.9], maxHeight: 30, scale: [0.8, 1.35], grow: 1.2 }));
    add(
      conifer(r),
      mat(),
      scatter(13, { count: Math.round(1300 * k), yaw: [-2.2, 2.2], dist: [90, 950], lake: [1.4, 3.8], minHeight: 3, maxHeight: 190, maxSlope: 0.5, scale: [0.9, 1.5], grow: 1.6 }),
    );
    add(bush(r), mat(), scatter(14, { count: Math.round(170 * k), yaw: [-2.0, 2.0], dist: [9, 220], lake: [1.012, 1.25], scale: [0.7, 1.4] }));
    add(rock(r), mat({ flat: true }), scatter(15, { count: 46, yaw: [-1.9, 1.9], dist: [5, 140], lake: [0.982, 1.06], scale: [0.25, 0.9], sink: 0.15 }));

    // Grass on the bank: short in front of the player so the lake stays in view, longer off to the sides.
    const grassMat = windify(mat({ side: DoubleSide }), wind, 0.13, 0.6);
    add(grassTuft(r), grassMat, scatter(16, { count: Math.round(1400 * k), yaw: [-1.9, 1.9], dist: [2.2, 9], lake: [1.004, 9], maxHeight: 5, scale: [0.45, 0.85], sink: 0.02 }));
    add(grassTuft(r, 11), grassMat, scatter(21, { count: Math.round(1800 * k), yaw: [-1.9, 1.9], dist: [9, 34], lake: [1.004, 9], maxHeight: 5, scale: [0.8, 1.6], sink: 0.02 }));
    add(grassTuft(r, 13), grassMat, scatter(22, { count: Math.round(500 * k), yaw: [0.35, 1.6], dist: [2.5, 12], lake: [1.004, 9], maxHeight: 5, scale: [0.9, 1.5], sink: 0.02 }));
    add(grassTuft(r, 12), grassMat, scatter(17, { count: Math.round(700 * k), yaw: [-1.9, 1.9], dist: [16, 120], lake: [1.0, 1.04], scale: [1.3, 2.2], sink: 0.02 }));

    // Reed beds the ducks burst out of, and reeds along the waterline.
    const reedSpots: Spot[] = [];
    const rr = rand(18);
    for (const bed of REED_BEDS) {
      for (let i = 0; i < 12; i++) {
        const a = rr() * Math.PI * 2;
        const d = Math.sqrt(rr()) * 3.4;
        reedSpots.push({ x: bed.x + Math.cos(a) * d, y: -0.15, z: bed.z + Math.sin(a) * d, yaw: rr() * 6.3, scale: 0.9 + rr() * 0.5 });
      }
    }
    reedSpots.push(...scatter(19, { count: Math.round(110 * k), yaw: [-1.9, 1.9], dist: [7, 160], lake: [0.972, 1.006], scale: [0.7, 1.2], sink: 0.15 }));
    const reedGeoA = reedClump(r);
    const reedGeoB = reedClump(r, 12, 2);
    const reedMat = windify(mat({ side: DoubleSide }), wind, 0.2, 2.2);
    add(reedGeoA, reedMat, reedSpots.filter((_, i) => i % 2 === 0));
    add(reedGeoB, reedMat, reedSpots.filter((_, i) => i % 2 === 1));

    // Lily pads off the left bank (the frog's) and around the reed beds.
    const lr = rand(20);
    const pads: Spot[] = LILY_PADS.map((p) => ({ x: p.x, y: 0.015, z: p.z, yaw: lr() * 6.3, scale: 0.9 + lr() * 0.4 }));
    for (let i = 0; pads.length < 60 && i < 400; i++) {
      const x = -14 + lr() * 13;
      const z = -6 - lr() * 13;
      if (lakeDist(x, z) > 0.985) continue;
      pads.push({ x, y: 0.012, z, yaw: lr() * 6.3, scale: 0.6 + lr() * 0.6 });
    }
    for (const bed of REED_BEDS) {
      for (let i = 0; i < 4; i++) pads.push({ x: bed.x + (lr() - 0.5) * 9, y: 0.012, z: bed.z + 3 + lr() * 3, yaw: lr() * 6.3, scale: 0.7 + lr() * 0.5 });
    }
    add(lilyPad(), mat({ side: DoubleSide, rough: 0.55 }), pads);
    add(
      lilyFlower(),
      mat(),
      pads.filter((_, i) => i % 7 === 3).map((p) => ({ ...p, x: p.x + 0.12, y: 0.02 })),
    );

    const log = new Mesh(turtleLog(TURTLE_LOG.length), mat());
    log.position.set(TURTLE_LOG.x, 0.1, TURTLE_LOG.z);
    log.rotation.y = TURTLE_LOG.yaw;
    group.add(log);
    const perch = new Mesh(snag(KINGFISHER_PERCH.y), mat());
    perch.position.set(KINGFISHER_PERCH.x, 0, KINGFISHER_PERCH.z);
    group.add(perch);
    return group;
  }, [lowPower, wind]);

  useEffect(
    () => () => {
      root.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as MeshStandardMaterial).dispose();
        }
      });
    },
    [root],
  );

  useFrame(({ clock }) => setWind(wind, clock.elapsedTime));

  return <primitive object={root} />;
}
