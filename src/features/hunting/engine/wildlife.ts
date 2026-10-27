import type { Rng } from "@/lib/rng";
import { HERON_SPOTS, KINGFISHER_PERCH, LILY_PADS, LOON_HOME, MALLARD_SWIM_HOME, SWAN_HOME, TURTLE_LOG, WOOD_DUCK_HOME } from "../config";
import type { Animal, AnimalAction, SpeciesId, Vec3 } from "../types";
import { lakeDist } from "./lake";
import { rayPointDistance } from "./shooting";
import { clamp, dist, lerp, wrapAngle } from "./vec";

interface Body {
  radius: number;
  centerY: number;
  speed: number;
}

const BODY: Record<SpeciesId, Body> = {
  mallard: { radius: 0.42, centerY: 0.12, speed: 0.55 },
  woodDuck: { radius: 0.38, centerY: 0.12, speed: 0.5 },
  swan: { radius: 0.95, centerY: 0.45, speed: 0.35 },
  heron: { radius: 0.75, centerY: 1.0, speed: 0.25 },
  turtle: { radius: 0.3, centerY: 0.08, speed: 0 },
  frog: { radius: 0.16, centerY: 0.06, speed: 0 },
  kingfisher: { radius: 0.26, centerY: 0, speed: 9 },
  loon: { radius: 0.55, centerY: 0.1, speed: 0.45 },
  // Flying-only game ducks. They are never placed on the water; the record stays complete for the species id.
  pintail: { radius: 0.4, centerY: 0.12, speed: 0.6 },
  teal: { radius: 0.28, centerY: 0.1, speed: 0.7 },
  canvasback: { radius: 0.5, centerY: 0.14, speed: 0.4 },
  shoveler: { radius: 0.42, centerY: 0.12, speed: 0.48 },
};

export const SWIMMERS: ReadonlySet<SpeciesId> = new Set(["mallard", "woodDuck", "swan", "loon"]);

const between = (rng: Rng, a: number, b: number) => a + (b - a) * rng();

export const animalCenter = (a: Animal): Vec3 => ({ x: a.pos.x, y: a.pos.y + a.centerY, z: a.pos.z });

let nextId = 1000;

function make(species: SpeciesId, pos: Vec3, rng: Rng, opts: Partial<Animal> = {}): Animal {
  const body = BODY[species];
  return {
    id: nextId++,
    species,
    pos: { ...pos },
    heading: rng() * Math.PI * 2,
    action: "swim",
    actionT: 0,
    actionLen: between(rng, 3, 7),
    visible: true,
    radius: body.radius,
    centerY: body.centerY,
    home: { ...pos },
    range: 6,
    goal: { ...pos },
    from: { ...pos },
    seed: rng(),
    flap: 0,
    speed: body.speed,
    variant: 0,
    stage: 0,
    ...opts,
  };
}

/** A swimming goal near home that is still well inside the water. */
function swimGoal(a: Animal, rng: Rng): Vec3 {
  for (let i = 0; i < 12; i++) {
    const r = a.range * Math.sqrt(rng());
    const t = rng() * Math.PI * 2;
    const p = { x: a.home.x + Math.cos(t) * r, y: 0, z: a.home.z + Math.sin(t) * r };
    if (lakeDist(p.x, p.z) < 0.96 && p.z < -5) return p;
  }
  return { ...a.home };
}

export interface WildlifeOptions {
  /** Explorer mode: swimming ducks and more frequent kingfisher visits. */
  explore: boolean;
}

export function createWildlife(rng: Rng, opts: WildlifeOptions): Animal[] {
  const out: Animal[] = [];
  out.push(make("swan", { x: SWAN_HOME.x, y: 0, z: SWAN_HOME.z }, rng, { range: 14 }));
  out.push(make("swan", { x: SWAN_HOME.x + 3, y: 0, z: SWAN_HOME.z - 2 }, rng, { range: 14, variant: 1 }));
  out.push(make("loon", { ...LOON_HOME }, rng, { range: 12, actionLen: between(rng, 6, 12) }));
  const heronSpot = HERON_SPOTS[0];
  out.push(make("heron", { ...heronSpot }, rng, { action: "stand", heading: 2.2, range: 2.5 }));
  out.push(
    make("turtle", { x: TURTLE_LOG.x + 0.5, y: 0.36, z: TURTLE_LOG.z + 0.2 }, rng, {
      action: "bask",
      heading: TURTLE_LOG.yaw + Math.PI / 2,
      actionLen: 9999,
    }),
  );
  const pad = LILY_PADS[0];
  out.push(make("frog", { ...pad }, rng, { action: "sit", heading: 2.6, actionLen: between(rng, 5, 10) }));
  out.push(
    make("kingfisher", { ...KINGFISHER_PERCH }, rng, {
      action: "away",
      visible: false,
      actionLen: opts.explore ? between(rng, 8, 14) : between(rng, 25, 45),
    }),
  );
  if (opts.explore) {
    for (let i = 0; i < 3; i++) {
      out.push(make("mallard", { x: MALLARD_SWIM_HOME.x + i * 1.6, y: 0, z: MALLARD_SWIM_HOME.z - i }, rng, { range: 7, variant: i === 1 ? 1 : 0 }));
    }
    out.push(make("woodDuck", { ...WOOD_DUCK_HOME }, rng, { range: 5 }));
    out.push(make("woodDuck", { x: WOOD_DUCK_HOME.x + 1.4, y: 0, z: WOOD_DUCK_HOME.z - 0.8 }, rng, { range: 5, variant: 1 }));
  }
  for (const a of out) if (SWIMMERS.has(a.species)) a.goal = swimGoal(a, rng);
  return out;
}

export type WildlifeEmit = (e: { type: "splash"; pos: Vec3; big: boolean }) => void;

function setAction(a: Animal, action: AnimalAction, len: number): void {
  a.action = action;
  a.actionT = 0;
  a.actionLen = len;
}

function turnToward(a: Animal, target: Vec3, rate: number, dt: number): void {
  const want = Math.atan2(target.x - a.pos.x, target.z - a.pos.z);
  const diff = wrapAngle(want - a.heading);
  a.heading += clamp(diff, -rate * dt, rate * dt);
}

function stepSwimmer(a: Animal, dt: number, rng: Rng, emit: WildlifeEmit): void {
  if (a.action === "dive") {
    if (a.actionT >= a.actionLen) {
      a.pos = swimGoal(a, rng);
      a.goal = swimGoal(a, rng);
      a.visible = true;
      emit({ type: "splash", pos: { ...a.pos }, big: false });
      setAction(a, "swim", between(rng, 10, 18));
    }
    return;
  }
  if (a.action === "dabble") {
    if (a.actionT >= a.actionLen) setAction(a, "swim", between(rng, 6, 12));
    return;
  }
  const fleeing = a.action === "away";
  const speed = a.speed * (fleeing ? 3.2 : 1);
  turnToward(a, a.goal, fleeing ? 2.5 : 0.9, dt);
  const fx = Math.sin(a.heading);
  const fz = Math.cos(a.heading);
  const nx = a.pos.x + fx * speed * dt;
  const nz = a.pos.z + fz * speed * dt;
  if (lakeDist(nx, nz) < 0.97 && nz < -4) {
    a.pos.x = nx;
    a.pos.z = nz;
  } else {
    a.goal = swimGoal(a, rng);
  }
  if (dist(a.pos, a.goal) < 1.2) a.goal = swimGoal(a, rng);
  if (a.actionT >= a.actionLen) {
    if (fleeing) {
      setAction(a, "swim", between(rng, 6, 12));
    } else if (a.species === "loon") {
      a.visible = false;
      emit({ type: "splash", pos: { ...a.pos }, big: false });
      setAction(a, "dive", between(rng, 6, 9));
    } else if ((a.species === "mallard" || a.species === "woodDuck") && rng() < 0.6) {
      setAction(a, "dabble", between(rng, 1.8, 2.8));
    } else {
      setAction(a, "swim", between(rng, 6, 12));
    }
  }
}

function stepHeron(a: Animal, dt: number, rng: Rng, emit: WildlifeEmit): void {
  switch (a.action) {
    case "fly": {
      const t = clamp(a.actionT / a.actionLen, 0, 1);
      const p = lerp(a.from, a.goal, t * t * (3 - 2 * t));
      p.y = Math.sin(Math.PI * t) * 7;
      a.pos = p;
      a.flap += dt * Math.PI * 2 * 2.2;
      turnToward(a, a.goal, 3, dt);
      if (t >= 1) {
        a.home = { ...a.goal };
        a.pos.y = 0;
        setAction(a, "stand", between(rng, 4, 8));
      }
      return;
    }
    case "stand":
      a.heading += Math.sin(a.actionT * 0.7 + a.seed * 9) * dt * 0.15;
      if (a.actionT >= a.actionLen) {
        const r = a.range * Math.sqrt(rng());
        const t = rng() * Math.PI * 2;
        a.goal = { x: a.home.x + Math.cos(t) * r, y: 0, z: a.home.z + Math.sin(t) * r };
        setAction(a, rng() < 0.55 ? "stalk" : "strike", rng() < 0.55 ? between(rng, 3, 5) : 1.1);
      }
      return;
    case "stalk": {
      turnToward(a, a.goal, 0.8, dt);
      if (dist(a.pos, a.goal) > 0.3) {
        a.pos.x += Math.sin(a.heading) * a.speed * dt;
        a.pos.z += Math.cos(a.heading) * a.speed * dt;
      }
      if (a.actionT >= a.actionLen) setAction(a, "stand", between(rng, 3, 7));
      return;
    }
    case "strike":
      if (a.stage === 0 && a.actionT > 0.45) {
        a.stage = 1;
        emit({ type: "splash", pos: { x: a.pos.x + Math.sin(a.heading) * 0.9, y: 0, z: a.pos.z + Math.cos(a.heading) * 0.9 }, big: false });
      }
      if (a.actionT >= a.actionLen) {
        a.stage = 0;
        setAction(a, "stand", between(rng, 4, 8));
      }
      return;
    default:
      setAction(a, "stand", 4);
  }
}

function stepTurtle(a: Animal): void {
  if (a.action === "hide" && a.actionT >= a.actionLen) {
    a.visible = true;
    setAction(a, "bask", 9999);
  }
}

function stepFrog(a: Animal, rng: Rng, emit: WildlifeEmit): void {
  switch (a.action) {
    case "sit":
      if (a.actionT >= a.actionLen) {
        let pad = LILY_PADS[Math.floor(rng() * LILY_PADS.length)];
        if (dist(pad, a.pos) < 0.5) pad = LILY_PADS[(LILY_PADS.indexOf(pad) + 1) % LILY_PADS.length];
        a.from = { ...a.pos };
        a.goal = { ...pad };
        a.heading = Math.atan2(pad.x - a.pos.x, pad.z - a.pos.z);
        setAction(a, "hop", 0.6);
      }
      return;
    case "hop": {
      const t = clamp(a.actionT / a.actionLen, 0, 1);
      const p = lerp(a.from, a.goal, t);
      p.y = a.goal.y + Math.sin(Math.PI * t) * 0.7;
      a.pos = p;
      if (t >= 1) {
        emit({ type: "splash", pos: { ...a.pos }, big: false });
        setAction(a, "sit", between(rng, 6, 12));
      }
      return;
    }
    case "hide":
      if (a.actionT >= a.actionLen) {
        a.pos = { ...LILY_PADS[Math.floor(rng() * LILY_PADS.length)] };
        a.visible = true;
        setAction(a, "sit", between(rng, 6, 12));
      }
      return;
    default:
      setAction(a, "sit", 5);
  }
}

/** The kingfisher's visit: arrive, perch, hover over the water, dive, leave, stay away a while. */
function stepKingfisher(a: Animal, dt: number, rng: Rng, emit: WildlifeEmit, explore: boolean): void {
  const t = clamp(a.actionT / a.actionLen, 0, 1);
  switch (a.action) {
    case "away":
      if (a.actionT >= a.actionLen) {
        const side = rng() < 0.5 ? -1 : 1;
        a.from = { x: KINGFISHER_PERCH.x + side * 45, y: 7, z: KINGFISHER_PERCH.z - 14 };
        a.goal = { ...KINGFISHER_PERCH };
        a.pos = { ...a.from };
        a.visible = true;
        setAction(a, "fly", 3.6);
        a.stage = 0;
      }
      return;
    case "fly": {
      const p = lerp(a.from, a.goal, t);
      p.y += Math.sin(t * Math.PI * 5) * 0.5 * (1 - t);
      a.heading = Math.atan2(a.goal.x - a.from.x, a.goal.z - a.from.z);
      a.pos = p;
      a.flap += dt * Math.PI * 2 * 11;
      if (t >= 1) {
        if (a.stage === 0) setAction(a, "perch", between(rng, 6, 10));
        else {
          a.visible = false;
          setAction(a, "away", explore ? between(rng, 16, 28) : between(rng, 35, 60));
        }
      }
      return;
    }
    case "perch":
      a.heading += Math.sin(a.actionT * 1.3) * dt * 0.6;
      if (a.actionT >= a.actionLen) {
        a.from = { ...a.pos };
        a.goal = { x: a.pos.x + 2.5, y: 3.4, z: a.pos.z - 5 };
        setAction(a, "hover", 2.8);
      }
      return;
    case "hover": {
      const k = clamp(a.actionT / 1.1, 0, 1);
      a.pos = lerp(a.from, a.goal, k * k * (3 - 2 * k));
      a.pos.y += Math.sin(a.actionT * 9) * 0.06;
      a.flap += dt * Math.PI * 2 * 14;
      if (a.actionT >= a.actionLen) {
        a.from = { ...a.pos };
        setAction(a, "dive", 0.4);
      }
      return;
    }
    case "dive":
      a.pos = { x: a.from.x, y: a.from.y * (1 - t), z: a.from.z };
      if (t >= 1) {
        emit({ type: "splash", pos: { x: a.pos.x, y: 0, z: a.pos.z }, big: true });
        const side = a.pos.x > 0 ? 1 : -1;
        a.from = { x: a.pos.x, y: 0.3, z: a.pos.z };
        a.goal = { x: a.pos.x + side * 50, y: 8, z: a.pos.z - 20 };
        a.stage = 1;
        setAction(a, "fly", 3.2);
      }
      return;
    default:
      setAction(a, "away", 10);
  }
}

export function stepWildlife(animals: Animal[], dt: number, rng: Rng, emit: WildlifeEmit, opts: WildlifeOptions): void {
  for (const a of animals) {
    a.actionT += dt;
    if (SWIMMERS.has(a.species)) stepSwimmer(a, dt, rng, emit);
    else if (a.species === "heron") stepHeron(a, dt, rng, emit);
    else if (a.species === "turtle") stepTurtle(a);
    else if (a.species === "frog") stepFrog(a, rng, emit);
    else if (a.species === "kingfisher") stepKingfisher(a, dt, rng, emit, opts.explore);
  }
}

/** Animals the shot passed close to react: swimmers paddle off, the heron flies, the turtle and frog duck under. */
export function startleNear(animals: Animal[], origin: Vec3, dir: Vec3, rng: Rng, emit: WildlifeEmit): void {
  for (const a of animals) {
    if (!a.visible) continue;
    const reach = a.species === "heron" || a.species === "swan" ? 9 : 6;
    if (rayPointDistance(origin, dir, animalCenter(a)) > reach) continue;
    if (SWIMMERS.has(a.species)) {
      if (a.action === "dive") continue;
      a.goal = swimGoal(a, rng);
      setAction(a, "away", 2.5);
    } else if (a.species === "heron" && a.action !== "fly") {
      a.from = { ...a.pos };
      const other = HERON_SPOTS.find((s) => dist(s, a.home) > 3) ?? HERON_SPOTS[0];
      a.goal = { ...other };
      setAction(a, "fly", 5);
    } else if ((a.species === "turtle" || a.species === "frog") && a.action !== "hide") {
      a.visible = false;
      emit({ type: "splash", pos: { x: a.pos.x, y: 0, z: a.pos.z }, big: false });
      setAction(a, "hide", a.species === "turtle" ? 14 : 8);
    }
  }
}
