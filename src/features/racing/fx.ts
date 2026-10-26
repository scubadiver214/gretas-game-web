import { celebrate, fx } from "@/lib/fx";
import { ordinal } from "./components/format";
import type { RaceEngine } from "./engine/RaceEngine";
import { useRacingHud } from "./useRacingHud";

/** Overtakes closer together than this are rolled into one banner (side-by-side cars swap places a lot). */
const PLACE_BANNER_GAP_MS = 1500;

/**
 * Engine events -> sounds, haptics and short HUD banners, for the player's car only
 * (rivals make no noise). Also calls out each place gained or lost in a race. Returns
 * the unbind function. (Engine and tyre noise and the racing soundtrack arrive in the
 * polish phase; these are the moment-to-moment cues.)
 */
export function bindRacingFx(engine: RaceEngine): () => void {
  const flash = useRacingHud.getState().flash;
  const unbindEvents = engine.events.on((e) => {
    if ("racer" in e && e.racer !== engine.playerIndex) return;
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
        flash(engine.race.count > 1 ? `FINISHED ${ordinal(e.place).toUpperCase()}!` : "FINISH!", "green");
        void celebrate(e.place === 1);
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
      case "crash":
        fx.crash();
        break;
      case "weaponPickup":
        fx.ding();
        flash(`+ ${e.kind.toUpperCase()}`, "gold");
        break;
      case "weaponFire":
        fx.whoosh();
        break;
      case "weaponEmpty":
        flash("Empty!", "red");
        break;
      case "weaponHit":
        if (e.shooter === engine.playerIndex || e.target === engine.playerIndex) fx.crash();
        break;
      case "oil":
        fx.whoosh();
        flash("Slippery!", "blue");
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

  let lastPlaceBanner = 0;
  const unbindRank = useRacingHud.subscribe((now, before) => {
    if (now.phase !== "racing" || before.phase !== "racing" || now.racers < 2 || now.rank === before.rank) return;
    const t = performance.now();
    if (t - lastPlaceBanner < PLACE_BANNER_GAP_MS) return;
    lastPlaceBanner = t;
    if (now.rank < before.rank) {
      fx.good();
      flash(now.rank === 1 ? "You're in the lead!" : `Up to ${ordinal(now.rank)}!`, "green");
    } else {
      flash(`Down to ${ordinal(now.rank)}`, "red");
    }
  });

  return () => {
    unbindEvents();
    unbindRank();
  };
}
