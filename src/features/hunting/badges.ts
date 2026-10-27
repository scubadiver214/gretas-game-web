import { LEVELS } from "./levels";
import type { ProgressData } from "./progress";
import { SPECIES } from "./species";
import type { HuntSummary, SpeciesId } from "./types";

export interface BadgeDef {
  id: string;
  title: string;
  emoji: string;
  description: string;
  check: (p: ProgressData, last: HuntSummary | null) => boolean;
}

const has = (p: ProgressData, id: SpeciesId) => !!p.journal[id];
const WATERFOWL: readonly SpeciesId[] = ["mallard", "woodDuck", "pintail", "teal", "canvasback", "shoveler", "swan", "loon"];
const LAKESIDE_LEVELS = LEVELS.filter((l) => l.world === "lakeside");

export const BADGES: readonly BadgeDef[] = [
  { id: "first-snapshot", title: "First Snapshot", emoji: "📸", description: "Photograph any animal.", check: (p) => Object.keys(p.journal).length > 0 },
  { id: "duck-detective", title: "Duck Detective", emoji: "🔍", description: "Photograph 3 kinds of water birds.", check: (p) => WATERFOWL.filter((s) => has(p, s)).length >= 3 },
  { id: "picture-perfect", title: "Picture Perfect", emoji: "🖼️", description: "Take a 3-star photo.", check: (p) => Object.values(p.journal).some((e) => (e?.bestStars ?? 0) >= 3) },
  { id: "rare-find", title: "Rare Find", emoji: "💎", description: "Photograph a rare animal.", check: (p) => SPECIES.some((s) => s.rarity === "rare" && has(p, s.id)) },
  { id: "lakeside-naturalist", title: "Lakeside Naturalist", emoji: "🌿", description: "Discover every animal at the lake.", check: (p) => SPECIES.every((s) => has(p, s.id)) },
  { id: "first-flight", title: "First Flight", emoji: "🪶", description: "Finish level 1.", check: (p) => (p.levels["lakeside-1"]?.stars ?? 0) > 0 },
  { id: "hot-streak", title: "Hot Streak", emoji: "🔥", description: "Hit 5 ducks in a row.", check: (_p, s) => (s?.bestStreak ?? 0) >= 5 },
  { id: "two-for-one", title: "Two for One", emoji: "✌️", description: "Hit two ducks with one shot.", check: (_p, s) => (s?.multiShots ?? 0) >= 1 },
  { id: "sharp-shooter", title: "Sharp Shooter", emoji: "🎯", description: "Finish a level with 80% accuracy (5+ shots).", check: (_p, s) => !!s && s.success && s.shots >= 5 && s.accuracy >= 0.8 },
  { id: "camera-ready", title: "Camera Ready", emoji: "📷", description: "Snap a wildlife photo during a hunt.", check: (_p, s) => !!s && s.activity === "ducks" && s.photos > 0 },
  { id: "lakeside-champion", title: "Lakeside Champion", emoji: "🏆", description: "3 stars on every Lakeside level.", check: (p) => LAKESIDE_LEVELS.every((l) => (p.levels[l.id]?.stars ?? 0) >= 3) },
];

export const BADGE_BY_ID: Record<string, BadgeDef> = Object.fromEntries(BADGES.map((b) => [b.id, b]));

/** Badges this progress (plus the round that just finished) earns that are not already held. */
export function newBadges(p: ProgressData, last: HuntSummary | null): string[] {
  return BADGES.filter((b) => !p.badges[b.id] && b.check(p, last)).map((b) => b.id);
}
