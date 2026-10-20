import type { Lane, LaneEntity, LaneKind } from "../types";

/** Hand-built lane for tests: a long track so nothing wraps unexpectedly. */
export function testLane(
  row: number,
  kind: LaneKind,
  entities: Partial<LaneEntity>[],
  opts: Partial<Pick<Lane, "dir" | "speed" | "trackStart" | "trackLength" | "diveCycle">> = {},
): Lane {
  return {
    row,
    kind,
    vehicle: kind === "road" ? "car" : undefined,
    dir: opts.dir ?? 1,
    speed: opts.speed ?? 0,
    trackStart: opts.trackStart ?? -10,
    trackLength: opts.trackLength ?? 100,
    diveCycle: opts.diveCycle,
    entities: entities.map((e, i) => ({ offset: 0, length: 1, variant: i, ...e })),
  };
}
