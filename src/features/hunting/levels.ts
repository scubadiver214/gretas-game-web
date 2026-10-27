import type { Activity, FlightPattern, FormationId, GameDuckId } from "./types";

export type WorldId = "lakeside" | "woods" | "jungle" | "safari" | "mountains" | "range";

export interface WorldDef {
  id: WorldId;
  number: number;
  name: string;
  emoji: string;
  difficulty: string;
  blurb: string;
  /** False until the world's levels exist; shown as "coming soon". */
  available: boolean;
}

export const WORLDS: readonly WorldDef[] = [
  { id: "lakeside", number: 1, name: "Peaceful Lakeside", emoji: "🦆", difficulty: "Beginner", blurb: "Ducks over a calm mountain lake", available: true },
  { id: "woods", number: 2, name: "Deep Mountain Woods", emoji: "🦌", difficulty: "Beginner–Intermediate", blurb: "Deer, misty pines and a scoped rifle", available: false },
  { id: "jungle", number: 3, name: "Tropical Jungle", emoji: "🦜", difficulty: "Intermediate", blurb: "Waterfalls, parrots and flying targets", available: false },
  { id: "safari", number: 4, name: "African Safari", emoji: "🦒", difficulty: "Intermediate", blurb: "Photo safari and clay targets at sunset", available: false },
  { id: "mountains", number: 5, name: "Mountain Wilderness", emoji: "🏔️", difficulty: "Advanced", blurb: "Snowy peaks and long-range precision", available: false },
  { id: "range", number: 6, name: "Championship Range", emoji: "🏆", difficulty: "All levels", blurb: "Skeet and trap championships", available: false },
];

export type SpawnFrom = "reeds" | "side" | "any";

export interface WaveDef {
  size: number;
  /** Seconds before this wave. Without `overlap`, the clock starts once the previous flock has left. */
  delay: number;
  from: SpawnFrom;
  formation?: FormationId;
  pattern?: FlightPattern;
  /** Species of the leader. A few followers may be a different duck. */
  species?: GameDuckId;
}

export type FlightPlan =
  | {
      kind: "waves";
      /** When true, the next flock launches on its delay even if the last one is still in the air. */
      overlap?: boolean;
      waves: readonly WaveDef[];
    }
  | {
      kind: "continuous";
      interval: readonly [number, number];
      size: readonly [number, number];
      maxAirborne: number;
      /** Hard cap on ducks per run (keeps the score ceiling honest). */
      maxDucks: number;
      from: SpawnFrom;
    };

export interface DuckTuning {
  /** Cruise speed, m/s. */
  speed: number;
  /** Visual and hit size multiplier. */
  size: number;
  /** 0..1+: how much the path wanders. */
  jink: number;
  waypoints: readonly [number, number];
  /** Seconds before a duck heads for the exit. */
  airTime: number;
  altitude: readonly [number, number];
  distance: readonly [number, number];
}

export interface LevelDef {
  id: string;
  number: number;
  world: WorldId;
  name: string;
  blurb: string;
  tip: string;
  activity: Activity;
  objective: { kind: "hits" | "doubles" | "none"; count: number };
  /** Seconds before difficulty scaling; null = no clock. */
  timeLimit: number | null;
  /** Spare shells beyond the magazine; null = unlimited. */
  reserve: number | null;
  flights: FlightPlan;
  duck: DuckTuning;
  /** Scores for 2 and 3 stars (1 star = objective met). */
  starScores: readonly [number, number];
}

const wave = (size: number, delay: number, from: SpawnFrom = "any", formation?: FormationId, pattern?: FlightPattern, species?: GameDuckId): WaveDef => ({ size, delay, from, formation, pattern, species });

export const LEVELS: readonly LevelDef[] = [
  {
    id: "lakeside-1",
    number: 1,
    world: "lakeside",
    name: "First Flight",
    blurb: "Hit 3 ducks. Mallards, teal and wood ducks take turns lifting off.",
    tip: "Ducks burst out of the reeds. Wait for them to climb, then aim and click. A line of pintails comes later.",
    activity: "ducks",
    objective: { kind: "hits", count: 3 },
    timeLimit: 120,
    reserve: null,
    flights: {
      kind: "waves",
      waves: [
        wave(1, 1, "reeds", "v", "patrol", "mallard"),
        wave(1, 1.3, "reeds", "v", "patrol", "teal"),
        wave(2, 1.3, "reeds", "line", "patrol", "mallard"),
        wave(1, 1.3, "reeds", "v", "patrol", "woodDuck"),
        wave(3, 1.4, "side", "echelon", "patrol", "pintail"),
        wave(2, 1.3, "side", "line", "low", "teal"),
      ],
    },
    duck: { speed: 5.2, size: 1.25, jink: 0.15, waypoints: [2, 3], airTime: 10, altitude: [6, 13], distance: [20, 36] },
    starScores: [1000, 1800],
  },
  {
    id: "lakeside-2",
    number: 2,
    world: "lakeside",
    name: "Duck Patrol",
    blurb: "Hit 5 ducks. Flocks of mallards, pintails and teal stay up together.",
    tip: "A new flock arrives while the last one is still flying. Swing from one duck to the next to build your streak.",
    activity: "ducks",
    objective: { kind: "hits", count: 5 },
    timeLimit: 120,
    reserve: null,
    flights: {
      kind: "waves",
      overlap: true,
      waves: [
        wave(2, 0.8, "reeds", "v", "patrol", "mallard"),
        wave(3, 3.2, "side", "echelon", "patrol", "pintail"),
        wave(2, 3.4, "side", "line", "low", "teal"),
        wave(4, 3.8, "any", "chevron", "patrol", "woodDuck"),
        wave(3, 3.6, "side", "string", "hook", "mallard"),
        wave(4, 4, "side", "diamond", "peel", "shoveler"),
        wave(3, 3.6, "side", "line", "cross", "canvasback"),
      ],
    },
    duck: { speed: 6.3, size: 1.15, jink: 0.3, waypoints: [2, 4], airTime: 11, altitude: [6, 17], distance: [22, 46] },
    starScores: [1800, 3200],
  },
  {
    id: "lakeside-3",
    number: 3,
    world: "lakeside",
    name: "Double Trouble",
    blurb: "Hit both ducks of a pair. Flocks cross, hook back, and peel apart.",
    tip: "Hit the first duck, then swing to its partner. Crossing flocks meet in front of you.",
    activity: "ducks",
    objective: { kind: "doubles", count: 1 },
    timeLimit: 130,
    reserve: null,
    flights: {
      kind: "waves",
      overlap: true,
      waves: [
        wave(2, 0.7, "reeds", "line", "patrol"),
        wave(2, 2.6, "side", "line", "cross"),
        wave(4, 3.2, "side", "diamond", "peel"),
        wave(2, 3, "side", "string", "hook"),
        wave(3, 3.1, "side", "echelon", "low"),
        wave(4, 3.3, "side", "chevron", "high"),
        wave(2, 2.8, "reeds", "v", "patrol"),
        wave(5, 3.4, "side", "stack", "patrol"),
      ],
    },
    duck: { speed: 6.6, size: 1.12, jink: 0.35, waypoints: [2, 4], airTime: 10, altitude: [6, 18], distance: [22, 48] },
    starScores: [2200, 3800],
  },
  {
    id: "lakeside-4",
    number: 4,
    world: "lakeside",
    name: "Lakeside Challenge",
    blurb: "Hit 8 ducks. Big flocks at every height, and shells are limited.",
    tip: "Low skimmers, a high chevron and a stacked flock. Wait for a clear shot. Saved shells give bonus points.",
    activity: "ducks",
    objective: { kind: "hits", count: 8 },
    timeLimit: 150,
    reserve: 10,
    flights: {
      kind: "waves",
      overlap: true,
      waves: [
        wave(3, 0.7, "reeds", "v", "patrol"),
        wave(4, 3.1, "side", "line", "low"),
        wave(5, 3.3, "side", "chevron", "high"),
        wave(4, 3.5, "side", "diamond", "peel"),
        wave(3, 3.2, "side", "string", "hook"),
        wave(5, 3.4, "side", "stack", "cross"),
        wave(4, 3.3, "any", "echelon", "patrol"),
      ],
    },
    duck: { speed: 7.4, size: 1.05, jink: 0.5, waypoints: [2, 4], airTime: 9, altitude: [6, 20], distance: [24, 54] },
    starScores: [2800, 4400],
  },
  {
    id: "lakeside-5",
    number: 5,
    world: "lakeside",
    name: "Lakeside Champion",
    blurb: "Beat the clock: hit 10 ducks. The sky stays full.",
    tip: "Lines, stacks and crossing flocks keep coming. Don't wait for an empty sky.",
    activity: "ducks",
    objective: { kind: "hits", count: 10 },
    timeLimit: 75,
    reserve: null,
    flights: { kind: "continuous", interval: [1.15, 2.05], size: [2, 5], maxAirborne: 8, maxDucks: 36, from: "any" },
    duck: { speed: 8.4, size: 1, jink: 0.6, waypoints: [2, 4], airTime: 8, altitude: [6, 22], distance: [22, 56] },
    starScores: [3400, 6000],
  },
];

/** Wildlife Explorer: camera only, no clock, passing flocks to photograph. */
export const EXPLORE_LEVEL: LevelDef = {
  id: "lakeside-explore",
  number: 1,
  world: "lakeside",
  name: "Wildlife Explorer",
  blurb: "Photograph the animals around the lake. No clock, no shooting.",
  tip: "Zoom in on small animals. Animals in the middle of the frame make the best photos.",
  activity: "explore",
  objective: { kind: "none", count: 0 },
  timeLimit: null,
  reserve: null,
  flights: { kind: "continuous", interval: [7, 12], size: [3, 6], maxAirborne: 6, maxDucks: 100000, from: "any" },
  duck: { speed: 6, size: 1.15, jink: 0.25, waypoints: [2, 3], airTime: 11, altitude: [7, 16], distance: [24, 50] },
  starScores: [0, 0],
};

export function levelById(id: string): LevelDef | undefined {
  return id === EXPLORE_LEVEL.id ? EXPLORE_LEVEL : LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}

/** A level is open once the one before it has at least one star. */
export function isLevelUnlocked(id: string, starsByLevel: Readonly<Record<string, number>>): boolean {
  const i = LEVELS.findIndex((l) => l.id === id);
  if (i <= 0) return i === 0;
  return (starsByLevel[LEVELS[i - 1].id] ?? 0) > 0;
}

export function objectiveText(level: LevelDef): string {
  const o = level.objective;
  if (o.kind === "hits") return `Hit ${o.count} duck${o.count === 1 ? "" : "s"}`;
  if (o.kind === "doubles") return o.count === 1 ? "Hit both ducks of a pair" : `Hit both ducks of ${o.count} pairs`;
  return "Explore and take photos";
}
