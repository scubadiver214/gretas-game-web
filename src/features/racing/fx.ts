import { useSettingsStore } from "@/features/settings/store";
import { celebrate, fx } from "@/lib/fx";
import { vibrate } from "@/lib/fx/haptics";
import { duckMusic } from "@/lib/fx/mixer";
import { EXPLOSION } from "./config";
import { ordinal } from "./components/format";
import { playRacingBoom } from "./boom";
import { feedbackFor } from "./engine/explosion";
import type { RaceEngine } from "./engine/RaceEngine";
import type { RaceEvent } from "./types";
import { useRacingHud } from "./useRacingHud";

/** Overtakes closer together than this are rolled into one banner (side-by-side cars swap places a lot). */
const PLACE_BANNER_GAP_MS = 1500;

/**
 * Engine events -> sounds, haptics and short HUD banners. Most cues are for the player's
 * car only. A blast is the exception: anyone close enough hears it, quieter with distance.
 * Also calls out each place gained or lost in a race. Returns the unbind function.
 * (Engine and tyre noise and the racing soundtrack arrive in the polish phase.)
 */
export function bindRacingFx(engine: RaceEngine): () => void {
  const flash = useRacingHud.getState().flash;
  const unbindEvents = engine.events.on((e) => {
    if (e.type === "explosion") {
      hearExplosion(engine, e);
      return;
    }
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
        if (!e.boom) fx.crash();
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
        if (e.kind === "oil" && e.target !== engine.playerIndex) fx.whoosh();
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

/** A mine, a gun, an oil crash or a hard car hit. Loud up close, a distant thud further off. */
function hearExplosion(engine: RaceEngine, e: Extract<RaceEvent, { type: "explosion" }>): void {
  const player = engine.vehicles[engine.playerIndex];
  const fb = feedbackFor(e.kind, { x: e.x, y: e.y, z: e.z }, { x: player.x, y: player.y, z: player.z }, e.racer === engine.playerIndex, 1);
  if (fb.audioVolume < EXPLOSION.audibleMin) return;
  const { soundOn, hapticsOn } = useSettingsStore.getState();
  if (soundOn) {
    playRacingBoom(e.kind, fb.audioVolume);
    if (fb.audioVolume > 0.45) duckMusic(0.28, 0.1, 0.4);
  }
  if (hapticsOn && fb.falloff > 0.55) vibrate(e.kind === "gun" || e.kind === "mine" ? "heavy" : "error");
}
