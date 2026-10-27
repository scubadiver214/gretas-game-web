import type { Rng } from "@/lib/rng";
import { FLIGHT, REED_BEDS } from "../config";
import type { DuckTuning } from "../levels";
import type { Duck, FlightPattern, FormationId, GameDuckId, Vec3 } from "../types";
import { add, clamp, dist, headingOf, len, norm, rotateToward, scale, sub, wrapAngle } from "./vec";

/** Cruise speed and hit-sphere size relative to a mallard. The model carries the visual size. */
const DUCK_FLIGHT: Record<GameDuckId, { speed: number; hit: number }> = {
  mallard: { speed: 1, hit: 1 },
  woodDuck: { speed: 1.06, hit: 0.96 },
  pintail: { speed: 1.14, hit: 0.94 },
  teal: { speed: 1.24, hit: 0.86 },
  canvasback: { speed: 0.84, hit: 1.14 },
  shoveler: { speed: 0.96, hit: 1.04 },
};

const PATTERN_SPEED: Record<FlightPattern, number> = {
  patrol: 1,
  low: 1.16,
  high: 0.9,
  hook: 1.06,
  peel: 1,
  cross: 1.1,
};

const EARLY_DUCKS: readonly (readonly [GameDuckId, number])[] = [
  ["mallard", 5],
  ["teal", 3],
  ["woodDuck", 2],
  ["pintail", 1],
];
const MID_DUCKS: readonly (readonly [GameDuckId, number])[] = [
  ["mallard", 3],
  ["woodDuck", 3],
  ["pintail", 3],
  ["teal", 3],
  ["shoveler", 2],
  ["canvasback", 1],
];
const FULL_DUCKS: readonly (readonly [GameDuckId, number])[] = [
  ["mallard", 3],
  ["woodDuck", 2],
  ["pintail", 3],
  ["teal", 3],
  ["shoveler", 2],
  ["canvasback", 2],
];

function weightedDuck(rng: Rng, rows: readonly (readonly [GameDuckId, number])[]): GameDuckId {
  let total = 0;
  for (const row of rows) total += row[1];
  let x = rng() * total;
  for (const row of rows) {
    x -= row[1];
    if (x <= 0) return row[0];
  }
  return rows[rows.length - 1][0];
}

/** Which duck leads the next flock. Later levels, and every passing flock, use the full mix. */
export function rollSpecies(rng: Rng, levelNumber: number): GameDuckId {
  const table = levelNumber <= 1 ? EARLY_DUCKS : levelNumber === 2 ? MID_DUCKS : FULL_DUCKS;
  return weightedDuck(rng, table);
}

export function rollFormation(rng: Rng, size: number): FormationId {
  const pool: readonly FormationId[] = size <= 1 ? ["v"] : size === 2 ? ["v", "line", "echelon", "string"] : size === 3 ? ["v", "echelon", "line", "string", "stack"] : ["v", "echelon", "line", "string", "diamond", "stack", "chevron"];
  return pool[Math.floor(rng() * pool.length)];
}

export function rollPattern(rng: Rng, size: number): FlightPattern {
  const pool: FlightPattern[] = ["patrol", "patrol", "low", "high", "hook"];
  if (size >= 2) pool.push("peel", "cross", "cross");
  return pool[Math.floor(rng() * pool.length)];
}

function altitudeBand(pattern: FlightPattern, base: readonly [number, number]): readonly [number, number] {
  if (pattern === "low") return [4.4, 7.6];
  if (pattern === "high") {
    const lo = Math.max(12, Math.min(16, base[1] - 2));
    return [lo, Math.max(lo + 3, Math.min(22, base[1] + 3))];
  }
  return [base[0], base[1]];
}

/** A point across the view from `side`, still in front of the player. */
function acrossPoint(side: number, y: number, rng: Rng): Vec3 {
  const yaw = -Math.sign(side || 1) * (0.28 + rng() * 0.38);
  const d = 24 + rng() * 18;
  return { x: -Math.sin(yaw) * d, y, z: -Math.cos(yaw) * d };
}

export interface FlightTuning extends DuckTuning {
  hitRadius: number;
}

const between = (rng: Rng, r: readonly [number, number]) => r[0] + (r[1] - r[0]) * rng();
const horizontal = (d: Vec3): Vec3 => norm({ x: d.x, y: 0, z: d.z });

/** A point in front of the player. Successive points tend to swing across the view, which reads well. */
export function pickWaypoint(rng: Rng, t: FlightTuning, fromYaw?: number, altitude?: readonly [number, number]): Vec3 {
  let yaw: number;
  if (fromYaw === undefined || rng() < 0.35) yaw = (rng() * 2 - 1) * FLIGHT.yawSpread;
  else yaw = -Math.sign(fromYaw || 1) * (0.25 + 0.75 * rng()) * FLIGHT.yawSpread;
  const d = between(rng, t.distance);
  return { x: -Math.sin(yaw) * d, y: between(rng, altitude ?? t.altitude), z: -Math.cos(yaw) * d };
}

const yawOf = (p: Vec3) => Math.atan2(-p.x, -p.z);

function exitWaypoint(d: Duck, rng: Rng): Vec3 {
  const side = Math.sign(d.pos.x || rng() - 0.5);
  const yaw = -side * (1.25 + rng() * 0.4);
  const r = FLIGHT.exitDistance + 60;
  return { x: -Math.sin(yaw) * r, y: d.pos.y + 30 + rng() * 15, z: -Math.cos(yaw) * r };
}

/** Formation slot `i` (1, 2, ...) in a loose V behind the leader. */
export function vSlot(i: number): Vec3 {
  const side = i % 2 === 1 ? 1 : -1;
  const rank = Math.ceil(i / 2);
  return { x: side * 1.5 * rank, y: -0.25 * rank, z: 1.7 * rank };
}

/**
 * Slot `i` (1-based) in the leader's frame: x right, y up, z back.
 * `side` is the flock's entry side, used so an echelon trails to one side.
 */
export function formationSlot(kind: FormationId, i: number, side = 1): Vec3 {
  const wing = i % 2 === 1 ? 1 : -1;
  const rank = Math.ceil(i / 2);
  switch (kind) {
    case "v":
      return vSlot(i);
    case "echelon":
      return { x: Math.sign(side || 1) * 1.45 * i, y: -0.12 * i, z: 1.55 * i };
    case "line":
      return { x: wing * 2.15 * rank, y: (i % 3) * 0.18, z: 0.2 };
    case "string":
      return { x: wing * 0.4, y: -0.1 * i, z: 1.85 * i };
    case "diamond": {
      const seats: readonly Vec3[] = [
        { x: -1.9, y: 0.15, z: 1.5 },
        { x: 1.9, y: 0.15, z: 1.5 },
        { x: 0, y: 0.45, z: 3 },
        { x: -2.5, y: -0.1, z: 3.3 },
        { x: 2.5, y: -0.1, z: 3.3 },
        { x: 0, y: 0.2, z: 4.6 },
      ];
      return seats[i - 1] ?? vSlot(i);
    }
    case "stack":
      return { x: wing * 0.7, y: 1.7 * rank, z: 0.45 * i };
    case "chevron":
      return { x: wing * 2.45 * rank, y: 0.2 * (rank % 2), z: 1.2 * rank };
  }
}

export interface SpawnOptions {
  id: number;
  flight: number;
  from: "reeds" | "side";
  rng: Rng;
  tuning: FlightTuning;
  target: boolean;
  /** Spawn point for followers (shared with their leader). */
  origin?: Vec3;
  /** Side for `side` spawns: +1 left of the player, -1 right. */
  side?: number;
  leader?: Duck;
  slot?: number;
  size: number;
  species?: GameDuckId;
  pattern?: FlightPattern;
  formation?: FormationId;
}

/** Where a flight starts. Reed takeoffs leave from a reed bed; side flights come in from beyond the edge of the view. */
export function spawnOrigin(from: "reeds" | "side", rng: Rng, side: number): Vec3 {
  if (from === "reeds") {
    const bed = REED_BEDS[Math.floor(rng() * REED_BEDS.length)];
    return { x: bed.x + (rng() - 0.5) * 3, y: 0.15, z: bed.z + (rng() - 0.5) * 3 };
  }
  const yaw = side * (1.65 + rng() * 0.25);
  const r = 34 + rng() * 16;
  return { x: -Math.sin(yaw) * r, y: 9 + rng() * 7, z: -Math.cos(yaw) * r };
}

export function spawnDuck(o: SpawnOptions): Duck {
  const { rng, tuning } = o;
  const leader = o.leader;
  const species = o.species ?? "mallard";
  const pattern = o.pattern ?? "patrol";
  const formation = o.formation ?? "v";
  const slot = o.slot ? formationSlot(formation, o.slot, o.side ?? 1) : { x: 0, y: 0, z: 0 };
  const alt = leader ? leader.alt : altitudeBand(pattern, tuning.altitude);
  const base = o.origin ?? spawnOrigin(o.from, rng, o.side ?? 1);
  const frame = leader ? horizontal(leader.vel) : { x: 0, y: 0, z: -1 };
  const right0 = { x: -frame.z, y: 0, z: frame.x };
  const pos = o.from === "reeds"
    ? { x: base.x + (o.slot ? (rng() - 0.5) * 3 : 0), y: 0.15, z: base.z + (o.slot ? (rng() - 0.5) * 3 : 0) }
    : {
        x: base.x + right0.x * slot.x + frame.x * -slot.z,
        y: base.y + slot.y,
        z: base.z + right0.z * slot.x + frame.z * -slot.z,
      };
  const crossing = pattern === "cross" || pattern === "hook";
  const waypoint = leader ? { ...leader.waypoint } : crossing ? acrossPoint(o.side ?? 1, between(rng, alt), rng) : pickWaypoint(rng, tuning, o.from === "side" ? yawOf(pos) : undefined, alt);
  const toward = horizontal(sub(waypoint, pos));
  const dir = o.from === "reeds" ? norm({ x: toward.x, y: 1.3, z: toward.z }) : toward;
  const flightStats = DUCK_FLIGHT[species];
  const speed = tuning.speed * flightStats.speed * PATTERN_SPEED[pattern] * (0.94 + rng() * 0.12);
  const cur = o.from === "reeds" ? speed * 0.35 : speed;
  const waypointsLeft = leader ? leader.waypointsLeft : pattern === "hook" ? 1 : pattern === "cross" ? 0 : Math.round(between(rng, tuning.waypoints)) - 1;
  return {
    id: o.id,
    flight: o.flight,
    species,
    hen: rng() < 0.34,
    pattern,
    target: o.target,
    pos,
    vel: scale(dir, cur),
    phase: o.from === "reeds" ? "takeoff" : "fly",
    phaseT: 0,
    age: 0,
    speed,
    cur,
    size: o.size,
    radius: tuning.hitRadius * flightStats.hit,
    waypoint,
    waypointsLeft,
    flap: rng() * Math.PI * 2,
    flapRate: 8,
    glide: 0,
    bank: 0,
    seed: rng(),
    leader: leader ? leader.id : null,
    slot,
    peelAt: leader && pattern === "peel" ? 2.3 + rng() * 2.1 : 0,
    alt,
    quackIn: 1 + rng() * 4,
  };
}

/** Break formation. This duck peels onto its own fast, crooked path. */
export function startle(d: Duck, rng: Rng, t: FlightTuning): void {
  if (d.phase === "hit" || d.phase === "gone" || d.phase === "exit") return;
  d.leader = null;
  d.peelAt = 0;
  d.phase = "startled";
  d.phaseT = 0;
  const h = horizontal(d.vel);
  const right = { x: -h.z, y: 0, z: h.x };
  const side = rng() * 2 - 1;
  d.waypoint = add(d.pos, {
    x: h.x * (8 + rng() * 8) + right.x * side * (16 + rng() * 10),
    y: (rng() - 0.35) * 8,
    z: h.z * (8 + rng() * 8) + right.z * side * (16 + rng() * 10),
  });
  d.waypoint.y = clamp(d.waypoint.y, FLIGHT.minAltitude + 0.4, Math.max(d.alt[1], t.altitude[1]) + 8);
  d.waypointsLeft = Math.max(d.waypointsLeft, 1);
}

export function isAirborne(d: Duck): boolean {
  return d.phase === "takeoff" || d.phase === "fly" || d.phase === "startled" || d.phase === "exit";
}

/**
 * Advance one duck. Steering is a turn-rate-limited chase of the current waypoint
 * (or of the formation slot behind the leader), with a little sinusoidal wander,
 * so paths curve naturally and never snap.
 */
export function stepDuck(d: Duck, dt: number, rng: Rng, t: FlightTuning, find: (id: number) => Duck | undefined): void {
  if (d.phase === "gone") return;
  d.age += dt;
  d.phaseT += dt;
  d.quackIn -= dt;

  if (d.phase === "hit") {
    d.vel = scale(d.vel, Math.max(0, 1 - dt * 5));
    d.pos = add(d.pos, { x: d.vel.x * dt, y: d.vel.y * dt + dt * 0.9, z: d.vel.z * dt });
    if (d.phaseT > 0.7) d.phase = "gone";
    return;
  }

  let leader = d.leader !== null ? find(d.leader) : undefined;
  if (d.leader !== null && (!leader || !isAirborne(leader))) {
    // Leader is gone: take over its route, or scatter if it was just hit.
    const wasHit = leader?.phase === "hit";
    if (leader) {
      d.waypoint = { ...leader.waypoint };
      d.waypointsLeft = leader.waypointsLeft;
    }
    d.leader = null;
    leader = undefined;
    if (wasHit) startle(d, rng, t);
  }

  if (d.peelAt > 0 && d.age >= d.peelAt && d.leader !== null && (d.phase === "fly" || d.phase === "startled")) {
    d.leader = null;
    d.peelAt = 0;
    d.phase = "fly";
    d.phaseT = 0;
    leader = undefined;
    d.waypoint = pickWaypoint(rng, t, yawOf(d.pos), d.alt);
    d.waypointsLeft = Math.max(d.waypointsLeft, 1);
  }

  const dir0 = norm(d.vel);
  let desired: Vec3;
  let targetSpeed = d.speed;

  if (d.phase === "takeoff") {
    const h = horizontal(sub(d.waypoint, d.pos));
    desired = norm({ x: h.x, y: 1.1, z: h.z });
    targetSpeed = d.speed * 0.9;
    if (d.phaseT > FLIGHT.takeoffTime) {
      d.phase = "fly";
      d.phaseT = 0;
    }
  } else if (leader && d.phase !== "exit") {
    const lh = horizontal(leader.vel);
    const right = { x: -lh.z, y: 0, z: lh.x };
    const slotWorld = {
      x: leader.pos.x + right.x * d.slot.x + lh.x * -d.slot.z,
      y: leader.pos.y + d.slot.y,
      z: leader.pos.z + right.z * d.slot.x + lh.z * -d.slot.z,
    };
    const to = sub(slotWorld, d.pos);
    const along = to.x * lh.x + to.z * lh.z;
    desired = norm(add(to, scale(leader.vel, 0.55)));
    // Speed up when the slot is ahead, ease off when this duck has overrun it.
    targetSpeed = leader.cur * clamp(1 + along * 0.42, 0.45, 1.7);
    if (leader.phase === "exit") {
      d.phase = "exit";
      d.phaseT = 0;
      d.waypoint = { ...leader.waypoint };
    }
  } else {
    const to = sub(d.waypoint, d.pos);
    desired = norm(to);
    const wobble = t.jink * (d.phase === "startled" ? 2.2 : 1);
    if (wobble > 0) {
      const h = horizontal(desired);
      const right = { x: -h.z, y: 0, z: h.x };
      const sway = Math.sin(d.age * 1.7 + d.seed * 31) * 0.45 * wobble;
      const bob = Math.sin(d.age * 1.1 + d.seed * 17) * 0.22 * wobble;
      desired = norm({ x: desired.x + right.x * sway, y: desired.y + bob, z: desired.z + right.z * sway });
    }
    const arrived = len(to) < FLIGHT.arriveDistance;
    if (d.phase === "startled") {
      targetSpeed = d.speed * FLIGHT.startleSpeed;
      if (d.phaseT > FLIGHT.startleTime) {
        d.phase = "fly";
        d.phaseT = 0;
        d.waypoint = pickWaypoint(rng, t, yawOf(d.pos), d.alt);
      } else if (arrived) {
        const h = horizontal(d.vel);
        const right = { x: -h.z, y: 0, z: h.x };
        const side = rng() < 0.5 ? -1 : 1;
        d.waypoint = add(d.pos, { x: h.x * 9 + right.x * side * 18, y: (rng() - 0.4) * 7, z: h.z * 9 + right.z * side * 18 });
        d.waypoint.y = clamp(d.waypoint.y, FLIGHT.minAltitude + 0.4, Math.max(d.alt[1], t.altitude[1]) + 8);
      }
    } else if (d.phase === "fly") {
      if (arrived) {
        if (d.pattern === "hook" && d.waypointsLeft > 0) {
          d.waypointsLeft = 0;
          d.waypoint = { x: -d.pos.x * 0.75, y: clamp(d.pos.y + 1.2, d.alt[0], d.alt[1] + 3), z: Math.min(-18, d.pos.z - 4) };
        } else if (d.waypointsLeft > 0) {
          d.waypointsLeft--;
          d.waypoint = pickWaypoint(rng, t, yawOf(d.pos), d.alt);
        } else {
          d.phase = "exit";
          d.phaseT = 0;
          d.waypoint = exitWaypoint(d, rng);
        }
      } else if (d.age > t.airTime * (d.pattern === "hook" ? 1.75 : 1) + (d.target ? 0 : 4)) {
        d.phase = "exit";
        d.phaseT = 0;
        d.waypoint = exitWaypoint(d, rng);
      }
    } else if (d.phase === "exit") {
      targetSpeed = d.speed * 1.2;
    }
  }

  if (d.pos.y < FLIGHT.minAltitude && d.phase !== "takeoff") desired = norm({ x: desired.x, y: Math.max(desired.y, 0.45), z: desired.z });

  const turn = FLIGHT.turnRate * (d.phase === "startled" ? 1.7 : d.phase === "takeoff" ? 1.3 : 1) * (leader ? 1.4 : 1) * dt;
  const dir = rotateToward(dir0, desired, turn);
  const yawRate = wrapAngle(headingOf(dir) - headingOf(dir0)) / Math.max(dt, 1e-4);
  d.bank += (clamp(yawRate * 0.6, -0.95, 0.95) - d.bank) * Math.min(1, dt * 4);
  d.cur += (targetSpeed - d.cur) * Math.min(1, dt * 1.6);
  d.vel = scale(dir, d.cur);
  d.pos = add(d.pos, scale(d.vel, dt));

  // Wings: fast beats on takeoff and climbs, held still in descents and the odd glide.
  const rate = d.phase === "takeoff" ? 9 : d.phase === "startled" ? 7.8 : dir.y > 0.22 ? 7 : 5.4;
  let glide = 0;
  if ((d.phase === "fly" || d.phase === "exit") && !leader) {
    if (dir.y < -0.14) glide = 1;
    else if (Math.sin(d.age * 0.55 + d.seed * 20) > 0.8) glide = 0.9;
  }
  d.glide += (glide - d.glide) * Math.min(1, dt * 2.5);
  d.flapRate = rate;
  d.flap += Math.PI * 2 * rate * dt * (1 - d.glide * 0.97);

  if (d.phase === "exit") {
    const far = Math.hypot(d.pos.x, d.pos.z) > FLIGHT.exitDistance || d.pos.y > 80 || dist(d.pos, d.waypoint) < 6;
    if (far) d.phase = "gone";
  }
}
