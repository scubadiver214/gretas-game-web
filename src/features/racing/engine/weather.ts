import { WEATHER } from "../config";
import { seededRng } from "@/lib/rng";
import type { WorldId } from "../world/track";
import { clamp01, lerp, smoothstep } from "./math";

export type WeatherKind = "none" | "snow" | "rain";

export interface WeatherSample {
  kind: WeatherKind;
  /** 0 = fair (or ambient flakes only), 1 = peak storm. */
  intensity: number;
  /** Multiplies tyre grip. 1 when clear. */
  gripScale: number;
  /** Multiplies steering yaw authority. 1 when clear. */
  yawScale: number;
}

interface Burst {
  start: number;
  peakStart: number;
  peakEnd: number;
  end: number;
}

const CLEAR: WeatherSample = { kind: "none", intensity: 0, gripScale: 1, yawScale: 1 };

/** Which world's weather, if any. Only winter and beach have storms. */
export function weatherKindFor(world: WorldId): WeatherKind {
  if (world === "winter") return "snow";
  if (world === "beach") return "rain";
  return "none";
}

/**
 * A seeded storm timetable for one track. `at(time)` is a pure lookup, so two
 * races with the same seed see the same snow or rain at the same race time.
 */
export class TrackWeather {
  readonly kind: WeatherKind;
  private readonly bursts: Burst[] = [];

  constructor(kind: WeatherKind, seed: string) {
    this.kind = kind;
    if (kind === "none") return;
    const rng = seededRng(`${seed}:weather`);
    const fade = WEATHER.fade;
    let t = 0;
    while (t < WEATHER.horizon) {
      t += WEATHER.gapMin + rng() * (WEATHER.gapMax - WEATHER.gapMin);
      const duration = WEATHER.stormMin + rng() * (WEATHER.stormMax - WEATHER.stormMin);
      const fadeIn = Math.min(fade, duration * 0.35);
      const fadeOut = Math.min(fade, duration * 0.35);
      this.bursts.push({
        start: t,
        peakStart: t + fadeIn,
        peakEnd: t + duration - fadeOut,
        end: t + duration,
      });
      t += duration;
    }
  }

  at(time: number): WeatherSample {
    if (this.kind === "none") return CLEAR;
    const intensity = intensityAt(this.bursts, time);
    return {
      kind: this.kind,
      intensity,
      gripScale: lerp(1, WEATHER.gripAtPeak, intensity),
      yawScale: lerp(1, WEATHER.yawAtPeak, intensity),
    };
  }
}

function intensityAt(bursts: readonly Burst[], time: number): number {
  for (let i = 0; i < bursts.length; i++) {
    const b = bursts[i];
    if (time < b.start) return 0;
    if (time > b.end) continue;
    if (time < b.peakStart) return smoothstep(b.start, b.peakStart, time);
    if (time <= b.peakEnd) return 1;
    return 1 - smoothstep(b.peakEnd, b.end, time);
  }
  return 0;
}

/** True once a storm is thick enough to matter for banners and heavy-weather effects. */
export function weatherIsHeavy(intensity: number): boolean {
  return clamp01(intensity) >= 0.45;
}
