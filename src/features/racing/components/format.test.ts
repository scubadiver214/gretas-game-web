import { describe, expect, it } from "vitest";
import { formatClock, formatTime, ordinal } from "./format";

describe("formatClock (the HUD's running clock)", () => {
  it("pads to the reference style: mm : ss:mmm", () => {
    expect(formatClock(0)).toBe("00 : 00:000");
    expect(formatClock(11.088)).toBe("00 : 11:088");
    expect(formatClock(75.5)).toBe("01 : 15:500");
    expect(formatClock(600.0049)).toBe("10 : 00:004");
  });

  it("never shows negative time", () => {
    expect(formatClock(-3)).toBe("00 : 00:000");
  });
});

describe("formatTime (results)", () => {
  it("shows minutes and hundredths", () => {
    expect(formatTime(0)).toBe("0:00.00");
    expect(formatTime(67.42)).toBe("1:07.42");
    expect(formatTime(79.63)).toBe("1:19.63");
    expect(formatTime(9.5)).toBe("0:09.50");
  });
});

describe("ordinal", () => {
  it("gets the suffixes right, including the teens", () => {
    expect([1, 2, 3, 4, 5].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "5th"]);
    expect([11, 12, 13].map(ordinal)).toEqual(["11th", "12th", "13th"]);
    expect([21, 22, 23, 101, 111].map(ordinal)).toEqual(["21st", "22nd", "23rd", "101st", "111th"]);
  });
});
