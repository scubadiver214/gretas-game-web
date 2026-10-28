import { MOTION, MOTION_NOTES, type FlavorMotion } from "./motionConfig";
import { saucePoints } from "./layout";
import { loadBand, loadRatio, type LoadBand } from "./load";
import { meltAmount, meltStage, type MeltStage } from "./melt";

export interface ScoopBody {
  index: number;
  cx: number;
  cy: number;
  r: number;
  flavorId: string;
  color: string;
  motion: FlavorMotion;
}

export interface PieceBody {
  key: string;
  homeX: number;
  homeY: number;
  weight: number;
  seed: number;
  heavy: boolean;
}

export interface SauceBody {
  id: string;
  color: string;
  speed: number;
  width: number;
  index: number;
}

export interface SceneInput {
  scoops: ScoopBody[];
  pieces: PieceBody[];
  sauces: SauceBody[];
  extraWeight: number;
  serve: "cone" | "cup" | "none";
  hasSprinkles: boolean;
}

export interface Clock {
  /** Seconds since the first scoop of this dessert. */
  elapsed: number;
  scoopAges: number[];
  pieceAges: number[];
}

export interface ScoopPose {
  index: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  rot: number;
  sx: number;
  sy: number;
}

export interface PiecePose {
  key: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  rot: number;
  sx: number;
  sy: number;
  opacity: number;
}

export interface DripPose {
  index: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
}

export interface SaucePose {
  id: string;
  d: string;
  dash: number;
  width: number;
  dropX: number;
  dropY: number;
  dropOpacity: number;
}

export interface PuddlePose {
  rx: number;
  ry: number;
  opacity: number;
  color: string;
  accentRx: number;
  accentOpacity: number;
  accentColor: string;
  accentCx: number;
}

export interface MotionSnapshot {
  stage: MeltStage;
  band: LoadBand;
  melt: number;
  load: number;
}

export interface MotionFrame extends MotionSnapshot {
  sig: string;
  scoops: ScoopPose[];
  crown: ScoopPose | null;
  pieces: PiecePose[];
  drips: DripPose[];
  sauces: SaucePose[];
  puddle: PuddlePose;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeOutBack(u: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
}

function easeOutCubic(u: number): number {
  return 1 - (1 - u) ** 3;
}

export function scoopPose(scoop: ScoopBody, age: number, elapsed: number, melt: number, bounceAge: number, impulse: number): ScoopPose {
  const softened = melt * scoop.motion.meltRate;
  const tx = 0;
  let ty = 0;
  let rot = 0;
  let sx = 1;
  let sy = 1;
  const drop = MOTION.scoopDropSeconds;
  if (age < drop) {
    const u = clamp(age / drop, 0, 1);
    ty = -MOTION.scoopDropHeight * (1 - easeOutBack(u));
    if (u < 0.62) {
      sx = MOTION.scoopStretchX;
      sy = MOTION.scoopStretchY;
    } else {
      const squash = Math.sin(((u - 0.62) / 0.38) * Math.PI);
      sx = 1 + MOTION.scoopSquashX * squash;
      sy = 1 - MOTION.scoopSquashY * squash;
    }
  } else {
    rot = Math.sin(elapsed * MOTION.idleSpeed + scoop.index) * MOTION.idleDegrees;
    const settle = (elapsed + scoop.index * 0.8) % MOTION.settleEvery;
    if (settle < MOTION.settleWindow) {
      sy -= MOTION.settleSquash * Math.sin((settle / MOTION.settleWindow) * Math.PI);
    }
  }
  ty += softened * MOTION.meltSag;
  sy *= 1 - softened * MOTION.meltSquash;
  sx *= 1 + softened * MOTION.meltSpread;
  if (bounceAge >= 0 && bounceAge < MOTION.bounceSeconds) {
    const k = bounceAge / MOTION.bounceSeconds;
    ty += Math.sin(k * Math.PI) * MOTION.bouncePx;
  }
  if (impulse > 0) rot += Math.sin(impulse * Math.PI * 0.5) * MOTION.impactWobble;
  return { index: scoop.index, cx: scoop.cx, cy: scoop.cy, tx, ty, rot, sx, sy };
}

interface LocalPiece {
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  opacity: number;
}

/** Motion relative to the topping's home, before it is stuck onto the scoop. */
export function localPiecePose(piece: PieceBody, age: number, elapsed: number, band: LoadBand, melt: number): LocalPiece {
  const drop = MOTION.toppingDropSeconds;
  if (age < drop) {
    const u = clamp(age / drop, 0, 1);
    const y = piece.homeY - (1 - easeOutCubic(u)) * MOTION.toppingDropHeight;
    let sx = 0.9;
    let sy = 1.12;
    if (u > 0.72) {
      const squash = Math.sin(((u - 0.72) / 0.28) * Math.PI);
      sx = 1 + 0.18 * squash;
      sy = 1 - 0.22 * squash;
    }
    return { x: piece.homeX, y, rot: 0, sx, sy, opacity: u < 0.08 ? u / 0.08 : 1 };
  }

  const settled = age - drop;
  if (band === "stable") {
    return { x: piece.homeX, y: piece.homeY, rot: Math.sin(elapsed * MOTION.idleSpeed + piece.seed * 5) * 3, sx: 1, sy: 1, opacity: 1 };
  }
  if (band === "stir") {
    return {
      x: piece.homeX + Math.sin(elapsed * 1.6 + piece.seed * 8) * 2.5,
      y: piece.homeY,
      rot: Math.sin(elapsed * 2 + piece.seed) * 8,
      sx: 1,
      sy: 1,
      opacity: 1,
    };
  }

  const falling = band === "fall" || band === "overflow";
  const cut = band === "slide" ? MOTION.slideChance : band === "fall" ? MOTION.fallChance : MOTION.overflowChance;
  if (piece.seed > cut) {
    const amp = piece.heavy ? 10 : 6;
    return {
      x: piece.homeX + Math.sin(elapsed * 1.8 + piece.seed) * (piece.heavy ? 3 : 1.5),
      y: piece.homeY,
      rot: Math.sin(elapsed * 2.4 + piece.seed * 4) * amp,
      sx: 1,
      sy: 1,
      opacity: 1,
    };
  }

  const dir = piece.seed > 0.5 ? 1 : -1;
  if (!falling) {
    const local = Math.max(0, settled - piece.seed * 1.2);
    const along = Math.sin(((local % MOTION.slideCycle) / MOTION.slideCycle) * Math.PI);
    const spread = 0.7 + melt;
    return {
      x: piece.homeX + dir * along * MOTION.slideDistance * spread,
      y: piece.homeY + along * MOTION.slideDrop * spread,
      rot: dir * along * 28,
      sx: 1,
      sy: 1,
      opacity: 1,
    };
  }

  const cycle = band === "overflow" ? MOTION.overflowCycle : MOTION.fallCycle;
  const local = Math.max(0, settled - piece.seed * cycle * 0.85);
  const phase = (local % cycle) / cycle;
  if (phase < 0.5) {
    const along = phase / 0.5;
    return {
      x: piece.homeX + dir * along * 16,
      y: piece.homeY + along * 22,
      rot: dir * along * 20,
      sx: 1,
      sy: 1,
      opacity: phase < 0.08 ? phase / 0.08 : 1,
    };
  }
  if (phase < 0.82) {
    const ft = (phase - 0.5) / 0.32;
    const startY = piece.homeY + 22;
    return {
      x: piece.homeX + dir * (16 + ft * 30),
      y: startY + (MOTION.counterY - startY) * ft * ft,
      rot: dir * (20 + ft * 160),
      sx: 1,
      sy: 1,
      opacity: 1,
    };
  }
  const ft = (phase - 0.82) / 0.18;
  return {
    x: piece.homeX + dir * 46,
    y: MOTION.counterY,
    rot: dir * 80,
    sx: 1 - ft * 0.15,
    sy: 0.72,
    opacity: 1 - ft,
  };
}

export function transformPoint(x: number, y: number, pose: ScoopPose): { x: number; y: number } {
  const px = (x - pose.cx) * pose.sx;
  const py = (y - pose.cy) * pose.sy;
  const rad = (pose.rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;
  return { x: rx + pose.cx + pose.tx, y: ry + pose.cy + pose.ty };
}

function stickToScoop(local: LocalPiece, piece: PieceBody, pose: ScoopPose): { x: number; y: number } {
  const attached = transformPoint(local.x, local.y, pose);
  const span = Math.max(40, MOTION.counterY - piece.homeY);
  const t = clamp((local.y - piece.homeY) / span, 0, 1);
  return {
    x: attached.x * (1 - t) + local.x * t,
    y: attached.y * (1 - t) + local.y * t,
  };
}

export function dripPhase(elapsed: number, speed: number, index: number): number {
  const period = MOTION.dripPeriod / Math.max(0.2, speed);
  return ((elapsed + index * 0.41) % period) / period;
}

export function flowT(elapsed: number, speed: number, index: number): number {
  return (elapsed * speed * 0.35 + index * 0.17) % 1;
}

function quadPoint(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function bounceAgeFor(index: number, ages: readonly number[]): number {
  let newest = Number.POSITIVE_INFINITY;
  for (let j = index + 1; j < ages.length; j++) {
    if (ages[j] < newest) newest = ages[j];
  }
  return newest < MOTION.bounceSeconds ? newest : -1;
}

function landingImpulse(pieces: readonly PieceBody[], ages: readonly number[]): number {
  let impulse = 0;
  const drop = MOTION.toppingDropSeconds;
  pieces.forEach((piece, index) => {
    if (!piece.heavy) return;
    const dt = Math.abs((ages[index] ?? 0) - drop);
    if (dt < 0.18) impulse = Math.max(impulse, 1 - dt / 0.18);
  });
  return impulse;
}

function placeDrip(index: number, anchorX: number, anchorY: number, elapsed: number, speed: number, width: number, color: string, outward: number): DripPose {
  const phase = dripPhase(elapsed, speed, index);
  if (phase < 0.4) {
    const k = phase / 0.4;
    return { index, cx: anchorX, cy: anchorY + k * 14, rx: 3.4 * width, ry: 4 + k * 12, color, opacity: 0.9 };
  }
  if (phase < 0.75) {
    const k = (phase - 0.4) / 0.35;
    return { index, cx: anchorX + outward * k * 8, cy: anchorY + 14 + k * 34, rx: 3.1 * width, ry: 10 + k * 6, color, opacity: 0.92 };
  }
  const k = (phase - 0.75) / 0.25;
  return { index, cx: anchorX + outward * 8, cy: anchorY + 48 + k * 80, rx: 2.8 * width, ry: 8, color, opacity: 1 - k };
}

function buildDrips(scene: SceneInput, scoops: readonly ScoopPose[], melt: number, band: LoadBand, elapsed: number): DripPose[] {
  const drips: DripPose[] = [];
  const iceCount = melt < MOTION.dripMeltStart ? 0 : Math.min(MOTION.maxDrips, Math.ceil((melt - 0.12) * 8));
  for (let i = 0; i < iceCount && drips.length < MOTION.maxDrips; i++) {
    const scoop = scene.scoops[i % scene.scoops.length];
    const pose = scoops[i % scoops.length];
    if (!scoop || !pose) break;
    const side = i % 2 === 0 ? -1 : 1;
    const theta = Math.PI / 2 + side * (0.35 + (i % 3) * 0.28);
    const anchor = transformPoint(scoop.cx + Math.cos(theta) * scoop.r * 0.72, scoop.cy + Math.sin(theta) * scoop.r * 0.42, pose);
    drips.push(placeDrip(i, anchor.x, anchor.y, elapsed, scoop.motion.dripSpeed, scoop.motion.dripWidth, scoop.color, side));
  }
  const syrup = band === "overflow" || melt > 0.45;
  if (syrup) {
    scene.sauces.forEach((sauce) => {
      if (drips.length >= MOTION.maxDrips) return;
      const top = scene.scoops[scene.scoops.length - 1];
      const pose = scoops[scoops.length - 1];
      if (!top || !pose) return;
      const side = sauce.index % 2 === 0 ? -1 : 1;
      const anchor = transformPoint(top.cx + side * top.r * 0.45, top.cy + top.r * 0.35, pose);
      const speed = sauce.speed * (band === "overflow" ? 1.35 : 1);
      drips.push(placeDrip(drips.length, anchor.x, anchor.y, elapsed, speed, sauce.width / 10, sauce.color, side));
    });
  }
  return drips;
}

function buildPuddle(scene: SceneInput, melt: number, band: LoadBand): PuddlePose {
  const overflow = band === "overflow" ? 0.2 : band === "fall" ? 0.08 : 0;
  const fromMelt = melt < MOTION.puddleMeltStart ? 0 : (melt - MOTION.puddleMeltStart) * 1.35;
  const opacity = clamp(fromMelt + overflow, 0, 0.8);
  const bottom = scene.scoops[0];
  const accent = scene.sauces[0]?.color ?? scene.scoops[1]?.color ?? "";
  return {
    rx: 16 + opacity * 78,
    ry: 5 + opacity * 16,
    opacity,
    color: bottom?.color ?? "#f6e7c1",
    accentRx: 10 + opacity * 40,
    accentOpacity: accent ? opacity * 0.85 : 0,
    accentColor: accent || "#fff",
    accentCx: 176,
  };
}

function sauceExtra(melt: number, band: LoadBand): number {
  return (band === "overflow" ? 46 : 0) + melt * 34;
}

export function noticeBetween(before: MotionSnapshot | null, after: MotionSnapshot, hasSprinkles: boolean): string | null {
  if (!before) return null;
  const stageRank = { fresh: 0, soft: 1, melting: 2, super: 3 };
  const bandRank = { stable: 0, stir: 1, slide: 2, fall: 3, overflow: 4 };
  const bandUp = bandRank[after.band] > bandRank[before.band];
  const stageUp = stageRank[after.stage] > stageRank[before.stage];
  if (bandUp && after.band === "overflow") return MOTION_NOTES.messy;
  if (bandUp && after.band === "fall") return MOTION_NOTES.overload;
  if (bandUp && hasSprinkles && before.band === "stable" && (after.band === "stir" || after.band === "slide")) return MOTION_NOTES.sprinkles;
  if (stageUp && after.stage === "super") return MOTION_NOTES.messy;
  if (stageUp && after.stage === "melting") return MOTION_NOTES.hurry;
  if (stageUp && after.stage === "soft") return MOTION_NOTES.melting;
  return null;
}

export function computeFrame(scene: SceneInput, clock: Clock): MotionFrame {
  const elapsed = Math.max(0, clock.elapsed);
  const melt = scene.scoops.length === 0 ? 0 : meltAmount(elapsed);
  const stage = scene.scoops.length === 0 ? "fresh" : meltStage(elapsed);
  const top = scene.scoops.reduce<ScoopBody | null>((best, scoop) => (!best || scoop.cy < best.cy ? scoop : best), null);
  const ratio = loadRatio({
    pieceWeight: scene.pieces.reduce((sum, piece) => sum + piece.weight, 0),
    sauceCount: scene.sauces.length,
    extraWeight: scene.extraWeight,
    scoopCount: scene.scoops.length,
    topRadius: top?.r ?? 74,
    serve: scene.serve,
    melt,
  });
  const band = loadBand(ratio);
  const impulse = landingImpulse(scene.pieces, clock.pieceAges);
  const scoops = scene.scoops.map((scoop, index) => {
    const above = index === scene.scoops.length - 1;
    return scoopPose(scoop, clock.scoopAges[index] ?? 0, elapsed, melt, bounceAgeFor(index, clock.scoopAges), above ? impulse : impulse * 0.35);
  });
  const crown = scoops.reduce<ScoopPose | null>((best, pose) => (!best || pose.cy < best.cy ? pose : best), null);
  const pieces = scene.pieces.map((piece, index) => {
    const local = localPiecePose(piece, clock.pieceAges[index] ?? 0, elapsed, band, melt);
    const stuck = crown ? stickToScoop(local, piece, crown) : { x: local.x, y: local.y };
    return { key: piece.key, x: stuck.x, y: stuck.y, homeX: piece.homeX, homeY: piece.homeY, rot: local.rot, sx: local.sx, sy: local.sy, opacity: local.opacity };
  });
  const extra = sauceExtra(melt, band);
  const sauces = scene.sauces.map((sauce) => {
    const anchor = top ?? { cx: 160, cy: 280, r: 60 };
    const [p0, p1, p2] = saucePoints(anchor, sauce.index, extra);
    const t = flowT(elapsed, sauce.speed, sauce.index);
    const drop = p0 && p1 && p2 ? quadPoint(p0, p1, p2, t) : { x: anchor.cx, y: anchor.cy };
    const end = p2 ?? drop;
    return {
      id: sauce.id,
      d: `M ${p0?.x ?? anchor.cx} ${p0?.y ?? anchor.cy} Q ${p1?.x ?? anchor.cx} ${p1?.y ?? anchor.cy} ${end.x} ${end.y}`,
      dash: -elapsed * 28 * sauce.speed,
      width: sauce.width,
      dropX: drop.x,
      dropY: drop.y,
      dropOpacity: 0.95,
    };
  });
  return {
    sig: `${scene.scoops.map((scoop) => scoop.flavorId).join(".")}|${scene.pieces.map((piece) => piece.key).join(".")}|${scene.sauces.map((sauce) => sauce.id).join(".")}`,
    stage,
    band,
    melt,
    load: ratio,
    scoops,
    crown,
    pieces,
    drips: scene.scoops.length === 0 ? [] : buildDrips(scene, scoops, melt, band, elapsed),
    sauces,
    puddle: scene.scoops.length === 0 ? { rx: 8, ry: 3, opacity: 0, color: "#f6e7c1", accentRx: 6, accentOpacity: 0, accentColor: "#fff", accentCx: 176 } : buildPuddle(scene, melt, band),
  };
}
