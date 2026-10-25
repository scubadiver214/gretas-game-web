import { describe, expect, it } from "vitest";
import { WEATHER } from "../config";
import { weatherKindFor, TrackWeather, type WeatherKind } from "./weather";

function samples(w: TrackWeather, seconds: number, step = 0.25): { t: number; intensity: number; gripScale: number; yawScale: number }[] {
  const out = [];
  for (let t = 0; t <= seconds; t += step) {
    const s = w.at(t);
    out.push({ t, intensity: s.intensity, gripScale: s.gripScale, yawScale: s.yawScale });
  }
  return out;
}

describe("weatherKindFor", () => {
  it("puts heavy snow on the winter world and rain on the beach", () => {
    expect(weatherKindFor("winter")).toBe("snow");
    expect(weatherKindFor("beach")).toBe("rain");
  });

  it("leaves the other worlds clear", () => {
    expect(weatherKindFor("desert")).toBe("none");
    expect(weatherKindFor("alpine")).toBe("none");
    expect(weatherKindFor("jungle")).toBe("none");
  });
});

describe("TrackWeather", () => {
  it("is always clear when the kind is none", () => {
    const w = new TrackWeather("none", "anything");
    for (const s of samples(w, 120, 5)) {
      expect(s.intensity).toBe(0);
      expect(s.gripScale).toBe(1);
      expect(s.yawScale).toBe(1);
    }
  });

  it("starts clear so the race begins in fair weather", () => {
    for (const kind of ["snow", "rain"] as const) {
      const s = new TrackWeather(kind, `${kind}-seed`).at(0);
      expect(s.kind).toBe(kind);
      expect(s.intensity).toBe(0);
      expect(s.gripScale).toBe(1);
    }
  });

  it("bursts into a storm, then clears again, several times in a race", () => {
    const w = new TrackWeather("snow", "frosty-flurry-run");
    const seen = samples(w, 180);
    const peak = Math.max(...seen.map((s) => s.intensity));
    const calm = seen.filter((s) => s.intensity < 0.05).length;
    const heavy = seen.filter((s) => s.intensity > 0.85).length;
    expect(peak).toBeGreaterThan(0.95);
    expect(calm).toBeGreaterThan(40);
    expect(heavy).toBeGreaterThan(10);
    // Storms are not a single block: intensity falls back to calm after a peak.
    let storms = 0;
    let inStorm = false;
    for (const s of seen) {
      if (!inStorm && s.intensity > 0.5) {
        storms += 1;
        inStorm = true;
      } else if (inStorm && s.intensity < 0.1) {
        inStorm = false;
      }
    }
    expect(storms).toBeGreaterThanOrEqual(3);
  });

  it("is deterministic for a seed and differs across seeds", () => {
    const a = samples(new TrackWeather("rain", "breezy-beach-blast"), 90, 1).map((s) => s.intensity);
    const b = samples(new TrackWeather("rain", "breezy-beach-blast"), 90, 1).map((s) => s.intensity);
    const c = samples(new TrackWeather("rain", "other-seed"), 90, 1).map((s) => s.intensity);
    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
  });

  it("makes the road slippier and the steering looser as the storm peaks", () => {
    const w = new TrackWeather("snow", "frosty-flurry-run");
    const seen = samples(w, 180);
    const clear = seen.find((s) => s.intensity === 0);
    const peak = seen.reduce((best, s) => (s.intensity > best.intensity ? s : best));
    expect(clear).toBeDefined();
    expect(clear!.gripScale).toBe(1);
    expect(clear!.yawScale).toBe(1);
    expect(peak.gripScale).toBeCloseTo(WEATHER.gripAtPeak, 5);
    expect(peak.yawScale).toBeCloseTo(WEATHER.yawAtPeak, 5);
    expect(peak.gripScale).toBeLessThan(1);
    expect(peak.yawScale).toBeLessThan(1);
  });

  it("ramps in and out instead of snapping on", () => {
    const w = new TrackWeather("rain", "breezy-beach-blast");
    const seen = samples(w, 120, 0.1);
    let rising = 0;
    for (let i = 1; i < seen.length; i++) {
      const d = seen[i].intensity - seen[i - 1].intensity;
      if (d > 0 && seen[i].intensity > 0.05 && seen[i].intensity < 0.95) {
        expect(d).toBeLessThan(0.12);
        rising += 1;
      }
    }
    expect(rising).toBeGreaterThan(10);
  });
});

describe("weather kinds", () => {
  it.each(["snow", "rain"] as WeatherKind[])("schedules %s the same way", (kind) => {
    const w = new TrackWeather(kind, "shared-seed");
    expect(w.at(0).kind).toBe(kind);
    expect(w.at(40).kind).toBe(kind);
  });
});
