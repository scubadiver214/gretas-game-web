"use client";

import { useSettingsStore } from "@/features/settings/store";
import { celebrate, fx, useJuice } from "@/lib/fx";
import type { GameEngine } from "./engine/GameEngine";
import type { FroggerEvent } from "./types";

/** Popups are anchored in screen fractions; this is roughly where the home row sits. */
const HOME_POPUP = { x: 0.5, y: 0.22 };

/**
 * Sound, haptics and floating popups for engine events. Kept apart from the
 * rules so the engine stays silent (and testable) on its own.
 */
export function bindFroggerFx(engine: GameEngine): () => void {
  return engine.events.on((e: FroggerEvent) => {
    const juice = useJuice.getState();
    switch (e.type) {
      case "hop":
        fx.hop();
        break;
      case "home":
        fx.home();
        juice.popup(`+${e.points}`, "great", { x: 0.12 + (e.bay / 4) * 0.76, y: HOME_POPUP.y });
        break;
      case "death":
        if (e.cause === "water" || e.cause === "offscreen") fx.splash();
        else if (e.cause === "timeout") fx.bad();
        else fx.crash();
        juice.flashScreen(e.cause === "water" ? "rgba(65,201,255,0.25)" : "rgba(255,106,87,0.3)");
        break;
      case "extraLife":
        fx.powerup();
        juice.popup("1UP!", "great", { x: 0.5, y: 0.5 }, true);
        break;
      case "levelClear":
        fx.levelClear();
        juice.popup(`Level clear! +${e.points}`, "great", { x: 0.5, y: 0.45 }, true);
        if (!useSettingsStore.getState().reducedMotion) void celebrate(false);
        break;
      case "gameOver":
        fx.gameOver();
        break;
      default:
        break;
    }
  });
}
