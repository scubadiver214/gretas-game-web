import type { Rng } from "@/lib/rng";
import { COLS } from "../config";
import { LANE_BLUEPRINTS, MIN_LOG_LENGTH, levelDef } from "../levelConfig";
import type { Lane, LaneEntity } from "../types";

/** Tiles of lane visible beyond each side of the board (things slide in from here). */
export const LANE_MARGIN = 3;
/** Longest stretch of open water between two platforms in a river lane. */
export const MAX_RIVER_GAP = 6;

/** Smallest bumper-to-bumper gap on a road: room for the frog plus reaction time. */
export function minRoadGap(speed: number): number {
  return 2 + speed * 0.35;
}

/** Minimum loop length so entities wrap completely off-screen on both sides. */
function minTrackLength(length: number): number {
  return COLS + 2 * LANE_MARGIN + length;
}

/**
 * Lanes for a level. Blueprints are scaled by the level definition, spaced
 * evenly around a loop that wraps off-screen, and given a seeded phase so a
 * daily challenge lays out identically for everyone.
 */
export function buildLanes(level: number, rng: Rng): Lane[] {
  const def = levelDef(level);
  let divingLeft = def.divingGroups;
  const turtleLanes: Lane[] = [];

  const lanes = LANE_BLUEPRINTS.map((bp) => {
    const isRoad = bp.kind === "road";
    const length = bp.kind === "log" ? Math.max(MIN_LOG_LENGTH, bp.length + def.logLengthDelta) : bp.length;
    const speed = bp.speed * def.speedMul;
    let count = bp.count + (isRoad && bp.getsExtraTraffic ? def.extraTraffic[bp.getsExtraTraffic] : 0);
    const minGap = isRoad ? minRoadGap(speed) : 1;

    let trackLength = Math.max(minTrackLength(length), count * (length + minGap));
    // River lanes must never leave an impossible stretch of water.
    while (!isRoad && trackLength / count - length > MAX_RIVER_GAP) {
      count++;
      trackLength = Math.max(minTrackLength(length), count * (length + minGap));
    }

    const spacing = trackLength / count;
    const slack = spacing - length - minGap;
    const phase = rng() * spacing;
    const entities: LaneEntity[] = Array.from({ length: count }, (_, i) => {
      // Roads get a little jitter so traffic doesn't look like a metronome;
      // ±15 % of the slack keeps every gap at or above minGap.
      const jitter = isRoad ? (rng() - 0.5) * 0.3 * slack : 0;
      return { offset: phase + i * spacing + jitter, length, variant: Math.floor(rng() * 1000) };
    });

    const lane: Lane = {
      row: bp.row,
      kind: bp.kind,
      vehicle: bp.vehicle,
      dir: bp.dir,
      speed,
      trackStart: -(LANE_MARGIN + length),
      trackLength,
      entities,
    };
    if (bp.kind === "turtle") {
      lane.diveCycle = def.diveCycle;
      turtleLanes.push(lane);
    }
    return lane;
  });

  // Hand out diving groups lane by lane, keeping at least one safe group per lane.
  const order = [0, 2, 1, 3, 4, 5];
  for (const idx of order) {
    for (const lane of turtleLanes) {
      if (divingLeft <= 0) break;
      const group = lane.entities[idx];
      const diving = lane.entities.filter((e) => e.dives).length;
      if (!group || group.dives || diving >= lane.entities.length - 1) continue;
      group.dives = true;
      group.divePhase = rng();
      divingLeft--;
    }
  }

  return lanes;
}

export function laneForRow(lanes: readonly Lane[], row: number): Lane | undefined {
  return lanes.find((l) => l.row === row);
}
