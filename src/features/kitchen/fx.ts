"use client";

import { fx, useJuice } from "@/lib/fx";
import { SCORING } from "./config";
import { INGREDIENT_BY_ID, PREP_VERB, type IngredientId } from "./content/ingredients";
import type { KitchenEngine } from "./engine/KitchenEngine";
import { comboMultiplier } from "./engine/scoring";
import type { KitchenEvent, RejectReason } from "./engine/types";
import { screenPoint } from "./render/view";

const emoji = (id?: IngredientId) => (id ? INGREDIENT_BY_ID[id].emoji : "");

function rejectText(reason: RejectReason, id?: IngredientId): string | null {
  switch (reason) {
    case "needsPrep": {
      const prep = id ? INGREDIENT_BY_ID[id].prep : "chop";
      return `${PREP_VERB[prep]} the ${emoji(id)} first!`;
    }
    case "full":
      return "No room!";
    case "baked":
      return "Too late, it's baked!";
    case "inOven":
      return "It's in the oven!";
    case "duplicate":
      return `Already has ${emoji(id)}`;
    case "hasSauce":
      return "Already sauced!";
    case "hasCheese":
      return "Already cheesy!";
    case "tooMany":
      return "That's plenty!";
    case "notPizza":
      return "Only pizzas go there";
    case "raw":
      return "Bake it first! 🔥";
    case "unsliced":
      return "Slice it first! 🔪";
    case "burnt":
      return "Burnt! Bin it 🗑️";
    case "noOrders":
      return "Nobody's waiting yet";
    case "cantPlace":
      return "Can't put that there";
    default:
      return null;
  }
}

/**
 * Sound, haptics and floating popups for kitchen events. The engine stays
 * silent and testable; this is the only place that knows about the DOM HUD.
 */
export function bindKitchenFx(engine: KitchenEngine): () => void {
  const atStation = (id: number | null) => {
    const st = id !== null ? engine.state.stations[id] : null;
    return st ? screenPoint(st.tx + 0.5, st.tz + 0.5, 1.2) : { x: 0.5, y: 0.45 };
  };
  const atChef = (id: number) => {
    const c = engine.state.chefs[id];
    return c ? screenPoint(c.x, c.z, 1.4) : { x: 0.5, y: 0.45 };
  };

  return engine.events.on((e: KitchenEvent) => {
    const juice = useJuice.getState();
    switch (e.type) {
      case "pickup":
      case "place":
        fx.tap();
        break;
      case "workStart":
        fx.tap();
        break;
      case "added":
        if (e.wanted) {
          fx.pop();
          juice.popup(`+${emoji(e.ingredient)}`, "good", e.station !== null ? atStation(e.station) : atChef(e.chef));
        } else {
          fx.bad();
          juice.popup(`No order wants ${emoji(e.ingredient)}!`, "bad", e.station !== null ? atStation(e.station) : atChef(e.chef));
          juice.shakeCamera(0.05);
        }
        break;
      case "rejected": {
        const text = rejectText(e.reason, e.ingredient);
        if (!text) break;
        fx.tap();
        juice.popup(text, "neutral", atChef(e.chef));
        break;
      }
      case "workDone":
        if (e.result === "sliced") {
          fx.good();
          juice.popup("Sliced! 🔪", "good", atStation(e.station));
        } else if (e.wanted) {
          fx.pop();
          juice.popup(e.result === "rolled" ? "Dough ready!" : `${emoji(e.ingredient)} ready!`, "good", atStation(e.station));
        } else {
          fx.tap();
          juice.popup(e.result === "rolled" ? `No order wants this crust` : `No order wants ${emoji(e.ingredient)}`, "bad", atStation(e.station));
        }
        break;
      case "ovenIn":
        fx.whoosh();
        setTimeout(() => fx.sizzle(), 300);
        break;
      case "bakeStage":
        if (e.stage === "cooked") {
          fx.ding();
          juice.popup("Ready! ✨", "great", atStation(e.station));
        } else if (e.stage === "warning") {
          fx.hurry();
          juice.popup("Take it out!", "bad", atStation(e.station));
        } else {
          fx.bad();
          juice.popup("Burnt! 🔥", "bad", atStation(e.station), true);
          juice.shakeCamera(0.1);
        }
        break;
      case "orderNew":
        fx.bell();
        break;
      case "orderLeft":
        fx.bad();
        juice.popup(`Customer left 😢 -${SCORING.walkoutPenalty}`, "bad", { x: 0.5, y: 0.32 }, true);
        juice.flashScreen("rgba(255,106,87,0.25)");
        juice.shakeCamera(0.12);
        break;
      case "served": {
        const r = e.result;
        const at = atStation(e.station);
        if (r.correct) {
          if (e.combo >= 2) fx.combo();
          else fx.great();
          juice.popup(`+${r.points}`, "great", at, true);
          if (r.bake === "perfect") juice.popup("Perfect bake! ✨", "great", { x: at.x, y: at.y - 0.08 });
          if (e.combo >= 2) juice.popup(`🔥 ${e.combo} in a row! x${comboMultiplier(e.combo)}`, "great", { x: 0.5, y: 0.3 }, true);
          juice.flashScreen("rgba(61,255,136,0.18)");
        } else {
          fx.bad();
          const missing = r.missing.map((i) => emoji(i)).join("");
          const extra = r.extra.map((i) => emoji(i)).join("");
          const why = [missing && `missing ${missing}`, extra && `extra ${extra}`].filter(Boolean).join(", ");
          juice.popup(`Wrong pizza! ${why}`, "bad", { x: at.x, y: at.y - 0.06 }, true);
          juice.popup(`+${r.points}`, "neutral", at);
          juice.shakeCamera(0.08);
        }
        break;
      }
      case "binned":
        fx.whoosh();
        break;
      case "dash":
        fx.whoosh();
        break;
      case "rush":
        fx.hurry();
        juice.popup("🔥 LUNCH RUSH! 🔥", "great", { x: 0.5, y: 0.4 }, true);
        juice.flashScreen("rgba(255,213,77,0.22)");
        break;
      case "lastCall":
        fx.hurry();
        juice.popup("Last orders! 30s", "great", { x: 0.5, y: 0.4 }, true);
        break;
      case "shiftOver":
        fx.levelClear();
        juice.popup("Closing time! 🍕", "great", { x: 0.5, y: 0.42 }, true);
        break;
      default:
        break;
    }
  });
}
