import type { Rng } from "@/lib/rng";
import { FLIGHT, REED_BEDS } from "../config";
import type { DuckTuning } from "../levels";
import type { Duck, Vec3 } from "../types";
import { add, clamp, dist, headingOf, len, norm, rotateToward, scale, sub, wrapAngle } from "./vec";

export interface FlightTuning extends DuckTuning {
  hitRadius: number;
}

const between = (rng: Rng, r: readonly [number, number]) => r[0] + (r[1] - r[0]) * rng();
const horizontal = (d: Vec3): Vec3 => norm({ x: d.x, y: 0, z: d.z });

/** A point in front of the player. Successive points tend to swing across the view, which reads well. */
export function pickWaypoint(rng: Rng, t: FlightTuning, fromYaw?: number): Vec3 {
  let yaw: number;
  if (fromYaw === undefined || rng() < 0.35) yaw = (rng() * 2 - 1) * FLIGHT.yawSpread;
  else yaw = -Math.sign(fromYaw || 1) * (0.25 + 0.75 * rng()) * FLIGHT.yawSpread;
  const d = between(rng, t.distance);
  return { x: -Math.sin(yaw) * d, y: between(rng, t.altitude), z: -Math.cos(yaw) * d };
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
  const slot = o.slot ? vSlot(o.slot) : { x: 0, y: 0, z: 0 };
  const base = o.origin ?? spawnOrigin(o.from, rng, o.side ?? 1);
  const pos = o.from === "reeds" ? { x: base.x + (o.slot ? (rng() - 0.5) * 3 : 0), y: 0.15, z: base.z + (o.slot ? (rng() - 0.5) * 3 : 0) } : add(base, { x: slot.x, y: slot.y, z: slot.z });
  const waypoint = leader ? { ...leader.waypoint } : pickWaypoint(rng, tuning, o.from === "side" ? yawOf(pos) : undefined);
  const toward = horizontal(sub(waypoint, pos));
  const dir = o.from === "reeds" ? norm({ x: toward.x, y: 1.3, z: toward.z }) : toward;
  const speed = tuning.speed * (0.92 + rng() * 0.16);
  const cur = o.from === "reeds" ? speed * 0.35 : speed;
  return {
    id: o.id,
    flight: o.flight,
    hen: rng() < 0.35,
    target: o.target,
    pos,
    vel: scale(dir, cur),
    phase: o.from === "reeds" ? "takeoff" : "fly",
    phaseT: 0,
    age: 0,
    speed,
    cur,
    size: o.size,
    radius: tuning.hitRadius,
    waypoint,
    waypointsLeft: leader ? leader.waypointsLeft : Math.round(between(rng, tuning.waypoints)) - 1,
    flap: rng() * Math.PI * 2,
    flapRate: 8,
    glide: 0,
    bank: 0,
    seed: rng(),
    leader: leader ? leader.id : null,
    slot,
    quackIn: 1 + rng() * 4,
  };
}

/** A near miss: the duck (and its flock) scatter, speed up and jink. */
export function startle(d: Duck, rng: Rng, t: FlightTuning): void {
  if (d.phase === "hit" || d.phase === "gone" || d.phase === "exit") return;
  d.leader = null;
  d.phase = "startled";
  d.phaseT = 0;
  const side = rng() < 0.5 ? -1 : 1;
  const h = horizontal(d.vel);
  const right = { x: -h.z, y: 0, z: h.x };
  d.waypoint = add(d.pos, { x: h.x * 14 + right.x * side * 12, y: 5 + rng() * 4, z: h.z * 14 + right.z * side * 12 });
  d.waypoint.y = clamp(d.waypoint.y, t.altitude[0], t.altitude[1] + 6);
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
    const gap = len(to);
    desired = norm(add(to, scale(leader.vel, 0.6)));
    targetSpeed = leader.cur * clamp(1 + (gap - 0.4) * 0.18, 0.75, 1.5);
    if (leader.phase === "exit") {
      d.phase = "exit";
      d.phaseT = 0;
      d.waypoint = { ...leader.waypoint };
    }
  } else {
    const to = sub(d.waypoint, d.pos);
    desired = norm(to);
    const wobble = t.jink;
    if (wobble > 0) {
      const h = horizontal(desired);
      const right = { x: -h.z, y: 0, z: h.x };
      const sway = Math.sin(d.age * 1.7 + d.seed * 31) * 0.45 * wobble;
      const bob = Math.sin(d.age * 1.1 + d.seed * 17) * 0.22 * wobble;
      desired = norm({ x: desired.x + right.x * sway, y: desired.y + bob, z: desired.z + right.z * sway });
    }
    const arrived = len(to) < FLIGHT.arriveDistance;
    if (d.phase === "startled") {
      targetSpeed = d.speed * 1.45;
      if (d.phaseT > FLIGHT.startleTime || arrived) {
        d.phase = "fly";
        d.phaseT = 0;
        d.waypoint = pickWaypoint(rng, t, yawOf(d.pos));
      }
    } else if (d.phase === "fly") {
      if (arrived) {
        if (d.waypointsLeft > 0) {
          d.waypointsLeft--;
          d.waypoint = pickWaypoint(rng, t, yawOf(d.pos));
        } else {
          d.phase = "exit";
          d.phaseT = 0;
          d.waypoint = exitWaypoint(d, rng);
        }
      } else if (d.age > t.airTime + (d.target ? 0 : 4)) {
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
