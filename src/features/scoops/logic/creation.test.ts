import { describe, expect, it } from "vitest";
import { EMPTY_CREATION } from "../types";
import { addFlavor, addTopping, pushHistory, redoHistory, setMix, undoHistory } from "./creation";

describe("scoops creation", () => {
  it("walks single scoops up to a crazy mix", () => {
    let creation = { ...EMPTY_CREATION };
    creation = addFlavor(creation, "vanilla").creation;
    expect(creation.mix).toBe("single");
    const second = addFlavor(creation, "chocolate");
    expect(second.creation.mix).toBe("double");
    expect(second.creation.flavorIds).toEqual(["vanilla", "chocolate"]);
    const third = addFlavor(second.creation, "strawberry");
    expect(third.creation.mix).toBe("triple");
    const fourth = addFlavor(third.creation, "fudge");
    expect(fourth.creation.mix).toBe("crazy");
    expect(fourth.creation.flavorIds).toHaveLength(4);
    expect(addFlavor(fourth.creation, "rocky-road").message).toMatch(/full/i);
  });

  it("does not upgrade a swirl when a third flavor is tapped", () => {
    const swirled = setMix({ ...EMPTY_CREATION, flavorIds: ["vanilla", "chocolate"], mix: "swirl" }, "swirl").creation;
    const blocked = addFlavor(swirled, "strawberry");
    expect(blocked.creation.flavorIds).toEqual(["vanilla", "chocolate"]);
    expect(blocked.message).toMatch(/full/i);
  });

  it("trims scoops when the style gets smaller", () => {
    const triple = { ...EMPTY_CREATION, mix: "triple" as const, flavorIds: ["vanilla", "chocolate", "strawberry"] };
    const single = setMix(triple, "single");
    expect(single.creation.flavorIds).toEqual(["vanilla"]);
    expect(single.message).toMatch(/kept the first/i);
  });

  it("toggles a topping off", () => {
    const on = addTopping(EMPTY_CREATION, "sprinkles").creation;
    expect(addTopping(on, "sprinkles").creation.toppingIds).toEqual([]);
  });

  it("undoes and redoes", () => {
    const start = { past: [], present: EMPTY_CREATION, future: [] };
    const next = pushHistory(start, addFlavor(EMPTY_CREATION, "vanilla").creation);
    const back = undoHistory(next);
    expect(back.present.flavorIds).toEqual([]);
    expect(redoHistory(back).present.flavorIds).toEqual(["vanilla"]);
  });
});
