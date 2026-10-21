import type { IngredientId } from "../content/ingredients";
import type { StationKind } from "../content/layout";
import type { RecipeId } from "../content/recipes";
import type { KitchenMods } from "../content/shop";

/*
 * Everything in KitchenState is plain JSON (no classes, no functions), so a
 * snapshot can be sent over the wire as-is when online co-op arrives.
 */

export interface IngredientItem {
  uid: number;
  kind: "ingredient";
  id: IngredientId;
  prepped: boolean;
  /** 0..1 progress of chopping / grating / rolling. */
  work: number;
}

export interface PizzaItem {
  uid: number;
  kind: "pizza";
  dough: IngredientId;
  sauce: IngredientId | null;
  cheese: IngredientId | null;
  toppings: IngredientId[];
  /** Oven progress in bakes; see BAKE in config.ts. */
  bake: number;
  sliced: boolean;
  /** 0..1 slicing progress. */
  work: number;
}

export type Item = IngredientItem | PizzaItem;

export interface Station {
  id: number;
  kind: StationKind;
  /** Tile coordinates. */
  tx: number;
  tz: number;
  /** Pantry crates hand out this ingredient. */
  ingredient?: IngredientId;
  item: Item | null;
}

export interface Chef {
  id: number;
  /** Position in tile units (x across, z towards the camera). */
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Radians; 0 faces +z (towards the camera). */
  facing: number;
  /** Stick direction from the controlling player, -1..1 per axis. */
  moveX: number;
  moveZ: number;
  holding: Item | null;
  /** Station id the chef is facing, if any. */
  target: number | null;
  /** True while chopping / rolling / slicing at `target`. */
  working: boolean;
  dashTime: number;
  dashCooldown: number;
}

export interface Order {
  id: number;
  recipeId: RecipeId;
  name: string;
  dough: IngredientId;
  sauce: IngredientId | null;
  cheese: IngredientId | null;
  toppings: IngredientId[];
  /** Seconds the customer will still wait. */
  patience: number;
  maxPatience: number;
  /** Rush orders: impatient, but pay more. */
  rush: boolean;
  /** Points for a correct pizza before bonuses. */
  value: number;
  createdAt: number;
}

export interface KitchenDifficulty {
  level: number;
  shiftSeconds: number;
  /** Recipes on today's menu. */
  menuSize: number;
  /** Tickets on the rail at once. */
  maxTickets: number;
  /** Seconds between orders at quiet times. */
  orderInterval: number;
  /** How much faster orders come at the peak of the lunch rush (0..1). */
  rushDepth: number;
  /** Base customer patience, plus a little per ingredient. */
  patienceBase: number;
  patiencePerItem: number;
  rushOrderChance: number;
  /** Chance an order asks for a different crust than the recipe's. */
  crustSwapChance: number;
  /** Oven seconds for a classic crust. */
  bakeSeconds: number;
}

export interface ShiftStats {
  served: number;
  correct: number;
  wrongPizzas: number;
  wrongToppings: number;
  perfectBakes: number;
  burnt: number;
  walkouts: number;
  speedy: number;
  rushPerfect: number;
  binned: number;
  tips: number;
}

export type KitchenPhase = "ready" | "playing" | "paused" | "over";

export interface KitchenState {
  phase: KitchenPhase;
  /** Simulation steps since the shift opened. */
  tick: number;
  /** Seconds of shift elapsed. */
  time: number;
  level: number;
  difficulty: KitchenDifficulty;
  mods: KitchenMods;
  width: number;
  depth: number;
  /** Solid tiles (row-major, width * depth); chefs can't walk there. */
  solid: boolean[];
  /** Station id per tile, or -1. */
  stationAt: number[];
  stations: Station[];
  chefs: Chef[];
  menu: RecipeId[];
  /** Ingredients stocked in the pantry today. */
  pantry: IngredientId[];
  orders: Order[];
  nextOrderAt: number;
  orderSeq: number;
  itemSeq: number;
  score: number;
  combo: number;
  bestCombo: number;
  rushAnnounced: boolean;
  lastCallAnnounced: boolean;
  /** Score needed for 1, 2 and 3 stars. */
  starTargets: [number, number, number];
  stats: ShiftStats;
  /** Bumped whenever an item appears, disappears or changes shape (renderers re-sync). */
  rev: number;
}

/** Player input, addressed to a chef. Plain JSON so it can travel over a network later. */
export type KitchenCommand =
  | { type: "move"; chef: number; x: number; z: number }
  | { type: "interact"; chef: number }
  | { type: "work"; chef: number }
  | { type: "dash"; chef: number };

export type RejectReason =
  | "needsPrep"
  | "full"
  | "baked"
  | "inOven"
  | "duplicate"
  | "hasSauce"
  | "hasCheese"
  | "tooMany"
  | "notPizza"
  | "raw"
  | "unsliced"
  | "burnt"
  | "noOrders"
  | "cantPlace"
  | "nothingThere";

export type BakeStage = "cooked" | "warning" | "burnt";

export type BakeQuality = "raw" | "perfect" | "good" | "burnt";

export interface ServeResult {
  orderId: number;
  orderName: string;
  correct: boolean;
  /** Components the order wanted but the pizza lacks. */
  missing: IngredientId[];
  /** Components on the pizza the order didn't ask for. */
  extra: IngredientId[];
  bake: BakeQuality;
  points: number;
  tip: number;
  comboMultiplier: number;
  rush: boolean;
}

export type KitchenEvent =
  | { type: "reset" }
  | { type: "started" }
  | { type: "paused" }
  | { type: "resumed" }
  | { type: "pickup"; chef: number; station: number }
  | { type: "place"; chef: number; station: number }
  | { type: "added"; chef: number; station: number | null; ingredient: IngredientId; wanted: boolean }
  | { type: "rejected"; chef: number; station: number | null; reason: RejectReason; ingredient?: IngredientId }
  | { type: "workStart"; chef: number; station: number }
  | { type: "workDone"; chef: number; station: number; result: "rolled" | "chopped" | "grated" | "sliced"; ingredient?: IngredientId; wanted: boolean }
  | { type: "ovenIn"; station: number }
  | { type: "bakeStage"; station: number; stage: BakeStage }
  | { type: "orderNew"; order: Order }
  | { type: "orderLeft"; order: Order }
  | { type: "served"; chef: number; station: number; result: ServeResult; combo: number }
  | { type: "binned"; chef: number; station: number }
  | { type: "dash"; chef: number }
  | { type: "rush" }
  | { type: "lastCall" }
  | { type: "shiftOver" };

/** What the DOM HUD needs; pushed only when something shown changes. */
export interface HudOrder {
  id: number;
  name: string;
  dough: IngredientId;
  sauce: IngredientId | null;
  cheese: IngredientId | null;
  toppings: IngredientId[];
  /** Patience left, 0..1 (quantised). */
  patience: number;
  rush: boolean;
}

export interface HudPizza {
  dough: IngredientId;
  sauce: IngredientId | null;
  cheese: IngredientId | null;
  toppings: IngredientId[];
  bake: BakeQuality;
  sliced: boolean;
}

export interface HudSnapshot {
  phase: KitchenPhase;
  score: number;
  combo: number;
  timeLeft: number;
  shiftSeconds: number;
  orders: HudOrder[];
  /** The pizza each chef is holding or facing (drives ticket ticks). */
  focus: (HudPizza | null)[];
  starTargets: [number, number, number];
  rush: boolean;
}

export interface ShiftSummary {
  score: number;
  level: number;
  stars: number;
  coins: number;
  bestCombo: number;
  durationSeconds: number;
  stats: ShiftStats;
}
