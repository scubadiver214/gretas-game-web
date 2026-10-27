import { describe, expect, it } from "vitest";
import { evaluatePhoto } from "./photo";

const EYE = { x: 0, y: 1.7, z: 0 };
const AIM = { yaw: 0, pitch: 0 };
const FOV = (62 * Math.PI) / 180;

describe("photo scoring", () => {
  it("gives 3 stars to a big, centred subject", () => {
    const r = evaluatePhoto(EYE, AIM, FOV / 4, 16 / 9, [{ species: "heron", center: { x: 0, y: 1.7, z: -15 }, radius: 0.8, action: false }]);
    expect(r.species).toBe("heron");
    expect(r.stars).toBe(3);
  });

  it("gives 1 star and a zoom tip for a tiny subject", () => {
    const r = evaluatePhoto(EYE, AIM, FOV, 16 / 9, [{ species: "frog", center: { x: 0, y: 1.7, z: -30 }, radius: 0.16, action: false }]);
    expect(r.stars).toBe(1);
    expect(r.tip).toMatch(/zoom/i);
  });

  it("returns nothing when no animal is in frame", () => {
    const r = evaluatePhoto(EYE, AIM, FOV, 16 / 9, [{ species: "swan", center: { x: 0, y: 1.7, z: 30 }, radius: 1, action: false }]);
    expect(r.species).toBeNull();
    expect(r.stars).toBe(0);
  });

  it("prefers the better-framed animal", () => {
    const r = evaluatePhoto(EYE, AIM, FOV / 2, 16 / 9, [
      { species: "swan", center: { x: 4, y: 3, z: -40 }, radius: 0.9, action: false },
      { species: "turtle", center: { x: 0, y: 1.7, z: -8 }, radius: 0.3, action: false },
    ]);
    expect(r.species).toBe("turtle");
  });
});
