import { describe, expect, it } from "vitest";
import { raceDurationSeconds, raceScore, raceStars } from "./score";

const finish = { finished: true as const, coins: 24, gems: 2, timeSeconds: 80, place: 1, racers: 4 };

describe("raceScore", () => {
  it("scores a finish as bonus + coins + gems + leftover time", () => {
    // 5000 + 24*10 + 2*100 + (300-80)*10 = 5000+240+200+2200 = 7640
    expect(raceScore(finish)).toBe(7640);
  });

  it("is zero when the player did not finish", () => {
    expect(raceScore({ ...finish, finished: false })).toBe(0);
  });

  it("gives no time bonus once the run is slower than par", () => {
    expect(raceScore({ ...finish, timeSeconds: 400 })).toBe(5000 + 240 + 200);
  });
});

describe("raceStars", () => {
  it("gives three stars for a winning run with plenty of coins", () => {
    expect(raceStars(finish)).toBe(3);
  });

  it("gives one star for a slow packed finish with few coins", () => {
    expect(raceStars({ finished: true, place: 4, racers: 4, coins: 3 })).toBe(1);
  });
});

describe("raceDurationSeconds", () => {
  it("clamps to the API duration window", () => {
    expect(raceDurationSeconds(0.2)).toBe(1);
    expect(raceDurationSeconds(95.4)).toBe(95);
    expect(raceDurationSeconds(900)).toBe(600);
  });
});
