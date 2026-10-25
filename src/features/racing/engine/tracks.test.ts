import { describe, expect, it } from "vitest";
import { RACE } from "../config";
import { neutralControls, type RaceEvent } from "../types";
import { loadWorld, TRACKS } from "../world";
import { RaceEngine } from "./RaceEngine";
import { autopilot, runFor } from "./testDriver";

/** Every shipped track has to be a track a child can actually finish, not just one that validates. */
describe.each(TRACKS)("racing on $name", (def) => {
  const world = loadWorld(def);

  function start(assist: "off" | "helper" | "extra"): RaceEngine {
    const e = new RaceEngine(world.track, world.content, { tier: def.tier, assist });
    e.start();
    runFor(e, RACE.countdownSeconds + 0.05, () => null);
    expect(e.phase).toBe("racing");
    return e;
  }

  it("lets a good driver finish every lap, passing the gates in order", () => {
    const e = start("off");
    const events: RaceEvent[] = [];
    e.events.on((x) => events.push(x));
    let guard = 0;
    while (e.phase === "racing" && guard++ < 60 * 400) {
      e.setControls(autopilot(e));
      e.advance(1 / 60);
    }
    expect(e.phase).toBe("finished");
    const gates = events.filter((x) => x.type === "checkpoint").map((x) => (x as { index: number }).index);
    const once = Array.from({ length: def.checkpoints - 1 }, (_, i) => i + 1);
    expect(gates).toEqual(Array.from({ length: def.laps }, () => once).flat());
    const s = e.summary();
    expect(s.finished).toBe(true);
    expect(s.trackId).toBe(def.id);
    expect(s.timeSeconds).toBeGreaterThan(40);
    expect(s.timeSeconds).toBeLessThan(220);
    expect(s.coins).toBeGreaterThan(0);
  });

  it("lets a child who only holds the gas finish on Helper steering", () => {
    const e = start("helper");
    e.setControls({ ...neutralControls(), throttle: 1 });
    let guard = 0;
    while (e.phase === "racing" && guard++ < 60 * 300) e.advance(1 / 60);
    expect(e.phase).toBe("finished");
    expect(e.summary().finished).toBe(true);
    expect(e.summary().timeSeconds).toBeLessThan(200);
  });
});
