import { Emitter } from "@/lib/game/events";
import { seededRng, type Rng } from "@/lib/rng";
import { BAKE, CHEF, LAST_CALL_SECONDS, MAX_STEPS_PER_FRAME, SCORING, STEP_SECONDS, WORK_SECONDS } from "../config";
import { INGREDIENT_BY_ID, STARTER_INGREDIENTS, type IngredientId } from "../content/ingredients";
import { LUNCH_RUSH_LAYOUT, TILE_KINDS, layoutSize, type LayoutDef, type StationKind } from "../content/layout";
import { BASE_MODS, type KitchenMods } from "../content/shop";
import { RUSH_ON, kitchenDifficultyFor, orderIntervalAt, rushCurve } from "./difficulty";
import { findTarget, moveChef, separateChefs } from "./movement";
import { buildMenu, makeOrder } from "./orders";
import {
  addIngredient,
  addRejection,
  bakeQuality,
  bestOrderFor,
  diff,
  isDoughWanted,
  isIngredientWanted,
  isWanted,
  newPizza,
} from "./pizza";
import { coinsFor, scoreServe, starTargets, starsFor } from "./scoring";
import type {
  Chef,
  HudPizza,
  HudSnapshot,
  IngredientItem,
  Item,
  KitchenCommand,
  KitchenEvent,
  KitchenState,
  PizzaItem,
  RejectReason,
  ShiftSummary,
  Station,
} from "./types";

export interface EngineOptions {
  /** Same seed => same menu and ticket sequence (daily challenge). */
  seed?: string;
  level?: number;
  /** Chefs in the kitchen. One for now; a second chef can come back with co-op. */
  chefs?: number;
  unlocked?: readonly IngredientId[];
  mods?: KitchenMods;
  layout?: LayoutDef;
}

/** Stop opening new tickets this close to closing time. */
const NO_NEW_ORDERS_SECONDS = 8;

function randomSeed(): string {
  return `shift:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStats(): KitchenState["stats"] {
  return { served: 0, correct: 0, wrongPizzas: 0, wrongToppings: 0, perfectBakes: 0, burnt: 0, walkouts: 0, speedy: 0, rushPerfect: 0, binned: 0, tips: 0 };
}

function createState(options: EngineOptions, rng: Rng): KitchenState {
  const layout = options.layout ?? LUNCH_RUSH_LAYOUT;
  const { width, depth } = layoutSize(layout);
  const difficulty = kitchenDifficultyFor(options.level ?? 1);
  const mods = options.mods ?? BASE_MODS;
  const unlocked = options.unlocked ?? STARTER_INGREDIENTS;

  const solid: boolean[] = new Array(width * depth).fill(true);
  const stationAt: number[] = new Array(width * depth).fill(-1);
  const stations: Station[] = [];
  const pantrySlots: Station[] = [];
  for (let tz = 0; tz < depth; tz++) {
    const row = layout.rows[tz];
    for (let tx = 0; tx < width; tx++) {
      const ch = row[tx] ?? " ";
      const tile = TILE_KINDS[ch];
      if (tile === "floor") {
        solid[tz * width + tx] = false;
        continue;
      }
      if (!tile) continue;
      const kind: StationKind = tile === "extraOven" ? (mods.extraOven ? "oven" : "counter") : tile;
      const st: Station = { id: stations.length, kind, tx, tz, item: null };
      stations.push(st);
      stationAt[tz * width + tx] = st.id;
      if (kind === "pantry") pantrySlots.push(st);
    }
  }

  const { menu, pantry } = buildMenu(difficulty, unlocked, pantrySlots.length, rng);
  pantrySlots.forEach((st, i) => {
    if (i < pantry.length) st.ingredient = pantry[i];
    else st.kind = "counter";
  });

  const chefCount = Math.max(1, Math.min(layout.spawns.length, options.chefs ?? 1));
  const chefs: Chef[] = layout.spawns.slice(0, chefCount).map((p, id) => ({
    id,
    x: p.x,
    z: p.z,
    vx: 0,
    vz: 0,
    facing: Math.PI,
    moveX: 0,
    moveZ: 0,
    holding: null,
    target: null,
    working: false,
    dashTime: 0,
    dashCooldown: 0,
  }));

  return {
    phase: "ready",
    tick: 0,
    time: 0,
    level: difficulty.level,
    difficulty,
    mods,
    width,
    depth,
    solid,
    stationAt,
    stations,
    chefs,
    menu,
    pantry,
    orders: [],
    nextOrderAt: 0,
    orderSeq: 0,
    itemSeq: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    rushAnnounced: false,
    lastCallAnnounced: false,
    starTargets: starTargets(difficulty, menu),
    stats: emptyStats(),
    rev: 0,
  };
}

/** Can this station take this item when it's empty? Returns a reason if not. */
function placeRejection(kind: StationKind, item: Item): RejectReason | null {
  switch (kind) {
    case "counter":
      return null;
    case "roll":
      if (item.kind === "pizza") return null;
      return INGREDIENT_BY_ID[item.id].category === "dough" && !item.prepped ? null : "cantPlace";
    case "chop": {
      if (item.kind === "pizza") return "cantPlace";
      const prep = INGREDIENT_BY_ID[item.id].prep;
      return prep === "chop" || prep === "grate" ? null : "cantPlace";
    }
    case "oven":
      if (item.kind !== "pizza") return "notPizza";
      return item.sliced ? "cantPlace" : null;
    case "slice": {
      if (item.kind !== "pizza") return "notPizza";
      const q = bakeQuality(item.bake);
      if (q === "raw") return "raw";
      if (q === "burnt") return "burnt";
      return null;
    }
    default:
      return "cantPlace";
  }
}

function isWorkable(st: Station): boolean {
  const item = st.item;
  if (!item) return false;
  if (st.kind === "roll") return item.kind === "ingredient" && INGREDIENT_BY_ID[item.id].category === "dough" && !item.prepped;
  if (st.kind === "chop") {
    if (item.kind !== "ingredient" || item.prepped) return false;
    const prep = INGREDIENT_BY_ID[item.id].prep;
    return prep === "chop" || prep === "grate";
  }
  if (st.kind === "slice") {
    return item.kind === "pizza" && !item.sliced && item.bake >= BAKE.cooked && item.bake < BAKE.burnt;
  }
  return false;
}

function workSeconds(st: Station): number {
  const item = st.item!;
  if (st.kind === "slice") return WORK_SECONDS.slice;
  if (st.kind === "roll") return WORK_SECONDS.roll;
  return item.kind === "ingredient" && INGREDIENT_BY_ID[item.id].prep === "grate" ? WORK_SECONDS.grate : WORK_SECONDS.chop;
}

function toHudPizza(p: PizzaItem): HudPizza {
  return { dough: p.dough, sauce: p.sauce, cheese: p.cheese, toppings: [...p.toppings], bake: bakeQuality(p.bake), sliced: p.sliced };
}

/**
 * The whole Lunch Rush kitchen, independent of React and three.js. Players
 * (keyboard, touch, or later a network peer) send commands; `advance(dt)`
 * runs fixed 60 Hz steps so a shift plays out identically everywhere.
 */
export class KitchenEngine {
  state: KitchenState;
  readonly events = new Emitter<KitchenEvent>();

  private options: EngineOptions;
  private rng: Rng;
  private queue: KitchenCommand[] = [];
  private accumulator = 0;
  private pausedFrom: KitchenState["phase"] | null = null;
  private hudListener: ((hud: HudSnapshot) => void) | null = null;
  private lastHudKey = "";

  constructor(options: EngineOptions = {}) {
    this.options = { ...options, seed: options.seed ?? randomSeed() };
    this.rng = seededRng(`${this.options.seed}:kitchen`);
    this.state = createState(this.options, this.rng);
  }

  /** Fresh shift in the "ready" phase. Omitted options keep their previous values. */
  reset(options: EngineOptions = {}): void {
    this.options = { ...this.options, ...options, seed: options.seed ?? randomSeed() };
    this.rng = seededRng(`${this.options.seed}:kitchen`);
    this.state = createState(this.options, this.rng);
    this.queue = [];
    this.accumulator = 0;
    this.pausedFrom = null;
    this.events.emit({ type: "reset" });
    this.pushHud();
  }

  start(): void {
    if (this.state.phase !== "ready") return;
    this.state.phase = "playing";
    this.events.emit({ type: "started" });
    this.pushHud();
  }

  pause(): void {
    if (this.state.phase !== "playing") return;
    this.pausedFrom = this.state.phase;
    this.state.phase = "paused";
    this.queue = [];
    for (const c of this.state.chefs) {
      c.moveX = 0;
      c.moveZ = 0;
      c.working = false;
    }
    this.events.emit({ type: "paused" });
    this.pushHud();
  }

  resume(): void {
    if (this.state.phase !== "paused" || !this.pausedFrom) return;
    this.state.phase = this.pausedFrom;
    this.pausedFrom = null;
    this.accumulator = 0;
    this.events.emit({ type: "resumed" });
    this.pushHud();
  }

  togglePause(): void {
    if (this.state.phase === "paused") this.resume();
    else this.pause();
  }

  /** Queue a player command; it applies at the start of the next step. */
  command(cmd: KitchenCommand): void {
    if (this.state.phase !== "playing") return;
    if (!this.state.chefs[cmd.chef]) return;
    this.queue.push(cmd);
  }

  /** Feed wall-clock time; runs as many fixed steps as fit. */
  advance(dt: number): void {
    if (this.state.phase !== "playing") {
      this.pushHud();
      return;
    }
    this.accumulator += Math.min(Math.max(0, dt), 0.25);
    let steps = 0;
    while (this.accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
      this.step(STEP_SECONDS);
      this.accumulator -= STEP_SECONDS;
      steps++;
      if (this.state.phase !== "playing") break;
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0;
    this.pushHud();
  }

  onHud(listener: ((hud: HudSnapshot) => void) | null): void {
    this.hudListener = listener;
    this.lastHudKey = "";
    this.pushHud();
  }

  hud(): HudSnapshot {
    const s = this.state;
    const d = s.difficulty;
    return {
      phase: s.phase,
      score: s.score,
      combo: s.combo,
      timeLeft: Math.max(0, Math.ceil(d.shiftSeconds - s.time)),
      shiftSeconds: d.shiftSeconds,
      orders: s.orders.map((o) => ({
        id: o.id,
        name: o.name,
        dough: o.dough,
        sauce: o.sauce,
        cheese: o.cheese,
        toppings: [...o.toppings],
        patience: Math.max(0, Math.round((o.patience / o.maxPatience) * 40) / 40),
        rush: o.rush,
      })),
      focus: s.chefs.map((c) => this.focusPizza(c)),
      starTargets: s.starTargets,
      rush: s.phase === "playing" && rushCurve(s.time / d.shiftSeconds) >= RUSH_ON,
    };
  }

  summary(): ShiftSummary {
    const s = this.state;
    const stars = starsFor(s.score, s.starTargets);
    return {
      score: s.score,
      level: s.level,
      stars,
      coins: coinsFor(s.score, stars),
      bestCombo: s.bestCombo,
      durationSeconds: Math.max(1, Math.round(s.time)),
      stats: { ...s.stats },
    };
  }

  // ---------------------------------------------------------------------------

  private focusPizza(c: Chef): HudPizza | null {
    if (c.holding?.kind === "pizza") return toHudPizza(c.holding);
    const st = c.target !== null ? this.state.stations[c.target] : null;
    return st?.item?.kind === "pizza" ? toHudPizza(st.item) : null;
  }

  private step(h: number): void {
    const s = this.state;
    s.tick++;
    s.time += h;

    const queue = this.queue;
    this.queue = [];
    for (const cmd of queue) this.apply(cmd);

    for (const chef of s.chefs) moveChef(s, chef, h);
    separateChefs(s);
    for (const chef of s.chefs) {
      chef.target = findTarget(s, chef);
      this.stepWork(chef, h);
    }
    this.stepOvens(h);
    this.stepOrders(h);

    const progress = s.time / s.difficulty.shiftSeconds;
    if (!s.rushAnnounced && rushCurve(progress) >= RUSH_ON) {
      s.rushAnnounced = true;
      this.events.emit({ type: "rush" });
    }
    if (!s.lastCallAnnounced && s.difficulty.shiftSeconds - s.time <= LAST_CALL_SECONDS) {
      s.lastCallAnnounced = true;
      this.events.emit({ type: "lastCall" });
    }
    if (s.time >= s.difficulty.shiftSeconds) {
      s.phase = "over";
      for (const c of s.chefs) {
        c.vx = 0;
        c.vz = 0;
        c.working = false;
      }
      this.events.emit({ type: "shiftOver" });
    }
  }

  private apply(cmd: KitchenCommand): void {
    const chef = this.state.chefs[cmd.chef];
    if (!chef) return;
    switch (cmd.type) {
      case "move":
        chef.moveX = Math.max(-1, Math.min(1, Number.isFinite(cmd.x) ? cmd.x : 0));
        chef.moveZ = Math.max(-1, Math.min(1, Number.isFinite(cmd.z) ? cmd.z : 0));
        break;
      case "interact":
        this.interact(chef);
        break;
      case "work":
        this.work(chef);
        break;
      case "dash":
        if (chef.dashTime <= 0 && chef.dashCooldown <= 0) {
          chef.dashTime = CHEF.dashSeconds;
          chef.dashCooldown = CHEF.dashCooldown + CHEF.dashSeconds;
          chef.working = false;
          this.events.emit({ type: "dash", chef: chef.id });
        }
        break;
    }
  }

  private bump(): void {
    this.state.rev++;
  }

  private reject(chef: Chef, station: number | null, reason: RejectReason, ingredient?: IngredientId): void {
    this.events.emit({ type: "rejected", chef: chef.id, station, reason, ingredient });
  }

  private newIngredient(id: IngredientId): IngredientItem {
    return { uid: ++this.state.itemSeq, kind: "ingredient", id, prepped: INGREDIENT_BY_ID[id].prep === "none", work: 0 };
  }

  private interact(chef: Chef): void {
    if (chef.target === null) return;
    const st = this.state.stations[chef.target];
    const held = chef.holding;
    chef.working = false;
    switch (st.kind) {
      case "bin":
        if (!held) return;
        chef.holding = null;
        this.state.stats.binned++;
        this.bump();
        this.events.emit({ type: "binned", chef: chef.id, station: st.id });
        return;
      case "pass":
        if (!held) return;
        if (held.kind !== "pizza") return this.reject(chef, st.id, "notPizza", held.id);
        return this.serve(chef, st, held);
      case "pantry": {
        const id = st.ingredient!;
        if (!held) {
          chef.holding = this.newIngredient(id);
          this.bump();
          this.events.emit({ type: "pickup", chef: chef.id, station: st.id });
          return;
        }
        if (held.kind === "pizza") {
          this.tryAdd(chef, st.id, held, id, INGREDIENT_BY_ID[id].prep === "none");
          return;
        }
        // Put an untouched ingredient back where it came from.
        if (held.id === id && held.work === 0 && (!held.prepped || INGREDIENT_BY_ID[id].prep === "none")) {
          chef.holding = null;
          this.bump();
          this.events.emit({ type: "place", chef: chef.id, station: st.id });
          return;
        }
        return this.reject(chef, st.id, "full");
      }
      default:
        return this.interactSurface(chef, st);
    }
  }

  /** Counters, dough tables, boards, ovens and the slicer: pick up, put down or combine. */
  private interactSurface(chef: Chef, st: Station): void {
    const held = chef.holding;
    const item = st.item;
    if (!held) {
      if (!item) return;
      st.item = null;
      chef.holding = item;
      this.bump();
      this.events.emit({ type: "pickup", chef: chef.id, station: st.id });
      return;
    }
    if (!item) {
      const why = placeRejection(st.kind, held);
      if (why) return this.reject(chef, st.id, why, held.kind === "ingredient" ? held.id : undefined);
      st.item = held;
      chef.holding = null;
      this.bump();
      this.events.emit({ type: "place", chef: chef.id, station: st.id });
      if (st.kind === "oven") this.events.emit({ type: "ovenIn", station: st.id });
      return;
    }
    if (item.kind === "pizza" && held.kind === "ingredient") {
      if (st.kind === "oven") return this.reject(chef, st.id, "inOven", held.id);
      if (this.tryAdd(chef, st.id, item, held.id, held.prepped)) chef.holding = null;
      return;
    }
    if (held.kind === "pizza" && item.kind === "ingredient") {
      if (this.tryAdd(chef, st.id, held, item.id, item.prepped)) st.item = null;
      return;
    }
    this.reject(chef, st.id, "full");
  }

  private tryAdd(chef: Chef, station: number | null, pizza: PizzaItem, id: IngredientId, prepped: boolean): boolean {
    const why = addRejection(pizza, id, prepped);
    if (why) {
      this.reject(chef, station, why, id);
      return false;
    }
    const wanted = isWanted(pizza, id, this.state.orders);
    addIngredient(pizza, id);
    if (!wanted) this.state.stats.wrongToppings++;
    this.bump();
    this.events.emit({ type: "added", chef: chef.id, station, ingredient: id, wanted });
    return true;
  }

  private work(chef: Chef): void {
    if (chef.target === null) return;
    const st = this.state.stations[chef.target];
    if (!st.item) return;
    if (!isWorkable(st)) {
      if (st.kind === "slice" && st.item.kind === "pizza" && !st.item.sliced) {
        this.reject(chef, st.id, st.item.bake < BAKE.cooked ? "raw" : "burnt");
      }
      return;
    }
    if (!chef.working) this.events.emit({ type: "workStart", chef: chef.id, station: st.id });
    chef.working = true;
  }

  private stepWork(chef: Chef, h: number): void {
    if (!chef.working) return;
    const st = chef.target !== null ? this.state.stations[chef.target] : null;
    if (!st || !isWorkable(st) || Math.hypot(chef.moveX, chef.moveZ) > 0.15) {
      chef.working = false;
      return;
    }
    const item = st.item!;
    item.work = Math.min(1, item.work + (h * this.state.mods.workSpeed) / workSeconds(st));
    if (item.work < 1) return;

    chef.working = false;
    const orders = this.state.orders;
    if (st.kind === "roll" && item.kind === "ingredient") {
      st.item = newPizza(++this.state.itemSeq, item.id);
      this.events.emit({ type: "workDone", chef: chef.id, station: st.id, result: "rolled", ingredient: item.id, wanted: isDoughWanted(item.id, orders) });
    } else if (st.kind === "chop" && item.kind === "ingredient") {
      item.prepped = true;
      const grate = INGREDIENT_BY_ID[item.id].prep === "grate";
      this.events.emit({ type: "workDone", chef: chef.id, station: st.id, result: grate ? "grated" : "chopped", ingredient: item.id, wanted: isIngredientWanted(item.id, orders) });
    } else if (item.kind === "pizza") {
      item.sliced = true;
      this.events.emit({ type: "workDone", chef: chef.id, station: st.id, result: "sliced", wanted: true });
    }
    this.bump();
  }

  private stepOvens(h: number): void {
    const s = this.state;
    for (const st of s.stations) {
      if (st.kind !== "oven" || st.item?.kind !== "pizza") continue;
      const p = st.item;
      if (p.bake >= BAKE.max) continue;
      const factor = INGREDIENT_BY_ID[p.dough].bakeFactor ?? 1;
      const before = p.bake;
      p.bake = Math.min(BAKE.max, p.bake + (h * s.mods.bakeSpeed) / (s.difficulty.bakeSeconds * factor));
      if (before < BAKE.cooked && p.bake >= BAKE.cooked) this.events.emit({ type: "bakeStage", station: st.id, stage: "cooked" });
      if (before < BAKE.warning && p.bake >= BAKE.warning) this.events.emit({ type: "bakeStage", station: st.id, stage: "warning" });
      if (before < BAKE.burnt && p.bake >= BAKE.burnt) {
        s.stats.burnt++;
        this.events.emit({ type: "bakeStage", station: st.id, stage: "burnt" });
      }
    }
  }

  private stepOrders(h: number): void {
    const s = this.state;
    const d = s.difficulty;
    for (const o of s.orders) o.patience -= h;
    const left = s.orders.filter((o) => o.patience <= 0);
    if (left.length) {
      s.orders = s.orders.filter((o) => o.patience > 0);
      for (const o of left) {
        s.score = Math.max(0, s.score - SCORING.walkoutPenalty);
        s.combo = 0;
        s.stats.walkouts++;
        this.events.emit({ type: "orderLeft", order: o });
      }
    }
    const open = d.shiftSeconds - s.time > NO_NEW_ORDERS_SECONDS;
    if (open && s.orders.length < d.maxTickets && (s.time >= s.nextOrderAt || s.orders.length === 0)) {
      const order = makeOrder(
        {
          id: ++s.orderSeq,
          time: s.time,
          difficulty: d,
          menu: s.menu,
          pantry: s.pantry,
          mods: s.mods,
          previous: s.orders[s.orders.length - 1]?.recipeId,
        },
        this.rng,
      );
      s.orders.push(order);
      s.nextOrderAt = s.time + orderIntervalAt(d, s.time) * (0.85 + this.rng() * 0.3);
      this.events.emit({ type: "orderNew", order });
    }
  }

  private serve(chef: Chef, st: Station, pizza: PizzaItem): void {
    const s = this.state;
    if (s.orders.length === 0) return this.reject(chef, st.id, "noOrders");
    const q = bakeQuality(pizza.bake);
    if (q === "raw") return this.reject(chef, st.id, "raw");
    if (q === "burnt") return this.reject(chef, st.id, "burnt");
    if (!pizza.sliced) return this.reject(chef, st.id, "unsliced");

    const order = bestOrderFor(pizza, s.orders)!;
    const { missing, extra } = diff(pizza, order);
    const correct = missing.length === 0 && extra.length === 0;
    const patience = order.patience / order.maxPatience;
    const sc = scoreServe({
      value: order.value,
      rush: order.rush,
      correct,
      bake: q,
      patience,
      combo: s.combo,
      tipMultiplier: s.mods.tips,
    });

    s.orders = s.orders.filter((o) => o !== order);
    chef.holding = null;
    s.score += sc.points;
    s.stats.served++;
    if (q === "perfect") s.stats.perfectBakes++;
    if (correct) {
      s.stats.correct++;
      s.stats.tips += sc.tip;
      if (patience >= SCORING.speedyPatience) s.stats.speedy++;
      if (order.rush && q === "perfect") s.stats.rushPerfect++;
      s.combo++;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
    } else {
      s.stats.wrongPizzas++;
      s.combo = 0;
    }
    this.bump();
    this.events.emit({
      type: "served",
      chef: chef.id,
      station: st.id,
      combo: s.combo,
      result: {
        orderId: order.id,
        orderName: order.name,
        correct,
        missing,
        extra,
        bake: q,
        points: sc.points,
        tip: sc.tip,
        comboMultiplier: sc.comboMultiplier,
        rush: order.rush,
      },
    });
  }

  private pushHud(): void {
    if (!this.hudListener) return;
    const hud = this.hud();
    const key = JSON.stringify(hud);
    if (key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.hudListener(hud);
  }
}
