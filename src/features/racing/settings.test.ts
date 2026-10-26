import { describe, expect, it } from "vitest";
import { TRACKS } from "./world";
import { useRacingSettings } from "./settings";

const migrate = (persisted: unknown) => useRacingSettings.persist.getOptions().migrate!(persisted, 1) as ReturnType<typeof useRacingSettings.getState>;

describe("racing settings: the saved track", () => {
  it("starts on the first track", () => {
    expect(useRacingSettings.getState().trackId).toBe(TRACKS[0].id);
  });

  it("keeps a known saved track", () => {
    expect(migrate({ trackId: TRACKS[2].id }).trackId).toBe(TRACKS[2].id);
  });

  it("falls back to the first track for an unknown or missing one", () => {
    expect(migrate({ trackId: "moon-base" }).trackId).toBe(TRACKS[0].id);
    expect(migrate({}).trackId).toBe(TRACKS[0].id);
    expect(migrate(undefined).trackId).toBe(TRACKS[0].id);
  });
});

describe("racing settings: race or time trial", () => {
  it("races the rivals by default", () => {
    expect(useRacingSettings.getState().mode).toBe("rivals");
    expect(migrate({}).mode).toBe("rivals");
  });

  it("keeps a saved time trial and keeps the rest of an older save", () => {
    expect(migrate({ mode: "timeTrial" }).mode).toBe("timeTrial");
    expect(migrate({ trackId: TRACKS[1].id, assist: "extra" })).toMatchObject({ trackId: TRACKS[1].id, assist: "extra", mode: "rivals" });
  });

  it("falls back to racing for anything unexpected", () => {
    expect(migrate({ mode: "demolition-derby" }).mode).toBe("rivals");
  });
});

describe("racing settings: how many races you have started", () => {
  it("starts at zero and counts a race", () => {
    useRacingSettings.setState({ racesEntered: 0 });
    expect(useRacingSettings.getState().racesEntered).toBe(0);
    useRacingSettings.getState().noteRace();
    expect(useRacingSettings.getState().racesEntered).toBe(1);
  });

  it("keeps a saved count and ignores a broken one", () => {
    expect(migrate({ racesEntered: 4 }).racesEntered).toBe(4);
    expect(migrate({ racesEntered: 4.8 }).racesEntered).toBe(4);
    expect(migrate({}).racesEntered).toBe(0);
    expect(migrate({ racesEntered: -2 }).racesEntered).toBe(0);
  });
});
