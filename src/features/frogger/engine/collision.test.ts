import { describe, expect, it } from "vitest";
import { bayAt, hitsVehicle } from "./collision";
import { testLane } from "./testLanes";

describe("vehicle collisions", () => {
  // Car whose left edge sits at x=7 (track starts at -10).
  const lanes = [testLane(9, "road", [{ offset: 17, length: 1 }])];

  it("hits a frog overlapping the car in its lane", () => {
    expect(hitsVehicle(lanes, 7.5, 9, 0)).toBe(true);
    expect(hitsVehicle(lanes, 8.2, 9, 0)).toBe(true);
  });

  it("misses a frog beside the car or in another lane", () => {
    expect(hitsVehicle(lanes, 9.5, 9, 0)).toBe(false);
    expect(hitsVehicle(lanes, 7.5, 7, 0)).toBe(false);
  });

  it("checks both lanes while the frog is mid-hop", () => {
    // Halfway from row 10 up to row 9: still close enough to be clipped.
    expect(hitsVehicle(lanes, 7.5, 9.5, 0)).toBe(true);
    // Just leaving row 10: clear of row 9's car.
    expect(hitsVehicle(lanes, 7.5, 9.9, 0)).toBe(false);
  });

  it("ignores river lanes", () => {
    expect(hitsVehicle([testLane(3, "log", [{ offset: 17, length: 3 }])], 7.5, 3, 0)).toBe(false);
  });
});

describe("home bays", () => {
  it("maps x to the bay under the frog or -1 for the hedge", () => {
    expect(bayAt(1.5)).toBe(0);
    expect(bayAt(7.4)).toBe(2);
    expect(bayAt(13.9)).toBe(4);
    expect(bayAt(2.5)).toBe(-1);
    expect(bayAt(9)).toBe(-1);
  });
});
