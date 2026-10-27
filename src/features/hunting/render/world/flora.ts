import {
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  Vector3,
  type Material,
  type MeshStandardMaterial,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bezier, mergeColored, paint, place, solid, taperedTube } from "../geo";

type R = () => number;
const C = (hex: string) => new Color(hex);

/** Blades as triangle strips: each blade is `segs` quads tapering to a point. */
function bladeSet(blades: { base: Vector3; dir: Vector3; height: number; width: number; lean: number; root: Color; tip: Color }[], segs: number): BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nrm: number[] = [];
  const index: number[] = [];
  let v = 0;
  for (const b of blades) {
    const perp = new Vector3(-b.dir.z, 0, b.dir.x);
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const out = b.lean * b.height * t * t;
      const cx = b.base.x + b.dir.x * out;
      const cy = b.base.y + b.height * t * (1 - b.lean * 0.25 * t);
      const cz = b.base.z + b.dir.z * out;
      const w = (b.width * (1 - t * 0.94)) / 2;
      pos.push(cx - perp.x * w, cy, cz - perp.z * w, cx + perp.x * w, cy, cz + perp.z * w);
      const c = b.root.clone().lerp(b.tip, Math.pow(t, 0.8));
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      // Mostly-up normals keep both faces softly lit.
      const nl = Math.hypot(b.dir.x * 0.35, 1, b.dir.z * 0.35);
      const nx = (b.dir.x * 0.35) / nl;
      const nz = (b.dir.z * 0.35) / nl;
      nrm.push(nx, 1 / nl, nz, nx, 1 / nl, nz);
      if (s < segs) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 2;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nrm), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export function grassTuft(r: R, blades = 9): BufferGeometry {
  const list = [];
  for (let i = 0; i < blades; i++) {
    const a = r() * Math.PI * 2;
    const dir = new Vector3(Math.cos(a), 0, Math.sin(a));
    const root = C("#2c5a1c").offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.04);
    const tip = C(r() < 0.15 ? "#c7c46a" : "#93c24e").offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.06);
    list.push({ base: dir.clone().multiplyScalar(r() * 0.08), dir, height: 0.3 + r() * 0.42, width: 0.04 + r() * 0.025, lean: 0.25 + r() * 0.45, root, tip });
  }
  return bladeSet(list, 4);
}

export function reedClump(r: R, blades = 16, cattails = 3): BufferGeometry {
  const list = [];
  for (let i = 0; i < blades; i++) {
    const a = r() * Math.PI * 2;
    const dir = new Vector3(Math.cos(a), 0, Math.sin(a));
    const root = C("#3a5a22");
    const tip = C(r() < 0.25 ? "#c9b26a" : "#8fb24a").offsetHSL((r() - 0.5) * 0.04, 0, (r() - 0.5) * 0.05);
    list.push({ base: dir.clone().multiplyScalar(r() * 0.45), dir, height: 1.2 + r() * 1.2, width: 0.05 + r() * 0.03, lean: 0.08 + r() * 0.22, root, tip });
  }
  const parts = [bladeSet(list, 5)];
  for (let i = 0; i < cattails; i++) {
    const x = (r() - 0.5) * 0.6;
    const z = (r() - 0.5) * 0.6;
    const h = 1.5 + r() * 0.9;
    parts.push(solid(place(new CylinderGeometry(0.012, 0.016, h, 5), [x, h / 2, z]), "#5f7a35"));
    parts.push(solid(place(new CapsuleGeometry(0.026, 0.2, 3, 8), [x, h - 0.12, z]), "#5a3a1e"));
    parts.push(solid(place(new CylinderGeometry(0.005, 0.01, 0.16, 4), [x, h + 0.1, z]), "#6f7a45"));
  }
  return mergeColored(parts);
}

/** A coconut palm: curved banded trunk and drooping, folded fronds. */
export function palm(r: R, height: number, lean: number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const top = new Vector3(lean, height, lean * 0.2);
  const trunkPts = bezier(new Vector3(0, -0.3, 0), new Vector3(lean * 0.05, height * 0.55, 0), top, 14);
  const radii = trunkPts.map((_, i) => 0.24 - (i / 14) * 0.1);
  const trunk = taperedTube(trunkPts, radii, 9);
  const light = C("#9a8466");
  const dark = C("#6b5741");
  parts.push(paint(trunk, (p, _n, out) => out.copy(light).lerp(dark, 0.5 + 0.5 * Math.sin(p.y * 9.5))));

  const fronds = 11;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + r() * 0.4;
    const dir = new Vector3(Math.cos(a), 0, Math.sin(a));
    const len = 2.6 + r() * 1.3;
    const rise = 0.5 + r() * 0.5;
    const pos: number[] = [];
    const col: number[] = [];
    const index: number[] = [];
    const segs = 12;
    const side = new Vector3(-dir.z, 0, dir.x);
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const spine = top.clone().add(dir.clone().multiplyScalar(len * t)).add(new Vector3(0, (rise * t - 1.7 * t * t) * len * 0.45, 0));
      const w = Math.sin(Math.PI * Math.pow(t, 0.75)) * 0.5 * (s % 2 === 0 ? 1 : 0.82);
      const fold = w * 0.45;
      const left = spine.clone().add(side.clone().multiplyScalar(w)).add(new Vector3(0, -fold, 0));
      const right = spine.clone().add(side.clone().multiplyScalar(-w)).add(new Vector3(0, -fold, 0));
      pos.push(left.x, left.y, left.z, spine.x, spine.y, spine.z, right.x, right.y, right.z);
      const c = C("#2f6b22").lerp(C("#78a83a"), t * 0.8 + r() * 0.1);
      const mid = C("#a4b860");
      col.push(c.r, c.g, c.b, mid.r, mid.g, mid.b, c.r, c.g, c.b);
      if (s < segs) {
        const b = s * 3;
        index.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
    g.setIndex(index);
    g.computeVertexNormals();
    parts.push(g);
  }
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2;
    parts.push(solid(place(new SphereGeometry(0.13, 8, 6), [top.x + Math.cos(a) * 0.2, top.y - 0.2, top.z + Math.sin(a) * 0.2]), "#5b4224"));
  }
  return mergeColored(parts);
}

export function conifer(r: R): BufferGeometry {
  const parts: BufferGeometry[] = [solid(place(new CylinderGeometry(0.12, 0.2, 2.2, 6), [0, 1.0, 0]), "#4a3424")];
  const tiers = 4;
  const base = C("#1f4a26");
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const rad = 2.0 * (1 - t * 0.72);
    const h = 3.2 * (1 - t * 0.35);
    const y = 1.6 + i * 2.0;
    const cone = place(new ConeGeometry(rad, h, 8, 1), [0, y + h / 2, 0], [0, r() * 3, 0]);
    const tint = base.clone().offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.05 + t * 0.03);
    parts.push(paint(cone, (p, _n, out) => out.copy(tint).multiplyScalar(0.75 + 0.35 * ((p.y - y) / h))));
  }
  return mergeColored(parts);
}

export function broadleaf(r: R): BufferGeometry {
  const parts: BufferGeometry[] = [solid(place(new CylinderGeometry(0.14, 0.24, 3.2, 6), [0, 1.5, 0]), "#5a4330")];
  const blobs = 6;
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2;
    const d = i === 0 ? 0 : 0.9 + r() * 0.7;
    const rad = 1.3 + r() * 0.8;
    const g = blob(rad, 2);
    const p = g.getAttribute("position");
    const seed = r() * 10;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const y = p.getY(k);
      const z = p.getZ(k);
      const s = 1 + 0.12 * Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed) * Math.sin(z * 3.3);
      p.setXYZ(k, x * s, y * s * 0.85, z * s);
    }
    g.computeVertexNormals();
    place(g, [Math.cos(a) * d, 4.0 + r() * 1.4 + (i === 0 ? 0.8 : 0), Math.sin(a) * d]);
    const tint = C("#3b7a2a").offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.06);
    parts.push(paint(g, (_p, n, out) => out.copy(tint).multiplyScalar(0.7 + 0.45 * Math.max(0, n.y))));
  }
  return mergeColored(parts);
}

/** A smooth-shaded sphere (icosphere with shared vertices). */
function blob(radius: number, detail: number): BufferGeometry {
  const g = new IcosahedronGeometry(radius, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return mergeVertices(g);
}

export function bush(r: R): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const g = blob(0.5 + r() * 0.35, 1);
    g.computeVertexNormals();
    place(g, [(r() - 0.5) * 0.9, 0.35 + r() * 0.2, (r() - 0.5) * 0.9], [0, 0, 0], [1, 0.75, 1]);
    const tint = C("#3f7b2b").offsetHSL(0, 0, (r() - 0.5) * 0.08);
    parts.push(paint(g, (_p, n, out) => out.copy(tint).multiplyScalar(0.7 + 0.4 * Math.max(0, n.y))));
  }
  return mergeColored(parts);
}

export function rock(r: R): BufferGeometry {
  const g = new IcosahedronGeometry(1, 1);
  const p = g.getAttribute("position");
  for (let k = 0; k < p.count; k++) {
    const s = 0.75 + r() * 0.45;
    p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.6, p.getZ(k) * s);
  }
  g.computeVertexNormals();
  const tint = C("#7d8288").offsetHSL(0, 0, (r() - 0.5) * 0.1);
  return mergeColored([paint(g, (q, n, out) => out.copy(tint).multiplyScalar(0.75 + 0.35 * Math.max(0, n.y) + (q.y < -0.1 ? -0.2 : 0)))]);
}

export function lilyPad(): BufferGeometry {
  const g = new CircleGeometry(0.42, 18, 0.35, Math.PI * 2 - 0.35);
  g.rotateX(-Math.PI / 2);
  return mergeColored([paint(g, (p, _n, out) => out.set("#3f7f2c").lerp(C("#6aa33c"), Math.min(1, Math.hypot(p.x, p.z) / 0.42) * 0.6))]);
}

export function lilyFlower(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    parts.push(solid(place(new SphereGeometry(0.07, 6, 4), [Math.cos(a) * 0.07, 0.06, Math.sin(a) * 0.07], [0, -a, 0.6], [1.6, 0.5, 0.7]), i % 2 ? "#f6b3d0" : "#fbe3ee"));
  }
  parts.push(solid(place(new SphereGeometry(0.04, 6, 4), [0, 0.08, 0]), "#f4c430"));
  return mergeColored(parts);
}

/** The half-sunk log the turtle suns itself on. */
export function turtleLog(length: number): BufferGeometry {
  const log = new CylinderGeometry(0.2, 0.24, length, 10, 4);
  log.rotateZ(Math.PI / 2);
  const bark = C("#5a4632");
  const parts = [paint(log, (p, n, out) => out.copy(bark).multiplyScalar(0.75 + 0.3 * Math.max(0, n.y) + 0.12 * Math.sin(p.x * 13)))];
  parts.push(solid(place(new CylinderGeometry(0.05, 0.08, 0.6, 6), [length * 0.3, 0.25, 0.08], [0.3, 0, -0.9]), "#5a4632"));
  parts.push(solid(place(new CylinderGeometry(0.04, 0.06, 0.5, 6), [-length * 0.25, 0.22, -0.1], [-0.4, 0, 0.8]), "#4f3d2a"));
  return mergeColored(parts);
}

/** A dead branch rising out of the water, perch on top. */
export function snag(height: number): BufferGeometry {
  const pts = bezier(new Vector3(0, -0.5, 0), new Vector3(0.25, height * 0.5, 0.1), new Vector3(-0.05, height, 0), 8);
  const trunk = taperedTube(
    pts,
    pts.map((_, i) => 0.11 - i * 0.009),
    6,
  );
  const side = taperedTube(bezier(new Vector3(0.12, height * 0.55, 0), new Vector3(0.5, height * 0.7, 0.1), new Vector3(0.75, height * 0.9, 0.15), 5), [0.05, 0.045, 0.04, 0.03, 0.022, 0.015], 5);
  const grey = C("#8a8478");
  return mergeColored([paint(trunk, (_p, n, out) => out.copy(grey).multiplyScalar(0.8 + 0.25 * n.y)), paint(side, (_p, n, out) => out.copy(grey).multiplyScalar(0.8 + 0.25 * n.y))]);
}

export interface WindUniform {
  value: number;
}

/**
 * Sways instanced vegetation in the vertex shader: displacement grows with the
 * square of the vertex height in the instance's local space, phased by world position.
 */
export function windify<M extends Material>(material: M, time: WindUniform, strength: number, heightRef: number): M {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = time;
    shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
      "#include <project_vertex>",
      `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
float windH = clamp(position.y / ${heightRef.toFixed(3)}, 0.0, 1.5);
windH *= windH;
vec2 windDir = vec2(
  sin(uWindTime * 1.35 + mvPosition.x * 0.31 + mvPosition.z * 0.17) + 0.35 * sin(uWindTime * 3.1 + mvPosition.x * 1.3),
  0.55 * cos(uWindTime * 0.95 + mvPosition.z * 0.27 - mvPosition.x * 0.12)
);
mvPosition.xz += windDir * windH * ${strength.toFixed(3)};
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  material.customProgramCacheKey = () => `wind:${strength}:${heightRef}`;
  return material;
}

export type FloraMaterial = MeshStandardMaterial;
