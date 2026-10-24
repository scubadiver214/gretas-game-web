"use client";

import { useSettingsStore } from "@/features/settings/store";
import { celebrate, fx, useJuice } from "@/lib/fx";
import { CHEERS, MISS_CHEERS } from "./config";
import type { ClawEngine } from "./engine/ClawEngine";
import type { ClawEvent } from "./engine/types";

/** Screen spot (viewport fractions) for a world point; set by the canvas once the camera exists. */
let projector: ((x: number, y: number, z: number) => { x: number; y: number }) | null = null;

export function setClawProjector(fn: typeof projector): void {
  projector = fn;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Sound, haptics, floating popups and confetti for engine events. Kept apart
 * from the rules so the engine stays silent (and testable) on its own.
 */
export function bindClawFx(engine: ClawEngine): () => void {
  const atClaw = () => {
    const tip = engine.tip();
    return projector ? projector(tip.x, tip.y + 0.6, tip.z) : { x: 0.5, y: 0.4 };
  };
  return engine.events.on((e: ClawEvent) => {
    const juice = useJuice.getState();
    switch (e.type) {
      case "moveStart":
        fx.motor();
        break;
      case "grabStart":
        fx.whoosh();
        break;
      case "descendStop":
        fx.pop();
        break;
      case "jawClose":
        fx.jawClose();
        break;
      case "lifted":
        if (e.caught) fx.prizeLift();
        break;
      case "miss":
        fx.miss();
        juice.popup(pick(MISS_CHEERS), "neutral", atClaw());
        break;
      case "slip":
        fx.prizeDrop();
        juice.popup("Whoops, it slipped!", "neutral", atClaw());
        break;
      case "released":
        fx.prizeDrop();
        break;
      case "prizeDelivered": {
        fx.chute();
        const rare = e.rarity === "rare" || e.rarity === "legendary";
        if (rare) fx.rarePrize();
        juice.popup(`+${e.points}`, "great", { x: 0.22, y: 0.5 });
        juice.popup(pick(CHEERS[e.rarity]), rare ? "great" : "good", { x: 0.5, y: 0.3 }, true);
        if (!useSettingsStore.getState().reducedMotion) void celebrate(rare);
        if (rare) juice.flashScreen("rgba(255,213,77,0.25)");
        break;
      }
      case "hint":
        if (e.toy !== null) {
          fx.ding();
          juice.popup("Try this one!", "good", { x: 0.5, y: 0.25 });
        }
        break;
      case "levelClear":
        fx.levelClear();
        if (!useSettingsStore.getState().reducedMotion) void celebrate(true);
        break;
      default:
        break;
    }
  });
}
