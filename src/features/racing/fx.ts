import { celebrate, fx } from "@/lib/fx";
import type { RaceEngine } from "./engine/RaceEngine";
import { useRacingHud } from "./useRacingHud";

/**
 * Engine events -> sounds, haptics and short HUD banners. Returns the unbind
 * function. (Engine and tyre noise and the racing soundtrack arrive in the
 * polish phase; these are the moment-to-moment cues.)
 */
export function bindRacingFx(engine: RaceEngine): () => void {
  const flash = useRacingHud.getState().flash;
  return engine.events.on((e) => {
    switch (e.type) {
      case "countdown":
        fx.tick();
        break;
      case "go":
        fx.go();
        break;
      case "coin":
        fx.ding();
        break;
      case "gem":
        fx.great();
        flash("+1 GEM!", "pink");
        break;
      case "checkpoint":
        fx.good();
        flash("Checkpoint!", "blue");
        break;
      case "lap":
        if (e.lap < engine.race.laps) {
          fx.levelClear();
          flash(e.best && e.lap > 1 ? `Lap ${e.lap + 1}! New best lap!` : `Lap ${e.lap + 1}!`, "gold");
        }
        break;
      case "finish":
        fx.fanfare();
        flash("FINISH!", "green");
        void celebrate(true);
        break;
      case "wall":
      case "bump":
        fx.crash();
        break;
      case "takeoff":
        fx.jump();
        break;
      case "land":
        fx.land();
        break;
      case "boostStart":
        fx.powerup();
        break;
      case "driftEnd":
        if (e.charge > 0.12) fx.good();
        break;
      case "respawn":
        fx.whoosh();
        flash(e.auto ? "Back on the road!" : "Reset!", "blue");
        break;
      case "reset":
        useRacingHud.setState({ banner: null });
        break;
      case "weather":
        if (e.heavy) {
          fx.whoosh();
          flash(e.kind === "snow" ? "Snowstorm!" : "Downpour!", "blue");
        }
        break;
      default:
        break;
    }
  });
}
