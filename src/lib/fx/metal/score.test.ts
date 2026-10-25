import { describe, expect, it } from "vitest";
import { BARS, LOOP_SECONDS, LOOP_STEPS, STEPS_PER_BAR, midiToHz, stepEvents } from "./score";

const all = Array.from({ length: LOOP_STEPS }, (_, i) => stepEvents(i));

describe("metal score", () => {
  it("is 16 bars of 16 steps and loops in about 23 seconds", () => {
    expect(LOOP_STEPS).toBe(BARS * STEPS_PER_BAR);
    expect(LOOP_SECONDS).toBeGreaterThan(20);
    expect(LOOP_SECONDS).toBeLessThan(26);
  });

  it("wraps around the loop point", () => {
    expect(stepEvents(LOOP_STEPS)).toEqual(stepEvents(0));
    expect(stepEvents(-1)).toEqual(stepEvents(LOOP_STEPS - 1));
  });

  it("opens with a crash and a chord on the one", () => {
    const first = stepEvents(0);
    expect(first.crash).toBe(true);
    expect(first.kick).toBe(true);
    expect(first.guitar?.accent).toBe(true);
    expect(first.guitar?.notes).toEqual([40, 47, 52]);
  });

  it("keeps every note in a playable range", () => {
    for (const e of all) {
      for (const n of e.guitar?.notes ?? []) {
        expect(n).toBeGreaterThanOrEqual(36);
        expect(n).toBeLessThanOrEqual(60);
      }
      if (e.bass) expect(e.bass.note).toBeGreaterThanOrEqual(36);
      if (e.lead) {
        expect(e.lead.note).toBeGreaterThanOrEqual(64);
        expect(e.lead.note).toBeLessThanOrEqual(88);
      }
    }
  });

  it("keeps the lead to the second half and never lets a note run past the bar", () => {
    all.forEach((e, i) => {
      if (!e.lead) return;
      expect(i).toBeGreaterThanOrEqual(LOOP_STEPS / 2);
      expect((i % STEPS_PER_BAR) + e.lead.steps).toBeLessThanOrEqual(STEPS_PER_BAR);
    });
    expect(all.filter((e) => e.lead).length).toBeGreaterThan(20);
  });

  it("has a real backbeat and a lot of kick", () => {
    expect(all.filter((e) => e.snare).length).toBeGreaterThanOrEqual(BARS * 2);
    expect(all.filter((e) => e.kick).length).toBeGreaterThan(LOOP_STEPS / 2);
    for (let bar = 0; bar < BARS; bar++) expect(stepEvents(bar * STEPS_PER_BAR + 4).snare).toBe(true);
  });

  it("never plays a hat on top of a snare", () => {
    for (const e of all) if (e.snare) expect(e.hat).toBeNull();
  });

  it("converts MIDI to hertz", () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(40)).toBeCloseTo(82.41, 1);
  });
});
