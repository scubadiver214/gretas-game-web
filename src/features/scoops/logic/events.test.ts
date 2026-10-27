import { describe, expect, it } from "vitest";
import { eventForUser } from "./events";

const starter = { flavors: ["vanilla", "chocolate", "strawberry"], sauces: ["hot-fudge", "caramel"] };

describe("shop events", () => {
  it("stays the same for a player on a given day", () => {
    const first = eventForUser("2026-10-27", "greta", starter, []);
    const second = eventForUser("2026-10-27", "greta", starter, []);
    expect(second).toEqual(first);
  });

  it("does not ask a new scooper for Blue Moon", () => {
    const event = eventForUser("2026-10-01", "greta", starter, []);
    expect(event?.kind === "challenge").toBe(false);
  });

  it("can ask Shelby, who has the freezer open", () => {
    const event = eventForUser("2026-04-02", "shelby", { flavors: ["blue-moon", "strawberry", "vanilla"], sauces: ["hot-fudge"] }, []);
    expect(["double-xp", "mystery", "challenge", undefined]).toContain(event?.kind);
    if (event?.kind === "challenge") expect(event.flavorIds).toContain("blue-moon");
  });
});
