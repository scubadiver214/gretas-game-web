import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/rng";
import { FLIGHT, STEP } from "../config";
import { LEVELS } from "../levels";
import type { Duck } from "../types";
import { isAirborne, spawnDuck, spawnOrigin, startle, stepDuck, type FlightTuning } from "./flight";
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
    expect(dist(leader.pos, follower.pos)).toBeLessThan(6);
  });

  it("scatters and speeds up when startled", () => {
    const rng = mulberry32(5);
    const d = spawnDuck({ id: 1, flight: 1, from: "side", rng, tuning, target: true, side: -1, size: 1 });
    fly([d], 1, rng);
    startle(d, rng, tuning);
    expect(d.phase).toBe("startled");
    fly([d], 0.8, rng);
    expect(d.cur).toBeGreaterThan(d.speed * 1.1);
  });
});
