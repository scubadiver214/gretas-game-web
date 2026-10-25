import { clamp, headingOf, lerp, modLoop, smoothstep, wrapLoop } from "../engine/math";
import type { SurfaceProps } from "../types";
import { SpatialGrid } from "./spatial";

/** Which world's look a track uses. Add an id here when a world gets a theme. */
export type WorldId = "desert" | "winter" | "alpine" | "beach" | "jungle";

export interface ControlPoint {
  x: number;
  z: number;
  /** Full road width at this point; defaults to the track's roadWidth. */
  width?: number;
}

/** A kicker ramp across the whole corridor: rises to `height` over `length`, then drops away. */
export interface RampDef {
  /** Where the ramp starts, as a fraction of the lap (0..1). */
  at: number;
  length: number;
  height: number;
}

/** A long, gentle swell in the road (the whole corridor rises and falls together): rises to `height` over `length`, then sinks back. */
export interface HillDef {
  /** Where the hill starts, as a fraction of the lap (0..1). */
  at: number;
  length: number;
  height: number;
}

/** Wild animals that dash across the road. */
export type AnimalKind = "lion" | "tiger" | "giraffe";

export interface AnimalDef {
  /** Where along the lap it waits, as a fraction (0..1). */
  at: number;
  kind: AnimalKind;
  /** Which side of the road it starts on: -1 left, 1 right. */
  side: -1 | 1;
}

/** Roadside things you can bump into. Which ones a track uses is up to its world. */
export type ObstacleKind = "hay" | "tires" | "boulder" | "snowman" | "iceblock" | "logs" | "sandcastle" | "crate" | "surfboards" | "beachball" | "stump" | "idol";

export interface ObstacleDef {
  at: number;
  /** Metres right of the centre line (negative = left). */
  lateral: number;
  kind: ObstacleKind;
}

export interface CoinTrailDef {
  from: number;
  to: number;
  /** Metres between coins. */
  spacing?: number;
  /** Centre offset in metres (negative = left). */
  lateral?: number;
  /** Sideways weave: amplitude in metres and wavelength in metres. */
  weave?: { amplitude: number; wavelength: number };
  /** Follow the arc of a jump taken at this speed, for the trail after a ramp. */
  air?: { ramp: number; speed: number };
}

export interface GemDef {
  at: number;
  lateral: number;
  /** Height above the ground. */
  lift?: number;
}

export interface TrackDefinition {
  id: string;
  name: string;
  world: WorldId;
  /** Seed for everything procedural (scatter, terrain), so a track always replays identically. */
  seed: string;
  laps: number;
  /** Default full road width in metres. */
  roadWidth: number;
  /** Metres of shoulder on each side between the road edge and the boundary wall. */
  shoulder: number;
  /** Closed loop, listed in driving direction. The first point is on the start/finish line. */
  points: ControlPoint[];
  /** Number of gates including the finish line (gate 0). */
  checkpoints: number;
  ramps: RampDef[];
  /** Gentle rises and falls in the road itself. Leave out for a flat road. Keep them clear of ramps. */
  hills?: HillDef[];
  /** Animals that wait at the roadside and dash across when a car comes. */
  animals?: AnimalDef[];
  /** Animals running about in the wild beside the road (scenery, never on the road). */
  roamers?: number;
  surfaces: { road: SurfaceProps; shoulder: SurfaceProps };
  coinTrails: CoinTrailDef[];
  gems: GemDef[];
  obstacles: ObstacleDef[];
  /** Tiers whose difficulty this track is meant for (information for track selection). */
  tier: number;
}

export interface TrackQuery {
  /** Samples index of the segment the point projects onto. */
  index: number;
  /** Arc length along the loop, 0..length. */
  s: number;
  /** Metres from the centre line, positive to the driver's right. */
  lateral: number;
  /** Closest point on the centre line. */
  cx: number;
  cz: number;
  /** Unit tangent (driving direction) at that point. */
  tx: number;
  tz: number;
  heading: number;
  halfWidth: number;
  /** Half width plus shoulder: where the wall is. */
  boundary: number;
}

export function newQuery(): TrackQuery {
  return { index: 0, s: 0, lateral: 0, cx: 0, cz: 0, tx: 0, tz: 1, heading: 0, halfWidth: 0, boundary: 0 };
}

export interface Checkpoint {
  index: number;
  s: number;
  /** Height of the road at the gate. */
  y: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  heading: number;
  /** Half width of the corridor at the gate (road + shoulder). */
  boundary: number;
  halfWidth: number;
}

export interface Hill {
  s0: number;
  length: number;
  height: number;
}

export interface Ramp {
  s0: number;
  s1: number;
  height: number;
  length: number;
}

export interface TrackPose {
  x: number;
  z: number;
  heading: number;
}

/** The steepest a hill may be (rise over run): kids drive it, so no walls. */
export const MAX_HILL_SLOPE = 0.2;

/** Target spacing between samples in metres. */
const SAMPLE_SPACING = 2.5;
/** Samples searched each side of the hint when projecting. */
const WINDOW = 10;
const DENSE_PER_SEGMENT = 48;

interface SampleRef {
  x: number;
  z: number;
  i: number;
}

/** Centripetal Catmull-Rom between p1 and p2 (Barry-Goldman form). */
function catmullRom(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number, out: [number, number]): void {
  const d = (a: [number, number], b: [number, number]) => Math.max(1e-4, Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), 0.5));
  const t0 = 0;
  const t1 = t0 + d(p0, p1);
  const t2 = t1 + d(p1, p2);
  const t3 = t2 + d(p2, p3);
  const tt = lerp(t1, t2, t);
  for (let k = 0; k < 2; k++) {
    const a1 = lerp(p0[k], p1[k], (tt - t0) / (t1 - t0));
    const a2 = lerp(p1[k], p2[k], (tt - t1) / (t2 - t1));
    const a3 = lerp(p2[k], p3[k], (tt - t2) / (t3 - t2));
    const b1 = lerp(a1, a2, (tt - t0) / (t2 - t0));
    const b2 = lerp(a2, a3, (tt - t1) / (t3 - t1));
    out[k] = lerp(b1, b2, (tt - t1) / (t2 - t1));
  }
}

/**
 * A built track: the closed centre line resampled at equal spacing, with
 * projection, ramps, gates and spatial queries. Everything is a pure function
 * of the definition, so a track replays identically every time.
 */
export class Track {
  readonly def: TrackDefinition;
  readonly length: number;
  readonly count: number;
  readonly spacing: number;
  readonly px: Float32Array;
  readonly pz: Float32Array;
  readonly tx: Float32Array;
  readonly tz: Float32Array;
  /** Full road width at each sample. */
  readonly width: Float32Array;
  readonly checkpoints: Checkpoint[];
  readonly ramps: Ramp[];
  readonly hills: Hill[];
  /** Smallest turn radius found along the centre line (metres). */
  readonly minRadius: number;
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  private readonly index: SpatialGrid<SampleRef>;
  /** Every third sample: precise enough for "how far from the road" (terrain, scenery), 3x cheaper. */
  private readonly coarse: SpatialGrid<SampleRef>;
  private readonly refs: SampleRef[] = [];
  private readonly scratch: SampleRef[] = [];
  private maxBoundary = 0;

  constructor(def: TrackDefinition) {
    this.def = def;
    const pts = def.points;
    if (pts.length < 4) throw new Error(`Track ${def.id} needs at least 4 control points`);

    // Dense spline through the control points.
    const n = pts.length;
    const denseX: number[] = [];
    const denseZ: number[] = [];
    const denseW: number[] = [];
    const out: [number, number] = [0, 0];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let k = 0; k < DENSE_PER_SEGMENT; k++) {
        const t = k / DENSE_PER_SEGMENT;
        catmullRom([p0.x, p0.z], [p1.x, p1.z], [p2.x, p2.z], [p3.x, p3.z], t, out);
        denseX.push(out[0]);
        denseZ.push(out[1]);
        denseW.push(lerp(p1.width ?? def.roadWidth, p2.width ?? def.roadWidth, smoothstep(0, 1, t)));
      }
    }
    const dn = denseX.length;
    const cum = new Float64Array(dn + 1);
    for (let i = 0; i < dn; i++) {
      const j = (i + 1) % dn;
      cum[i + 1] = cum[i] + Math.hypot(denseX[j] - denseX[i], denseZ[j] - denseZ[i]);
    }
    const total = cum[dn];

    // Equal-spacing resample.
    const count = Math.max(16, Math.round(total / SAMPLE_SPACING));
    this.count = count;
    this.length = total;
    this.spacing = total / count;
    this.px = new Float32Array(count);
    this.pz = new Float32Array(count);
    this.tx = new Float32Array(count);
    this.tz = new Float32Array(count);
    this.width = new Float32Array(count);
    let seg = 0;
    for (let k = 0; k < count; k++) {
      const target = k * this.spacing;
      while (seg < dn - 1 && cum[seg + 1] < target) seg++;
      const j = (seg + 1) % dn;
      const span = cum[seg + 1] - cum[seg] || 1;
      const f = clamp((target - cum[seg]) / span, 0, 1);
      this.px[k] = lerp(denseX[seg], denseX[j], f);
      this.pz[k] = lerp(denseZ[seg], denseZ[j], f);
      this.width[k] = lerp(denseW[seg], denseW[j], f);
    }
    for (let k = 0; k < count; k++) {
      const a = (k - 1 + count) % count;
      const b = (k + 1) % count;
      const dx = this.px[b] - this.px[a];
      const dz = this.pz[b] - this.pz[a];
      const len = Math.hypot(dx, dz) || 1;
      this.tx[k] = dx / len;
      this.tz[k] = dz / len;
    }

    // Tightest turn.
    let maxCurv = 0;
    for (let k = 0; k < count; k++) {
      const b = (k + 1) % count;
      const h0 = headingOf(this.tx[k], this.tz[k]);
      const h1 = headingOf(this.tx[b], this.tz[b]);
      let d = h1 - h0;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      maxCurv = Math.max(maxCurv, Math.abs(d) / this.spacing);
    }
    this.minRadius = maxCurv > 0 ? 1 / maxCurv : Infinity;

    // Spatial index and bounds.
    this.index = new SpatialGrid<SampleRef>(24);
    this.coarse = new SpatialGrid<SampleRef>(24);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let k = 0; k < count; k++) {
      const ref = { x: this.px[k], z: this.pz[k], i: k };
      this.refs.push(ref);
      this.index.insert(ref);
      if (k % 3 === 0) this.coarse.insert(ref);
      const b = this.width[k] / 2 + def.shoulder;
      this.maxBoundary = Math.max(this.maxBoundary, b);
      minX = Math.min(minX, ref.x - b);
      maxX = Math.max(maxX, ref.x + b);
      minZ = Math.min(minZ, ref.z - b);
      maxZ = Math.max(maxZ, ref.z + b);
    }
    this.bounds = { minX, maxX, minZ, maxZ };

    // Ramps.
    this.ramps = def.ramps.map((r) => {
      const s0 = modLoop(r.at * total, total);
      return { s0, s1: s0 + r.length, height: r.height, length: r.length };
    });

    this.hills = (def.hills ?? []).map((h) => ({ s0: modLoop(h.at * total, total), length: h.length, height: h.height }));

    // Gates, evenly spaced, gate 0 is the finish line at s = 0.
    const gates = Math.max(2, def.checkpoints);
    this.checkpoints = [];
    for (let g = 0; g < gates; g++) {
      const s = (g / gates) * total;
      const pose = this.sample(s);
      const half = pose.halfWidth;
      this.checkpoints.push({
        index: g,
        s,
        y: this.hillAt(s),
        x: pose.x,
        z: pose.z,
        tx: pose.tx,
        tz: pose.tz,
        heading: pose.heading,
        halfWidth: half,
        boundary: half + def.shoulder,
      });
    }
  }

  /** Position, tangent and width at arc length `s` (wraps around the loop). */
  sample(s: number): { x: number; z: number; tx: number; tz: number; heading: number; halfWidth: number } {
    const f = modLoop(s, this.length) / this.spacing;
    const i = Math.floor(f) % this.count;
    const j = (i + 1) % this.count;
    const t = f - Math.floor(f);
    let tx = lerp(this.tx[i], this.tx[j], t);
    let tz = lerp(this.tz[i], this.tz[j], t);
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    return {
      x: lerp(this.px[i], this.px[j], t),
      z: lerp(this.pz[i], this.pz[j], t),
      tx,
      tz,
      heading: headingOf(tx, tz),
      halfWidth: lerp(this.width[i], this.width[j], t) / 2,
    };
  }

  /** Where a vehicle sits on the grid: row `slot >> 1`, left/right alternating, behind the line. */
  gridPose(slot: number): TrackPose {
    const row = slot >> 1;
    const side = slot % 2 === 0 ? -1 : 1;
    const p = this.sample(this.length - (8 + row * 9) - (slot % 2) * 3);
    return { x: p.x - p.tz * side * (p.halfWidth * 0.32), z: p.z + p.tx * side * (p.halfWidth * 0.32), heading: p.heading };
  }

  /**
   * Where a vehicle respawns: the centre of the gate it last passed. Before it
   * has passed anything it goes back to its grid slot.
   */
  respawnPose(lastGate: number, started: boolean, slot: number): TrackPose {
    if (!started) return this.gridPose(slot);
    const c = this.checkpoints[lastGate % this.checkpoints.length];
    return { x: c.x, z: c.z, heading: c.heading };
  }

  /**
   * Projects (x, z) onto the centre line, searching a window of samples around
   * `hint` so a car stays on its own section of road even where two sections
   * pass close together. Use projectGlobal after a teleport.
   */
  project(x: number, z: number, hint: number, q: TrackQuery): void {
    const n = this.count;
    let best = Infinity;
    let bi = hint;
    let bt = 0;
    for (let k = -WINDOW; k <= WINDOW; k++) {
      const i = (((hint + k) % n) + n) % n;
      const t = this.segmentT(i, x, z);
      const j = i + 1 === n ? 0 : i + 1;
      const qx = this.px[i] + (this.px[j] - this.px[i]) * t;
      const qz = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
      const d2 = (x - qx) * (x - qx) + (z - qz) * (z - qz);
      if (d2 < best) {
        best = d2;
        bi = i;
        bt = t;
      }
    }
    this.fill(q, bi, bt, x, z);
  }

  /** Nearest point on the whole track (used after respawns and teleports). */
  projectGlobal(x: number, z: number, q: TrackQuery): void {
    let radius = 60;
    let found = 0;
    while (radius < 2000) {
      found = this.index.queryInto(this.scratch, x, z, radius);
      if (found > 0) break;
      radius *= 2;
    }
    let best = Infinity;
    let bi = 0;
    let bt = 0;
    const list = found > 0 ? this.scratch : this.refs;
    for (let m = 0; m < list.length; m++) {
      const i = list[m].i;
      const t = this.segmentT(i, x, z);
      const j = i + 1 === this.count ? 0 : i + 1;
      const qx = this.px[i] + (this.px[j] - this.px[i]) * t;
      const qz = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
      const d2 = (x - qx) * (x - qx) + (z - qz) * (z - qz);
      if (d2 < best) {
        best = d2;
        bi = i;
        bt = t;
      }
    }
    this.fill(q, bi, bt, x, z);
  }

  private segmentT(i: number, x: number, z: number): number {
    const j = i + 1 === this.count ? 0 : i + 1;
    const ax = this.px[i];
    const az = this.pz[i];
    const bx = this.px[j] - ax;
    const bz = this.pz[j] - az;
    const len2 = bx * bx + bz * bz || 1;
    return clamp(((x - ax) * bx + (z - az) * bz) / len2, 0, 1);
  }

  private fill(q: TrackQuery, i: number, t: number, x: number, z: number): void {
    const j = i + 1 === this.count ? 0 : i + 1;
    q.index = i;
    q.cx = this.px[i] + (this.px[j] - this.px[i]) * t;
    q.cz = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    let tx = this.tx[i] + (this.tx[j] - this.tx[i]) * t;
    let tz = this.tz[i] + (this.tz[j] - this.tz[i]) * t;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    q.tx = tx;
    q.tz = tz;
    q.heading = Math.atan2(tx, tz);
    q.s = (i + t) * this.spacing;
    // Right of travel is (-tz, tx).
    q.lateral = (x - q.cx) * -tz + (z - q.cz) * tx;
    q.halfWidth = (this.width[i] + (this.width[j] - this.width[i]) * t) / 2;
    q.boundary = q.halfWidth + this.def.shoulder;
  }

  /** How far the road is raised by hills at `s` (0 on a flat track). */
  hillAt(s: number): number {
    let y = 0;
    for (let i = 0; i < this.hills.length; i++) {
      const h = this.hills[i];
      const d = modLoop(s - h.s0, this.length);
      if (d < h.length) {
        const k = Math.sin((Math.PI * d) / h.length);
        y += h.height * k * k;
      }
    }
    return y;
  }

  /** Slope (rise over run) of the hills alone at `s`. */
  hillSlopeAt(s: number): number {
    let m = 0;
    for (let i = 0; i < this.hills.length; i++) {
      const h = this.hills[i];
      const d = modLoop(s - h.s0, this.length);
      if (d < h.length) m += ((h.height * Math.PI) / h.length) * Math.sin((2 * Math.PI * d) / h.length);
    }
    return m;
  }

  /** Ground height along the track: the hills plus any ramp (the whole corridor shares one profile). */
  heightAt(s: number): number {
    let y = this.hillAt(s);
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      const d = modLoop(s - r.s0, this.length);
      if (d <= r.length + 1e-9) {
        y += r.height * Math.min(1, d / r.length);
        break;
      }
    }
    return y;
  }

  /** Slope (rise over run) along the track at `s`. */
  slopeAt(s: number): number {
    let m = this.hillSlopeAt(s);
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      const d = modLoop(s - r.s0, this.length);
      if (d <= r.length + 1e-9) {
        m += r.height / r.length;
        break;
      }
    }
    return m;
  }

  /** True when `s` is on (or just before/after) a ramp, so scenery stays clear of it. */
  nearRamp(s: number, margin = 6): boolean {
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      const d = wrapLoop(s - (r.s0 + r.length / 2), this.length);
      if (Math.abs(d) <= r.length / 2 + margin) return true;
    }
    return false;
  }

  surfaceAt(q: TrackQuery): SurfaceProps {
    return Math.abs(q.lateral) <= q.halfWidth ? this.def.surfaces.road : this.def.surfaces.shoulder;
  }

  /**
   * Distance from (x, z) to the nearest boundary wall, negative inside the
   * corridor. Capped at `maxRange` so far-away queries are cheap.
   */
  distanceOutside(x: number, z: number, maxRange = 120): number {
    const found = this.coarse.queryInto(this.scratch, x, z, maxRange + this.maxBoundary);
    let best = maxRange;
    for (let m = 0; m < found; m++) {
      const r = this.scratch[m];
      const dx = x - r.x;
      const dz = z - r.z;
      const d = Math.sqrt(dx * dx + dz * dz) - (this.width[r.i] / 2 + this.def.shoulder);
      if (d < best) best = d;
    }
    return best;
  }

  /**
   * Like `distanceOutside`, but also says where along the lap the nearest road is,
   * accurate to a few centimetres: the terrain uses it to follow the road up and down hills.
   */
  nearest(x: number, z: number, maxRange: number, out: NearestResult): void {
    const found = this.coarse.queryInto(this.scratch, x, z, maxRange + this.maxBoundary);
    let bi = -1;
    let best = Infinity;
    for (let m = 0; m < found; m++) {
      const r = this.scratch[m];
      const d2 = (x - r.x) * (x - r.x) + (z - r.z) * (z - r.z);
      if (d2 < best) {
        best = d2;
        bi = r.i;
      }
    }
    if (bi < 0) {
      out.dist = maxRange;
      out.s = 0;
      return;
    }
    const n = this.count;
    best = Infinity;
    let bj = bi;
    let bt = 0;
    for (let k = -3; k <= 3; k++) {
      const i = (((bi + k) % n) + n) % n;
      const j = i + 1 === n ? 0 : i + 1;
      const t = this.segmentT(i, x, z);
      const qx = this.px[i] + (this.px[j] - this.px[i]) * t;
      const qz = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
      const d2 = (x - qx) * (x - qx) + (z - qz) * (z - qz);
      if (d2 < best) {
        best = d2;
        bj = i;
        bt = t;
      }
    }
    const j2 = bj + 1 === n ? 0 : bj + 1;
    const w = this.width[bj] + (this.width[j2] - this.width[bj]) * bt;
    out.dist = Math.min(maxRange, Math.sqrt(best) - (w / 2 + this.def.shoulder));
    out.s = (bj + bt) * this.spacing;
  }
}

/** Where `Track.nearest` leaves its answer (reused, so a query never allocates). */
export interface NearestResult {
  /** Distance to the nearest wall: negative inside the corridor, capped at the query's range. */
  dist: number;
  /** Arc length of the closest point on the centre line. */
  s: number;
}

export interface TrackProblem {
  kind: "overlap" | "tight" | "gates" | "hills";
  detail: string;
}

/**
 * Sanity checks a definition must pass: sections of the corridor that are far
 * apart along the loop never overlap (so progress cannot jump between them and
 * nobody can cut a corner across the infield), and corners are no tighter than
 * `minRadius`.
 */
export function validateTrack(track: Track, minRadius: number): TrackProblem[] {
  const problems: TrackProblem[] = [];
  const { count, spacing, length, def } = track;
  const apart = Math.max(60, track.def.roadWidth * 3);
  const step = 2;
  overlap: for (let i = 0; i < count; i += step) {
    for (let j = i + 1; j < count; j += step) {
      const along = Math.min((j - i) * spacing, length - (j - i) * spacing);
      if (along < apart) continue;
      const d = Math.hypot(track.px[i] - track.px[j], track.pz[i] - track.pz[j]);
      const need = track.width[i] / 2 + track.width[j] / 2 + def.shoulder * 2 + 4;
      if (d < need) {
        problems.push({ kind: "overlap", detail: `samples ${i} and ${j} are ${d.toFixed(1)}m apart, need ${need.toFixed(1)}m` });
        break overlap;
      }
    }
  }
  if (track.minRadius < minRadius) {
    problems.push({ kind: "tight", detail: `tightest corner radius ${track.minRadius.toFixed(1)}m < ${minRadius}m` });
  }
  if (track.checkpoints.length < 2) problems.push({ kind: "gates", detail: "needs at least 2 gates" });
  if (track.hills.length > 0) {
    let steepest = 0;
    for (let k = 0; k < count; k++) steepest = Math.max(steepest, Math.abs(track.hillSlopeAt(k * spacing)));
    if (steepest > MAX_HILL_SLOPE) problems.push({ kind: "hills", detail: `steepest hill slope ${steepest.toFixed(3)} > ${MAX_HILL_SLOPE}` });
    for (const ramp of track.ramps) {
      for (let d = -4; d <= ramp.length + 4; d += 2) {
        if (Math.abs(track.hillSlopeAt(ramp.s0 + d)) > 1e-3 || track.hillAt(ramp.s0 + d) > 1e-3) {
          problems.push({ kind: "hills", detail: `a ramp at s=${ramp.s0.toFixed(0)} sits on a hill` });
          break;
        }
      }
    }
  }
  return problems;
}
