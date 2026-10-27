import { fx } from "@/lib/fx";
import { vibrate } from "@/lib/fx/haptics";
import { duckMusic } from "@/lib/fx/mixer";
import { useSettingsStore } from "@/features/settings/store";
import { huntSfx } from "./audio";
import { EYE } from "./config";
import type { HuntEngine } from "./engine/HuntEngine";
import { clamp, dist, wrapAngle } from "./engine/vec";
import { protectedMessage, SPECIES_BY_ID } from "./species";
import type { Vec3 } from "./types";
import { useHuntHud } from "./useHuntHud";

const STREAK_CALLS: Record<number, string> = { 3: "🔥 3 in a row!", 5: "🔥 5 in a row! Hot streak!", 8: "⚡ 8 in a row! Amazing!", 12: "🌟 12 in a row! Legendary!" };

type Project = (p: Vec3) => { x: number; y: number } | null;

/** Engine events -> sounds, haptics, score popups and banners. Returns the unbind function. */
export function bindHuntFx(engine: HuntEngine, project: Project): () => void {
  const hud = useHuntHud.getState();
  const haptic = (kind: Parameters<typeof vibrate>[0]) => {
    if (useSettingsStore.getState().hapticsOn) vibrate(kind);
  };
  const where = (p: Vec3) => {
    const yaw = Math.atan2(-(p.x - EYE.x), -(p.z - EYE.z));
    const pan = clamp(-Math.sin(wrapAngle(yaw - engine.aim.yaw)), -1, 1) * 0.85;
    const volume = clamp(1.2 - dist(p, EYE) / 70, 0, 1);
    return { pan, volume };
  };
  return engine.events.on((e) => {
    switch (e.type) {
      case "countdown":
        fx.tick();
        break;
      case "go":
        fx.go();
        hud.flash(engine.explore ? "📷 Happy exploring!" : "GO!", "green");
        break;
      case "shot":
        if (e.tool === "shotgun") {
          huntSfx.shotgun();
          duckMusic(0.72, 0.45, 0.9);
          haptic("heavy");
        } else {
          huntSfx.shutter();
          haptic("light");
        }
        break;
      case "ads":
        huntSfx.aim(e.on);
        break;
      case "eject":
        huntSfx.eject();
        break;
      case "pump":
        huntSfx.pump();
        break;
      case "shellIn":
        huntSfx.shellIn();
        break;
      case "reloadStart":
        huntSfx.rustle();
        break;
      case "dryFire":
        huntSfx.dryFire();
        break;
      case "swap":
        huntSfx.rustle();
        break;
      case "zoom":
        huntSfx.zoom();
        break;
      case "hit": {
        huntSfx.hit(e.streak);
        duckMusic(0.45, 0.2, 0.55);
        haptic("success");
        const at = project(e.pos);
        const name = SPECIES_BY_ID[e.species].name;
        const sub = e.multiplier > 1 ? `${name}  ×${e.multiplier}` : e.long ? `${name}  ·  long shot` : name;
        if (at) hud.popup({ x: at.x, y: at.y, text: `+${e.points}`, sub, tone: e.long ? "pink" : "gold" });
        const call = STREAK_CALLS[e.streak];
        if (call) hud.flash(call, "gold");
        break;
      }
      case "multi": {
        huntSfx.multi();
        hud.flash(e.count >= 4 ? `🎉 ${e.count} AT ONCE! +${e.points}` : e.count >= 3 ? `🎉 TRIPLE! +${e.points}` : `✌️ DOUBLE! +${e.points}`, "pink");
        break;
      }
      case "takeoff": {
        const w = where(e.pos);
        huntSfx.flutter(w.pan, w.volume);
        huntSfx.splash(true, w.pan, w.volume);
        break;
      }
      case "quack": {
        const w = where(e.pos);
        huntSfx.quack(w.pan, w.volume * 0.8);
        break;
      }
      case "splash": {
        const w = where(e.pos);
        if (w.volume > 0.15) huntSfx.splash(e.big, w.pan, w.volume * 0.7);
        break;
      }
      case "protected": {
        huntSfx.gentleWarn();
        hud.flash(protectedMessage(e.species), "blue", true);
        const at = project(e.pos);
        if (at && e.penalty > 0) hud.popup({ x: at.x, y: at.y, text: `−${e.penalty}`, tone: "red" });
        break;
      }
      case "objective":
        fx.great();
        hud.flash("✅ Goal reached! Keep going for more points", "green", true);
        break;
      case "timeWarning":
        fx.hurry();
        hud.flash("⏱️ 10 seconds left!", "red");
        break;
      case "outOfAmmo":
        fx.bad();
        hud.flash("Out of shells!", "red");
        break;
      case "done":
        if (engine.explore) break;
        if (e.success) fx.levelClear();
        else fx.miss();
        break;
      default:
        break;
    }
  });
}
