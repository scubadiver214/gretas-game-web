import { describe, expect, it } from "vitest";
import { froggerStars, SCORING } from "../config";
import { extraLivesBetween, homePoints } from "./scoring";

describe("frogger scoring", () => {
  it("pays the home bonus plus 10 per whole second left", () => {
    expect(homePoints(0)).toBe(SCORING.home);
    expect(homePoints(42.9)).toBe(50 + 42 * 10);
    expect(homePoints(-3)).toBe(50);
  });

  it("awards an extra life each time the score passes 10,000", () => {
    expect(extraLivesBetween(9_990, 10_040)).toBe(1);
    expect(extraLivesBetween(10_040, 10_500)).toBe(0);
    expect(extraLivesBetween(9_000, 21_000)).toBe(2);
  });

  it("turns progress into 0-3 stars", () => {
    expect(froggerStars(0, 0)).toBe(0);
    expect(froggerStars(0, 2)).toBe(1);
    expect(froggerStars(1, 5)).toBe(2);
    expect(froggerStars(3, 15)).toBe(3);
  });
});
