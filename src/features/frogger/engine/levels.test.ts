import { describe, expect, it } from "vitest";
import { seededRng } from "@/lib/rng";
import { COLS } from "../config";
import { MAX_SPEED_MUL, MIN_DIVE_CYCLE, MIN_LOG_LENGTH, MIN_TIMER_SECONDS, levelDef } from "../levelConfig";
import type { Lane } from "../types";
import { mod } from "./lanes";
import { LANE_MARGIN, MAX_RIVER_GAP, buildLanes, minRoadGap } from "./levels";

/** Gaps between consecutive entities around the loop. */
function gaps(lane: Lane): number[] {
  const starts = lane.entities.map((e) => mod(e.offset, lane.trackLength)).sort((a, b) => a - b);
  return starts.map((s, i) => {
    const next = i + 1 < starts.length ? starts[i + 1] : starts[0] + lane.trackLength;
    return next - s - lane.entities[0].length;
  });
}

describe("level definitions", () => {
  it("get harder level by level", () => {
    const [l1, l2, l3, l4] = [1, 2, 3, 4].map(levelDef);
    expect(l2.speedMul).toBeGreaterThan(l1.speedMul);
    expect(l3.speedMul).toBeGreaterThan(l2.speedMul);
    expect(l4.speedMul).toBeGreaterThan(l3.speedMul);
    expect(l2.timerSeconds).toBeLessThan(l1.timerSeconds);
    expect(l2.divingGroups).toBeGreaterThan(l1.divingGroups);
    expect(l2.diveCycle).toBeLessThan(l1.diveCycle);
  });

  it("cap difficulty so very high levels stay playable", () => {
    const l50 = levelDef(50);
    expect(l50.speedMul).toBe(MAX_SPEED_MUL);
    expect(l50.timerSeconds).toBe(MIN_TIMER_SECONDS);
    expect(l50.diveCycle).toBe(MIN_DIVE_CYCLE);
  });
});

describe("built lanes", () => {
  it("are deterministic for a seed", () => {
    expect(buildLanes(2, seededRng("daily:2026-10-19"))).toEqual(buildLanes(2, seededRng("daily:2026-10-19")));
    expect(buildLanes(2, seededRng("a"))).not.toEqual(buildLanes(2, seededRng("b")));
  });

  for (let level = 1; level <= 20; level++) {
    it(`level ${level} always has a way across`, () => {
      const lanes = buildLanes(level, seededRng(`check:${level}`));
      expect(lanes).toHaveLength(10);
      for (const lane of lanes) {
        // Everything wraps fully off-screen.
        expect(lane.trackStart + lane.entities[0].length).toBeLessThanOrEqual(-LANE_MARGIN + 1e-9);
        expect(lane.trackStart + lane.trackLength).toBeGreaterThanOrEqual(COLS + LANE_MARGIN - 1e-9);
        const g = gaps(lane);
        if (lane.kind === "road") {
          expect(Math.min(...g)).toBeGreaterThanOrEqual(minRoadGap(lane.speed) - 1e-9);
        } else {
          expect(Math.max(...g)).toBeLessThanOrEqual(MAX_RIVER_GAP + 1e-9);
          expect(lane.entities[0].length).toBeGreaterThanOrEqual(MIN_LOG_LENGTH);
        }
        if (lane.kind === "turtle") {
          expect(lane.entities.some((e) => !e.dives)).toBe(true);
        }
      }
    });
  }

  it("level 1 has exactly one diving turtle group, later levels more", () => {
    const diving = (level: number) =>
      buildLanes(level, seededRng("x"))
        .filter((l) => l.kind === "turtle")
        .flatMap((l) => l.entities)
        .filter((e) => e.dives).length;
    expect(diving(1)).toBe(1);
    expect(diving(2)).toBe(2);
    expect(diving(3)).toBe(3);
  });
});
