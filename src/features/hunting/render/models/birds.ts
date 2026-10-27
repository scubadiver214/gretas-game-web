import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  Vector2,
  Vector3,
  type Material,
} from "three";
import { mergeColored, paint, place, solid, taperedTube, type Painter } from "../geo";
import type { GameDuckId } from "../../types";

export type BirdKind = "mallardDrake" | "mallardHen" | "woodDrake" | "woodHen" | "pintailDrake" | "pintailHen" | "tealDrake" | "tealHen" | "canvasbackDrake" | "canvasbackHen" | "shovelerDrake" | "shovelerHen" | "swan" | "loon" | "heron" | "kingfisher";

const FLYING_PAIR: Record<GameDuckId, { drake: BirdKind; hen: BirdKind }> = {
  mallard: { drake: "mallardDrake", hen: "mallardHen" },
  woodDuck: { drake: "woodDrake", hen: "woodHen" },
  pintail: { drake: "pintailDrake", hen: "pintailHen" },
  teal: { drake: "tealDrake", hen: "tealHen" },
  canvasback: { drake: "canvasbackDrake", hen: "canvasbackHen" },
  shoveler: { drake: "shovelerDrake", hen: "shovelerHen" },
};

export function flyingKind(species: GameDuckId, hen: boolean): BirdKind {
  const pair = FLYING_PAIR[species];
  return hen ? pair.hen : pair.drake;
}

export interface BirdRig {
  kind: BirdKind;
  root: Group;
  /** Pose group under the root (pitch for dabbling / diving, roll for banking). */
  body: Group;
  head: Group;
  neck: Group;
  wings: Group;
  shoulderPos: Group;
  shoulderNeg: Group;
  elbowPos: Group;
  elbowNeg: Group;
  legs: Group[];
}

const C = (hex: string) => new Color(hex);
const mix = (a: string, b: string, t: number) => C(a).lerp(C(b), Math.max(0, Math.min(1, t)));
const hashNoise = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

const MALLARD_PROFILE: [number, number][] = [
  [0.001, -0.31],
  [0.035, -0.29],
  [0.07, -0.23],
  [0.105, -0.14],
  [0.122, -0.05],
  [0.126, 0.03],
  [0.118, 0.1],
  [0.098, 0.16],
  [0.068, 0.205],
  [0.035, 0.232],
  [0.001, 0.24],
];

interface WingOpts {
  span: number;
  rootChord: number;
  tipChord: number;
  sweep: number;
  feathers: number;
  featherDepth: number;
  camber: number;
  top: (u: number, v: number) => Color;
  bottom: (u: number, v: number) => Color;
}

/** A wing panel: a cambered grid with a scalloped (feathered) trailing edge, coloured separately on top and underneath. */
function wingGeometry(o: WingOpts): BufferGeometry {
  const N = 10;
  const M = 6;
  const pos: number[] = [];
  const col: number[] = [];
  const index: number[] = [];
  for (const layer of [1, -1]) {
    const start = pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const chord = o.rootChord + (o.tipChord - o.rootChord) * Math.pow(u, 1.15);
      const lead = -o.sweep * u * u;
      const ext = o.featherDepth * chord * (0.5 + 0.5 * Math.abs(Math.sin(u * Math.PI * o.feathers)));
      for (let j = 0; j <= M; j++) {
        const v = j / M;
        const z = lead - v * chord - v * v * v * ext;
        const y = o.camber * Math.sin(Math.PI * v) * chord * (1 - 0.6 * u) + layer * 0.0015;
        pos.push(u * o.span, y, z);
        const c = layer > 0 ? o.top(u, v) : o.bottom(u, v);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const a = start + i * (M + 1) + j;
        const b = a + M + 1;
        if (layer > 0) index.push(a, a + 1, b, b, a + 1, b + 1);
        else index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

interface BirdSpec {
  scale: number;
  profile: [number, number][];
  /** y squash of the body. */
  flat: number;
  /** Body pitch (radians, positive = chest up). */
  bodyPitch?: number;
  bodyPaint: Painter;
  neck: { pts: [number, number, number][]; radii: number[]; paint: Painter };
  head: { pos: [number, number, number]; r: number; scale: [number, number, number]; paint?: Painter; material?: "drake" | "loon" };
  crest?: { color: string; length: number };
  bill: { len: number; base: number; tip: number; flat: number; color: string; nail?: string; pitch?: number };
  eye: { r: number; at: [number, number, number]; color: string; ring?: string };
  tail: { len: number; width: number; color: string; at: [number, number, number] };
  curl?: boolean;
  shoulder: [number, number, number];
  inner: Omit<WingOpts, "top" | "bottom">;
  outer: Omit<WingOpts, "top" | "bottom">;
  innerTop: (u: number, v: number) => Color;
  outerTop: (u: number, v: number) => Color;
  under: string;
  legs?: { len: number; color: string; at: [number, number, number] };
}

const DUCK_INNER = { span: 0.2, rootChord: 0.15, tipChord: 0.135, sweep: 0, feathers: 6, featherDepth: 0.14, camber: 0.08 };
const DUCK_OUTER = { span: 0.25, rootChord: 0.135, tipChord: 0.035, sweep: 0.07, feathers: 5, featherDepth: 0.2, camber: 0.05 };

function speculumWing(coverts: string, speculum: string, edge: string) {
  return (_u: number, v: number) => {
    if (v < 0.42) return C(coverts);
    if (v < 0.48) return C(edge);
    if (v < 0.8) return C(speculum);
    if (v < 0.86) return C("#16161a");
    return C(edge);
  };
}
const primaries = (base: string, tip: string) => (u: number, v: number) => (v < 0.35 ? mix(base, "#8a8070", 0.25) : mix(base, tip, Math.max(0, (v - 0.55) * 2) + u * 0.25));

const NECK_PTS: [number, number, number][] = [
  [0, 0.05, 0.16],
  [0, 0.1, 0.21],
  [0, 0.145, 0.25],
];

/** Mottled hen that keeps a species' size, bill and tail. */
function henSpec(o: { scale: number; body: string; belly: string; bill: string; tail: string; tailLen: number; tailWidth: number; speculum: string; billLen?: number; billTip?: number; billBase?: number; billFlat?: number }): BirdSpec {
  return {
    scale: o.scale,
    profile: MALLARD_PROFILE,
    flat: 0.82,
    bodyPaint: (p, _n, out) => {
      const m = hashNoise(p.x, p.y, p.z);
      out.copy(p.y < -0.05 ? C(o.belly) : mix(o.body, "#4a3828", m > 0.62 ? 0.75 : 0.15));
    },
    neck: { pts: NECK_PTS, radii: [0.056, 0.044, 0.04], paint: (_p, _n, out) => out.copy(mix(o.body, "#6a543c", 0.35)) },
    head: {
      pos: [0, 0.155, 0.26],
      r: 0.06,
      scale: [0.88, 0.94, 1.16],
      paint: (p, _n, out) => out.copy(mix(o.body, "#3a2a1c", p.y > 0.02 ? 0.35 : 0)),
    },
    bill: { len: o.billLen ?? 0.08, base: o.billBase ?? 0.03, tip: o.billTip ?? 0.02, flat: o.billFlat ?? 0.42, color: o.bill, pitch: 0.16 },
    eye: { r: 0.012, at: [0.044, 0.012, 0.03], color: "#0b0b0d" },
    tail: { len: o.tailLen, width: o.tailWidth, color: o.tail, at: [0, 0.02, -0.32] },
    shoulder: [0.072, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing(o.body, o.speculum, "#f1efe8"),
    outerTop: primaries("#5c4a38", "#3a2e24"),
    under: o.belly,
  };
}

const SPECS: Record<BirdKind, BirdSpec> = {
  mallardDrake: {
    scale: 1,
    profile: MALLARD_PROFILE,
    flat: 0.8,
    bodyPaint: (p, _n, out) => {
      const fine = 0.92 + 0.08 * Math.sin(p.y * 260) * Math.sin(p.z * 40);
      if (p.z < -0.21) out.copy(C("#1b1b1e"));
      else if (p.z > 0.1 && p.y > -0.07) out.copy(C("#6e3a24"));
      else if (p.y > 0.05) out.copy(mix("#7d7366", "#5d564d", (p.y - 0.05) * 10));
      else if (p.y < -0.05) out.copy(C("#d9d5cc"));
      else out.copy(C("#c4c0b6")).multiplyScalar(fine);
      if (Math.abs(p.x) > 0.075 && p.y > 0.02 && p.y < 0.07 && p.z > -0.17 && p.z < -0.06) out.copy(C("#2c4fb5"));
    },
    neck: {
      pts: [
        [0, 0.05, 0.16],
        [0, 0.1, 0.21],
        [0, 0.145, 0.25],
      ],
      radii: [0.06, 0.047, 0.042],
      paint: (p, _n, out) => out.copy(p.y < 0.085 && p.y > 0.07 ? C("#f4f4f2") : p.y < 0.07 ? C("#6e3a24") : C("#0f5a2c")),
    },
    head: { pos: [0, 0.16, 0.265], r: 0.064, scale: [0.88, 0.94, 1.18], material: "drake" },
    bill: { len: 0.088, base: 0.034, tip: 0.024, flat: 0.4, color: "#e6c13a", nail: "#2a2a2a", pitch: 0.18 },
    eye: { r: 0.0135, at: [0.046, 0.014, 0.032], color: "#0b0b0d" },
    tail: { len: 0.12, width: 0.06, color: "#ece9e2", at: [0, 0.02, -0.33] },
    curl: true,
    shoulder: [0.072, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#8b8274", "#2b4cb0", "#f3f3f0"),
    outerTop: primaries("#6a6157", "#423c35"),
    under: "#dedad2",
  },
  mallardHen: {
    scale: 0.96,
    profile: MALLARD_PROFILE,
    flat: 0.8,
    bodyPaint: (p, _n, out) => {
      const scallop = Math.sin(p.x * 70 + p.z * 55) * Math.sin(p.z * 62 - p.y * 30);
      out.copy(p.y < -0.05 ? C("#b89c76") : mix("#9a7a52", "#5c4229", scallop > 0.25 ? 0.8 : 0.15));
      if (Math.abs(p.x) > 0.075 && p.y > 0.02 && p.y < 0.07 && p.z > -0.17 && p.z < -0.06) out.copy(C("#2c4fb5"));
    },
    neck: {
      pts: [
        [0, 0.05, 0.16],
        [0, 0.1, 0.21],
        [0, 0.145, 0.25],
      ],
      radii: [0.058, 0.045, 0.04],
      paint: (p, _n, out) => out.copy(mix("#a88a62", "#8a6a48", hashNoise(p.x, p.y, p.z) * 0.6)),
    },
    head: {
      pos: [0, 0.155, 0.26],
      r: 0.062,
      scale: [0.88, 0.94, 1.18],
      paint: (p, _n, out) => {
        out.copy(C("#a1825c"));
        if (p.y > 0.035) out.copy(C("#4f3a24"));
        if (Math.abs(p.y - 0.012 + p.z * 0.12) < 0.008) out.copy(C("#3b2a1a"));
      },
    },
    bill: { len: 0.085, base: 0.033, tip: 0.023, flat: 0.4, color: "#d4802e", nail: "#3a2a1e", pitch: 0.18 },
    eye: { r: 0.013, at: [0.045, 0.014, 0.032], color: "#0b0b0d" },
    tail: { len: 0.11, width: 0.055, color: "#8a6e4c", at: [0, 0.02, -0.32] },
    shoulder: [0.072, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#7a6046", "#2b4cb0", "#f1efe8"),
    outerTop: primaries("#5e4c3a", "#3d3226"),
    under: "#d8d0c2",
  },
  woodDrake: {
    scale: 0.88,
    profile: MALLARD_PROFILE,
    flat: 0.82,
    bodyPaint: (p, _n, out) => {
      if (p.z > 0.09 && p.y > -0.07) out.copy(hashNoise(p.x * 3, p.y * 3, p.z * 3) > 0.8 ? C("#f4efe6") : C("#6b2a2c"));
      else if (p.y > 0.05) out.copy(C("#2d2a2e"));
      else if (p.y < -0.05) out.copy(C("#efe9de"));
      else out.copy(C("#c8a466"));
      if (p.z < -0.22) out.copy(C("#1a1b20"));
      if (Math.abs(p.z - 0.08) < 0.008 && p.y > -0.06) out.copy(C("#f6f6f4"));
    },
    neck: {
      pts: [
        [0, 0.05, 0.16],
        [0, 0.1, 0.21],
        [0, 0.145, 0.25],
      ],
      radii: [0.055, 0.044, 0.04],
      paint: (p, _n, out) => out.copy(p.y < 0.085 ? C("#6b2a2c") : C("#f2f2ee")),
    },
    head: {
      pos: [0, 0.155, 0.26],
      r: 0.06,
      scale: [0.85, 0.95, 1.15],
      paint: (p, _n, out) => {
        out.copy(p.y > 0.015 ? C("#3a2a55") : C("#1d4a3a"));
        if (p.y < -0.025 && p.z > -0.02) out.copy(C("#f5f5f2"));
        if (Math.abs(p.y - (0.028 - p.z * 0.25)) < 0.006) out.copy(C("#f5f5f2"));
        if (Math.abs(p.y - (-0.01 - p.z * 0.3)) < 0.005 && p.z < 0.02) out.copy(C("#f5f5f2"));
      },
    },
    crest: { color: "#2b4a3c", length: 0.11 },
    bill: { len: 0.07, base: 0.025, tip: 0.015, flat: 0.5, color: "#d9452f", nail: "#1a1a1a", pitch: 0.2 },
    eye: { r: 0.011, at: [0.045, 0.012, 0.032], color: "#c8221a", ring: "#e04030" },
    tail: { len: 0.13, width: 0.05, color: "#24242a", at: [0, 0.03, -0.32] },
    shoulder: [0.07, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#3b3530", "#2f6f8a", "#f1f1ee"),
    outerTop: primaries("#3a3634", "#24211f"),
    under: "#d6d2cc",
  },
  woodHen: {
    scale: 0.86,
    profile: MALLARD_PROFILE,
    flat: 0.82,
    bodyPaint: (p, _n, out) => out.copy(p.y < -0.05 ? C("#e9e2d4") : mix("#857563", "#5f5244", hashNoise(p.x, p.y, p.z) > 0.6 ? 0.8 : 0.2)),
    neck: {
      pts: [
        [0, 0.05, 0.16],
        [0, 0.1, 0.21],
        [0, 0.145, 0.25],
      ],
      radii: [0.054, 0.043, 0.04],
      paint: (_p, _n, out) => out.copy(C("#7d7266")),
    },
    head: {
      pos: [0, 0.155, 0.26],
      r: 0.058,
      scale: [0.85, 0.95, 1.15],
      paint: (p, _n, out) => {
        out.copy(C("#6f655b"));
        const d = Math.hypot(p.x > 0 ? p.x - 0.045 : p.x + 0.045, p.y - 0.012, p.z - 0.025);
        if (d < 0.02 && d > 0.011) out.copy(C("#f2f0ea"));
        if (p.y < -0.025) out.copy(C("#f2f0ea"));
      },
    },
    crest: { color: "#5e554c", length: 0.06 },
    bill: { len: 0.068, base: 0.024, tip: 0.015, flat: 0.5, color: "#3a3532", pitch: 0.2 },
    eye: { r: 0.01, at: [0.045, 0.012, 0.03], color: "#0b0b0d" },
    tail: { len: 0.12, width: 0.05, color: "#5c5046", at: [0, 0.03, -0.31] },
    shoulder: [0.07, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#5e5348", "#2f6f8a", "#f1f1ee"),
    outerTop: primaries("#4a423b", "#2c2723"),
    under: "#d6d2cc",
  },
  pintailDrake: {
    scale: 0.94,
    profile: MALLARD_PROFILE,
    flat: 0.72,
    bodyPaint: (p, _n, out) => {
      if (p.z < -0.18) out.copy(C("#1a1c20"));
      else if (p.z > 0.04 && p.y > -0.06) out.copy(C("#f4f1ea"));
      else out.copy(mix("#b7b3aa", "#8d8880", hashNoise(p.x, p.y, p.z) * 0.45));
    },
    neck: { pts: NECK_PTS, radii: [0.05, 0.04, 0.036], paint: (p, _n, out) => out.copy(p.y > 0.09 ? C("#f7f4ee") : C("#6b3418")) },
    head: {
      pos: [0, 0.158, 0.27],
      r: 0.058,
      scale: [0.82, 0.9, 1.28],
      paint: (p, _n, out) => out.copy(p.y < -0.028 ? C("#f7f4ee") : C("#6a3016")),
    },
    bill: { len: 0.09, base: 0.02, tip: 0.012, flat: 0.48, color: "#8aa0b0", nail: "#2a2e32", pitch: 0.08 },
    eye: { r: 0.011, at: [0.042, 0.012, 0.034], color: "#0b0b0d" },
    tail: { len: 0.24, width: 0.016, color: "#14161a", at: [0, 0.03, -0.36] },
    shoulder: [0.068, 0.068, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#c5bfb4", "#2f6a45", "#f4f1ea"),
    outerTop: primaries("#9a948a", "#5c574f"),
    under: "#f3f0e8",
  },
  pintailHen: henSpec({ scale: 0.9, body: "#a08058", belly: "#e6d3b0", bill: "#8d9498", tail: "#4a3a28", tailLen: 0.18, tailWidth: 0.028, speculum: "#2f6a45", billLen: 0.086, billTip: 0.014, billBase: 0.02 }),
  tealDrake: {
    scale: 0.68,
    profile: MALLARD_PROFILE,
    flat: 0.84,
    bodyPaint: (p, _n, out) => {
      if (Math.abs(p.z - 0.02) < 0.014 && p.y > -0.04) out.copy(C("#f3e6c4"));
      else if (p.y < -0.05) out.copy(C("#d9d3c6"));
      else out.copy(C("#8e9290"));
      if (p.z < -0.2) out.copy(C("#2a2c2e"));
    },
    neck: { pts: NECK_PTS, radii: [0.058, 0.046, 0.042], paint: (p, _n, out) => out.copy(p.y > 0.1 ? C("#8a3d22") : C("#c9a06a")) },
    head: {
      pos: [0, 0.155, 0.255],
      r: 0.062,
      scale: [0.9, 0.92, 1.12],
      paint: (p, _n, out) => {
        const mask = p.z > -0.01 && p.y > -0.02 && p.y < 0.04;
        out.copy(mask ? C("#1c6b42") : C("#8a3b20"));
        if (p.y < -0.03) out.copy(C("#f3e6c4"));
      },
    },
    bill: { len: 0.062, base: 0.022, tip: 0.014, flat: 0.45, color: "#1c1c1e", pitch: 0.16 },
    eye: { r: 0.012, at: [0.046, 0.012, 0.03], color: "#0b0b0d" },
    tail: { len: 0.08, width: 0.04, color: "#3a342c", at: [0, 0.02, -0.3] },
    shoulder: [0.074, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#8a8478", "#1fa35a", "#f3e6c4"),
    outerTop: primaries("#6a645c", "#3a342e"),
    under: "#e4ddd0",
  },
  tealHen: henSpec({ scale: 0.66, body: "#8d7352", belly: "#e4d5ba", bill: "#3a342e", tail: "#5a4634", tailLen: 0.08, tailWidth: 0.04, speculum: "#1fa35a", billLen: 0.06 }),
  canvasbackDrake: {
    scale: 1.14,
    profile: MALLARD_PROFILE,
    flat: 0.78,
    bodyPaint: (p, _n, out) => {
      if (p.z > 0.02 && p.z < 0.16 && p.y > -0.08) out.copy(C("#1a1c1e"));
      else if (p.z < -0.18) out.copy(C("#1a1c1e"));
      else out.copy(C("#f4f2ec"));
    },
    neck: { pts: NECK_PTS, radii: [0.055, 0.046, 0.04], paint: (p, _n, out) => out.copy(p.y < 0.08 ? C("#1a1c1e") : C("#9a3b24")) },
    head: {
      pos: [0, 0.16, 0.28],
      r: 0.06,
      scale: [0.78, 0.82, 1.42],
      paint: (_p, _n, out) => out.copy(C("#9a3b24")),
    },
    bill: { len: 0.11, base: 0.02, tip: 0.012, flat: 0.55, color: "#1a1a1c", pitch: 0.02 },
    eye: { r: 0.011, at: [0.04, 0.01, 0.04], color: "#c02020" },
    tail: { len: 0.08, width: 0.045, color: "#1a1c1e", at: [0, 0.02, -0.32] },
    shoulder: [0.072, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#f2f0ea", "#8a8680", "#f7f5f0"),
    outerTop: primaries("#d9d4cc", "#6e6a64"),
    under: "#f7f5f0",
  },
  canvasbackHen: henSpec({ scale: 1.08, body: "#b9a48a", belly: "#efe6d8", bill: "#2a2622", tail: "#4a4038", tailLen: 0.09, tailWidth: 0.045, speculum: "#8a8680", billLen: 0.1, billTip: 0.014, billBase: 0.02, billFlat: 0.5 }),
  shovelerDrake: {
    scale: 1.02,
    profile: MALLARD_PROFILE,
    flat: 0.8,
    bodyPaint: (p, _n, out) => {
      if (p.z < -0.16) out.copy(C("#1c1e22"));
      else if (p.z > 0.05) out.copy(C("#f6f4ef"));
      else if (p.y < 0.02) out.copy(C("#b85a28"));
      else out.copy(C("#f3f1eb"));
    },
    neck: { pts: NECK_PTS, radii: [0.058, 0.048, 0.042], paint: (p, _n, out) => out.copy(p.y < 0.085 ? C("#f6f4ef") : C("#0d5a2b")) },
    head: { pos: [0, 0.16, 0.26], r: 0.064, scale: [0.9, 0.94, 1.16], material: "drake" },
    bill: { len: 0.11, base: 0.016, tip: 0.05, flat: 0.28, color: "#1a1a1c", pitch: 0.12 },
    eye: { r: 0.012, at: [0.046, 0.014, 0.03], color: "#f2c230" },
    tail: { len: 0.09, width: 0.04, color: "#1c1e22", at: [0, 0.02, -0.32] },
    shoulder: [0.072, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: speculumWing("#4a6ea8", "#1f8a4a", "#f4f2ec"),
    outerTop: primaries("#3d5c90", "#24344e"),
    under: "#e7d2c4",
  },
  shovelerHen: henSpec({ scale: 0.98, body: "#9a784c", belly: "#e6d2b4", bill: "#c46a32", tail: "#5a4030", tailLen: 0.09, tailWidth: 0.04, speculum: "#1f8a4a", billLen: 0.1, billTip: 0.046, billBase: 0.016, billFlat: 0.3 }),
  swan: {
    scale: 2.3,
    profile: MALLARD_PROFILE,
    flat: 0.78,
    bodyPaint: (p, n, out) => out.copy(C("#f6f5f1")).multiplyScalar(0.9 + 0.1 * n.y + 0.03 * Math.sin(p.z * 80)),
    neck: {
      pts: [
        [0, 0.07, 0.17],
        [0, 0.2, 0.22],
        [0, 0.32, 0.19],
        [0, 0.38, 0.215],
        [0, 0.4, 0.25],
      ],
      radii: [0.045, 0.032, 0.026, 0.024, 0.024],
      paint: (_p, _n, out) => out.copy(C("#f6f5f1")),
    },
    head: { pos: [0, 0.405, 0.268], r: 0.03, scale: [0.85, 0.85, 1.35], paint: (_p, _n, out) => out.copy(C("#f7f6f2")) },
    bill: { len: 0.05, base: 0.014, tip: 0.008, flat: 0.6, color: "#e8792a", nail: "#222", pitch: 0.55 },
    eye: { r: 0.005, at: [0.021, 0.006, 0.018], color: "#111" },
    tail: { len: 0.08, width: 0.06, color: "#f2f1ec", at: [0, 0.05, -0.31] },
    shoulder: [0.07, 0.07, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: () => C("#f6f5f1"),
    outerTop: () => C("#efeeea"),
    under: "#ebeae6",
  },
  loon: {
    scale: 1.45,
    profile: MALLARD_PROFILE,
    flat: 0.62,
    bodyPaint: (p, _n, out) => {
      if (p.y < -0.02) out.copy(C("#e9e9e6"));
      else {
        const check = Math.sin(p.x * 120) * Math.sin(p.z * 110) > 0.45 && p.y > 0.02;
        out.copy(check ? C("#f1f1ee") : C("#141616"));
        if (Math.abs(p.x) > 0.08 && p.y < 0.03 && Math.sin(p.z * 160) > 0.6) out.copy(C("#e6e6e2"));
      }
    },
    neck: {
      pts: [
        [0, 0.04, 0.17],
        [0, 0.09, 0.22],
        [0, 0.12, 0.27],
      ],
      radii: [0.06, 0.05, 0.045],
      paint: (p, _n, out) => out.copy(Math.abs(p.y - 0.08) < 0.008 && Math.sin(p.z * 400) > 0 ? C("#f1f1ee") : C("#121815")),
    },
    head: { pos: [0, 0.13, 0.29], r: 0.058, scale: [0.85, 0.9, 1.2], material: "loon" },
    bill: { len: 0.085, base: 0.02, tip: 0.004, flat: 0.75, color: "#18191b", pitch: 0.08 },
    eye: { r: 0.01, at: [0.043, 0.012, 0.028], color: "#b41d1d" },
    tail: { len: 0.06, width: 0.04, color: "#141616", at: [0, 0.02, -0.3] },
    shoulder: [0.072, 0.06, 0.08],
    inner: DUCK_INNER,
    outer: DUCK_OUTER,
    innerTop: () => C("#151717"),
    outerTop: () => C("#101212"),
    under: "#e3e3e0",
  },
  heron: {
    scale: 1.7,
    profile: MALLARD_PROFILE.map(([r, y]) => [r * 0.85, y * 1.1]),
    flat: 0.95,
    bodyPitch: 0.45,
    bodyPaint: (p, _n, out) => {
      out.copy(p.y > -0.02 ? C("#7e8fa4") : C("#9aa7b7"));
      if (p.z > 0.12 && p.y < 0.02) out.copy(C("#c9cfd6"));
      if (p.z < -0.2) out.copy(C("#5d6b7d"));
    },
    neck: {
      pts: [
        [0, 0.08, 0.14],
        [0, 0.22, 0.12],
        [0, 0.33, 0.18],
        [0, 0.4, 0.24],
        [0, 0.44, 0.27],
      ],
      radii: [0.04, 0.026, 0.022, 0.02, 0.02],
      paint: (p, n, out) => out.copy(C("#b8bec8")).lerp(C("#7a6a62"), p.z > 0.2 && n.z > 0.5 ? 0.4 : 0),
    },
    head: {
      pos: [0, 0.455, 0.29],
      r: 0.032,
      scale: [0.8, 0.85, 1.3],
      paint: (p, _n, out) => out.copy(p.y > 0.008 && Math.abs(p.x) > 0.008 ? C("#16181c") : C("#f2f2f0")),
    },
    bill: { len: 0.12, base: 0.014, tip: 0.002, flat: 0.75, color: "#d8b13a", pitch: 0.1 },
    eye: { r: 0.006, at: [0.022, 0.006, 0.018], color: "#e7c235" },
    tail: { len: 0.07, width: 0.05, color: "#5d6b7d", at: [0, -0.02, -0.33] },
    shoulder: [0.07, 0.08, 0.08],
    inner: { span: 0.42, rootChord: 0.26, tipChord: 0.24, sweep: 0, feathers: 7, featherDepth: 0.1, camber: 0.08 },
    outer: { span: 0.48, rootChord: 0.24, tipChord: 0.1, sweep: 0.05, feathers: 6, featherDepth: 0.15, camber: 0.05 },
    innerTop: (_u, v) => (v > 0.7 ? C("#2a2e35") : C("#8195ad")),
    outerTop: (_u, v) => (v > 0.3 ? C("#22252a") : C("#6f8098")),
    under: "#8c99aa",
    legs: { len: 0.55, color: "#6b5a3a", at: [0.04, -0.06, -0.02] },
  },
  kingfisher: {
    scale: 0.55,
    profile: MALLARD_PROFILE.map(([r, y]) => [r * 1.05, y]),
    flat: 0.95,
    bodyPaint: (p, _n, out) => {
      if (p.y < -0.03) out.copy(p.z > 0.0 && p.z < 0.12 ? C("#b5532a") : C("#f4f2ec"));
      else out.copy(C("#4d6f98"));
      if (p.z > 0.15 && p.y > 0.0) out.copy(C("#f4f2ec"));
    },
    neck: {
      pts: [
        [0, 0.04, 0.15],
        [0, 0.08, 0.2],
      ],
      radii: [0.08, 0.075],
      paint: (_p, _n, out) => out.copy(C("#f4f2ec")),
    },
    head: {
      pos: [0, 0.12, 0.24],
      r: 0.095,
      scale: [0.9, 0.95, 1.1],
      paint: (p, _n, out) => {
        out.copy(p.y < -0.03 ? C("#f4f2ec") : C("#4b6c95"));
        if (Math.abs(p.x) > 0.06 && Math.abs(p.y - 0.02) < 0.012 && p.z > 0.03) out.copy(C("#f4f2ec"));
      },
    },
    crest: { color: "#3f5f86", length: 0.12 },
    bill: { len: 0.15, base: 0.03, tip: 0.004, flat: 0.8, color: "#202226", pitch: 0.05 },
    eye: { r: 0.016, at: [0.07, 0.02, 0.05], color: "#0b0b0d" },
    tail: { len: 0.16, width: 0.06, color: "#3e5d82", at: [0, 0.0, -0.33] },
    shoulder: [0.08, 0.06, 0.07],
    inner: { span: 0.17, rootChord: 0.17, tipChord: 0.16, sweep: 0, feathers: 6, featherDepth: 0.1, camber: 0.08 },
    outer: { span: 0.22, rootChord: 0.16, tipChord: 0.05, sweep: 0.05, feathers: 5, featherDepth: 0.18, camber: 0.05 },
    innerTop: (u, v) => (Math.sin(u * 50) * Math.sin(v * 40) > 0.75 ? C("#f2f2f2") : C("#4f6f95")),
    outerTop: (u, v) => (v > 0.6 ? C("#25303f") : Math.sin(u * 55) * Math.sin(v * 35) > 0.7 ? C("#f2f2f2") : C("#3b5274")),
    under: "#eae8e2",
  },
};

export interface BirdKit {
  create: (kind: BirdKind) => BirdRig;
  dispose: () => void;
}

/** Builds rigs that share geometry and materials per species; call dispose() once when done. */
export function createBirdKit(): BirdKit {
  const vc = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const drakeHead = new MeshPhysicalMaterial({ color: "#0d5a2b", roughness: 0.32, metalness: 0.1, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520], clearcoat: 0.4 });
  const loonHead = new MeshPhysicalMaterial({ color: "#0b1210", roughness: 0.35, iridescence: 0.6, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 400] });
  const geoCache = new Map<BirdKind, Record<string, BufferGeometry>>();
  const materials: Material[] = [vc, drakeHead, loonHead];

  function geometries(kind: BirdKind): Record<string, BufferGeometry> {
    const hit = geoCache.get(kind);
    if (hit) return hit;
    const s = SPECS[kind];
    const profile = new SplineCurve(s.profile.map(([r, y]) => new Vector2(r, y))).getPoints(26);
    const lathe = new LatheGeometry(profile, 30);
    lathe.rotateX(Math.PI / 2);
    lathe.scale(0.95, s.flat, 1);
    const neck = taperedTube(
      s.neck.pts.map(([x, y, z]) => new Vector3(x, y, z)),
      s.neck.radii,
      10,
    );
    const tail = new ConeGeometry(s.tail.width, s.tail.len, 8);
    tail.rotateX(-Math.PI / 2);
    tail.scale(1, 0.35, 1);
    tail.translate(...s.tail.at);
    const bodyParts = [paint(lathe, s.bodyPaint), paint(neck, s.neck.paint), solid(tail, s.tail.color)];
    if (s.curl) bodyParts.push(solid(place(new TorusGeometry(0.02, 0.006, 6, 12, Math.PI * 1.4), [0, 0.075, -0.27], [0, Math.PI / 2, 0]), "#16161a"));

    const head = new SphereGeometry(s.head.r, 18, 14);
    head.scale(...s.head.scale);
    const headParts: BufferGeometry[] = [];
    if (s.crest) {
      const crest = new ConeGeometry(s.head.r * 0.55, s.crest.length, 6);
      crest.rotateX(-Math.PI / 2 - 0.35);
      crest.translate(0, s.head.r * 0.55, -s.head.r * 0.9);
      headParts.push(solid(crest, s.crest.color));
    }
    const bill = new CylinderGeometry(s.bill.tip, s.bill.base, s.bill.len, 10);
    bill.rotateX(Math.PI / 2);
    bill.scale(1.2, s.bill.flat, 1);
    bill.translate(0, -s.head.r * 0.2, s.head.r * s.head.scale[2] * 0.75 + s.bill.len / 2);
    bill.rotateX(s.bill.pitch ?? 0);
    headParts.push(solid(bill, s.bill.color));
    if (s.bill.nail) headParts.push(solid(place(new SphereGeometry(s.bill.base * 0.35, 6, 4), [0, -s.head.r * 0.17, s.head.r * s.head.scale[2] * 0.75 + s.bill.len * 0.98], [s.bill.pitch ?? 0, 0, 0], [1, 0.5, 1]), s.bill.nail));
    for (const side of [1, -1]) {
      const [ex, ey, ez] = s.eye.at;
      headParts.push(solid(place(new SphereGeometry(s.eye.r, 8, 6), [ex * side, ey, ez]), s.eye.color));
      if (s.eye.ring) headParts.push(solid(place(new TorusGeometry(s.eye.r * 1.15, s.eye.r * 0.3, 5, 10), [ex * side * 1.02, ey, ez], [0, Math.PI / 2, 0]), s.eye.ring));
    }
    const headMesh = s.head.material ? head : paint(head, s.head.paint ?? ((_p, _n, out) => out.set("#777")));
    const innerOpts = { ...s.inner, top: s.innerTop, bottom: () => C(s.under) };
    const outerOpts = { ...s.outer, top: s.outerTop, bottom: (_u: number, v: number) => C(s.under).multiplyScalar(v > 0.6 ? 0.82 : 0.95) };
    const g: Record<string, BufferGeometry> = {
      body: mergeColored(bodyParts),
      head: s.head.material ? headMesh : mergeColored([headMesh, ...headParts]),
      headParts: s.head.material ? mergeColored(headParts) : new BufferGeometry(),
      inner: wingGeometry(innerOpts),
      outer: wingGeometry(outerOpts),
    };
    if (s.legs) {
      const leg = new CylinderGeometry(0.008, 0.007, s.legs.len, 6);
      leg.translate(0, -s.legs.len / 2, 0);
      const foot = place(new ConeGeometry(0.01, 0.07, 4), [0, -s.legs.len, 0.02], [Math.PI / 2, 0, 0], [1, 1, 0.3]);
      g.leg = mergeColored([solid(leg, s.legs.color), solid(foot, s.legs.color)]);
    }
    geoCache.set(kind, g);
    return g;
  }

  function create(kind: BirdKind): BirdRig {
    const s = SPECS[kind];
    const g = geometries(kind);
    const root = new Group();
    const body = new Group();
    body.scale.setScalar(s.scale);
    root.add(body);
    const pitchGroup = new Group();
    pitchGroup.rotation.x = -(s.bodyPitch ?? 0);
    body.add(pitchGroup);
    pitchGroup.add(new Mesh(g.body, vc));
    const neck = new Group();
    pitchGroup.add(neck);
    const head = new Group();
    head.position.set(...s.head.pos);
    head.rotation.x = s.bodyPitch ?? 0;
    neck.add(head);
    if (s.head.material) {
      head.add(new Mesh(g.head, s.head.material === "drake" ? drakeHead : loonHead));
      head.add(new Mesh(g.headParts, vc));
    } else head.add(new Mesh(g.head, vc));

    const wings = new Group();
    pitchGroup.add(wings);
    const shoulderPos = new Group();
    const shoulderNeg = new Group();
    shoulderPos.position.set(s.shoulder[0], s.shoulder[1], s.shoulder[2]);
    shoulderNeg.position.set(-s.shoulder[0], s.shoulder[1], s.shoulder[2]);
    const elbowPos = new Group();
    const elbowNeg = new Group();
    elbowPos.position.x = s.inner.span * 0.97;
    elbowNeg.position.x = -s.inner.span * 0.97;
    shoulderPos.add(new Mesh(g.inner, vc), elbowPos);
    const innerNeg = new Mesh(g.inner, vc);
    innerNeg.scale.x = -1;
    shoulderNeg.add(innerNeg, elbowNeg);
    elbowPos.add(new Mesh(g.outer, vc));
    const outerNeg = new Mesh(g.outer, vc);
    outerNeg.scale.x = -1;
    elbowNeg.add(outerNeg);
    wings.add(shoulderPos, shoulderNeg);

    const legs: Group[] = [];
    if (s.legs && g.leg) {
      for (const side of [1, -1]) {
        const leg = new Group();
        leg.position.set(s.legs.at[0] * side, s.legs.at[1], s.legs.at[2]);
        leg.rotation.x = s.bodyPitch ?? 0;
        leg.add(new Mesh(g.leg, vc));
        pitchGroup.add(leg);
        legs.push(leg);
      }
    }
    return { kind, root, body, head, neck, wings, shoulderPos, shoulderNeg, elbowPos, elbowNeg, legs };
  }

  return {
    create,
    dispose: () => {
      for (const g of geoCache.values()) for (const geo of Object.values(g)) geo.dispose();
      geoCache.clear();
      for (const m of materials) m.dispose();
    },
  };
}

/** Wing beat: elevation from the flap phase, the hand lagging behind, folding back on the upstroke. */
export function poseWings(rig: BirdRig, flap: number, glide: number, amp = 1): void {
  const s = Math.sin(flap);
  const live = 1 - glide;
  const up = (0.16 + 0.88 * s * amp) * live + 0.1 * glide;
  const hand = 0.5 * Math.sin(flap - 0.95) * amp * live + 0.04 * glide;
  const sweep = Math.max(0, -Math.cos(flap)) * 0.32 * live;
  const twist = 0.16 * Math.cos(flap) * live;
  rig.shoulderPos.rotation.set(twist, sweep, up);
  rig.shoulderNeg.rotation.set(twist, -sweep, -up);
  rig.elbowPos.rotation.set(0, sweep * 0.7, hand);
  rig.elbowNeg.rotation.set(0, -sweep * 0.7, -hand);
}

/** Wings folded away (swimming, standing, perching). */
export function foldWings(rig: BirdRig): void {
  rig.wings.visible = false;
}

export function openWings(rig: BirdRig): void {
  rig.wings.visible = true;
}
