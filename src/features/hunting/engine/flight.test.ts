import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { FLIGHT, STEP } from "../config";
import { LEVELS } from "../levels";
import type { Duck } from "../types";
import { formationSlot, isAirborne, rollSpecies, spawnDuck, spawnOrigin, startle, stepDuck, type FlightTuning } from "./flight";
import { dist } from "./vec";

const tuning: FlightTuning = { ...LEVELS[1].duck, hitRadius: 0.6 };

function fly(ducks: Duck[], seconds: number, rng = mulberry32(1)) {
  const find = (id: number) => ducks.find((d) => d.id === id);
  for (let t = 0; t < seconds; t += STEP) for (const d of ducks) stepDuck(d, STEP, rng, tuning, find);
}

describe("duck flight", () => {
  it("takes off from the reeds and climbs", () => {
    const rng = mulberry32(4);
    const d = spawnDuck({ id: 1, flight: 1, from: "reeds", rng, tuning, target: true, size: 1 });
    expect(d.phase).toBe("takeoff");
    expect(d.pos.y).toBeLessThan(0.5);
    fly([d], 1.5, rng);
    expect(d.phase).toBe("fly");
    expect(d.pos.y).toBeGreaterThan(3);
  });

  it("stays in front of the player while hunting, then leaves", () => {
    const rng = mulberry32(9);
    const d = spawnDuck({ id: 1, flight: 1, from: "reeds", rng, tuning, target: true, size: 1 });
    const find = () => undefined;
    let inFront = 0;
    let frames = 0;
    for (let t = 0; t < 60 && d.phase !== "gone"; t += STEP) {
      stepDuck(d, STEP, rng, tuning, find);
      if (d.phase === "fly") {
        frames++;
        if (d.pos.z < -5 && d.pos.y > FLIGHT.minAltitude - 1) inFront++;
      }
    }
    expect(frames).toBeGreaterThan(0);
    expect(inFront / frames).toBeGreaterThan(0.9);
    expect(d.phase).toBe("gone");
  });

  it("keeps followers close to the leader in formation", () => {
    const rng = mulberry32(12);
    const origin = spawnOrigin("side", rng, 1);
    const leader = spawnDuck({ id: 1, flight: 1, from: "side", rng, tuning, target: true, origin, side: 1, size: 1 });
    const follower = spawnDuck({ id: 2, flight: 1, from: "side", rng, tuning, target: true, origin, side: 1, leader, slot: 1, size: 1 });
    fly([leader, follower], 4, rng);
    expect(isAirborne(follower)).toBe(true);
    expect(follower.leader).toBe(leader.id);
    expect(dist(leader.pos, follower.pos)).toBeLessThan(4);
  });

  it("spaces a line, a string, a stack and an echelon differently", () => {
    expect(Math.abs(formationSlot("line", 1, 1).x)).toBeGreaterThan(Math.abs(formationSlot("string", 1, 1).x));
    expect(formationSlot("string", 2, 1).z).toBeGreaterThan(formationSlot("line", 2, 1).z);
    expect(formationSlot("stack", 2, 1).y).toBeGreaterThan(formationSlot("v", 2).y);
    expect(formationSlot("echelon", 2, 1).x).toBeGreaterThan(0);
    expect(formationSlot("echelon", 2, -1).x).toBeLessThan(0);
    expect(formationSlot("diamond", 3, 1).z).toBeGreaterThan(formationSlot("diamond", 1, 1).z);
  });

  it("makes teal a smaller target than a canvasback and sends a hook across the view", () => {
    const rng = mulberry32(3);
    const teal = spawnDuck({ id: 1, flight: 1, from: "side", rng, tuning, target: true, side: 1, size: 1, species: "teal", pattern: "low" });
    const canvas = spawnDuck({ id: 2, flight: 2, from: "side", rng, tuning, target: true, side: -1, size: 1, species: "canvasback", pattern: "high" });
    const hook = spawnDuck({ id: 3, flight: 3, from: "side", rng, tuning, target: true, side: 1, size: 1, pattern: "hook" });
    expect(teal.radius).toBeLessThan(canvas.radius);
    expect(teal.alt[1]).toBeLessThan(canvas.alt[0]);
    expect(hook.waypointsLeft).toBe(1);
    expect(hook.waypoint.z).toBeLessThan(0);
    expect(Math.sign(hook.waypoint.x)).not.toBe(Math.sign(hook.pos.x));
  });

  it("peels a follower out of formation", () => {
    const rng = mulberry32(8);
    const origin = spawnOrigin("side", rng, 1);
    const leader = spawnDuck({ id: 1, flight: 1, from: "side", rng, tuning, target: true, origin, side: 1, size: 1, pattern: "peel", formation: "line" });
    const follower = spawnDuck({ id: 2, flight: 1, from: "side", rng, tuning, target: true, origin, side: 1, leader, slot: 1, size: 1, pattern: "peel", formation: "line", species: "teal" });
    expect(follower.leader).toBe(leader.id);
    expect(follower.peelAt).toBeGreaterThan(2);
    fly([leader, follower], follower.peelAt + 0.4, rng);
    expect(follower.leader).toBeNull();
    expect(follower.peelAt).toBe(0);
  });

  it("rolls every shootable duck on the champion mix", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 200; s++) seen.add(rollSpecies(mulberry32(s), 5));
    expect([...seen].sort()).toEqual(["canvasback", "mallard", "pintail", "shoveler", "teal", "woodDuck"]);
  });

  it("scatters and speeds up when startled", () => {
    const rng = mulberry32(5);
    const d = spawnDuck({ id: 1, flight: 1, from: "side", rng, tuning, target: true, side: -1, size: 1 });
    fly([d], 1, rng);
    startle(d, rng, tuning);
    expect(d.phase).toBe("startled");
    expect(d.leader).toBeNull();
    fly([d], 0.8, rng);
    expect(d.phase).toBe("startled");
    expect(d.cur).toBeGreaterThan(d.speed * 1.4);
  });
});
