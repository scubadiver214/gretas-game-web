import { describe, expect, it } from "vitest";
import { levelForXp } from "../config";
import { EMPTY_CREATION } from "../types";
import { chocolateOverload, evaluateAchievements, fruitCount, scoreCreation } from "./progression";

describe("scoops progression", () => {
  it("opens level 2 on the first decent scoop and level 10 a while later", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(40)).toBe(2);
    expect(levelForXp(819)).toBe(9);
    expect(levelForXp(820)).toBe(10);
  });

  it("pays more for a new scoop than an edit, and doubles on Double Scoop Day", () => {
    const creation = { ...EMPTY_CREATION, containerId: "cake-cone", flavorIds: ["vanilla", "chocolate"], toppingIds: ["sprinkles"] };
    const created = scoreCreation(creation, "create", [], null);
    const edited = scoreCreation(creation, "edit", [], null);
    expect(created.xp).toBeGreaterThan(edited.xp);
    const doubled = scoreCreation(creation, "create", [], {
      id: "double-xp",
      kind: "double-xp",
      title: "DOUBLE SCOOP DAY!",
      detail: "",
      date: "2026-10-27",
      completed: false,
    });
    expect(doubled.xp).toBe(created.xp * 2);
  });

  it("spots chocolate overload and a fruit explosion", () => {
    expect(chocolateOverload({ ...EMPTY_CREATION, flavorIds: ["chocolate"], sauceIds: ["hot-fudge"], toppingIds: ["chocolate-chips"] })).toBe(true);
    expect(fruitCount({ ...EMPTY_CREATION, flavorIds: ["strawberry"], toppingIds: ["blueberries", "banana"] })).toBe(3);
  });

  it("awards the first badges once", () => {
    const creation = { ...EMPTY_CREATION, containerId: "cake-cone", flavorIds: ["vanilla", "chocolate", "strawberry"] };
    const first = evaluateAchievements({ recipesCreated: 1, recipeStar: false, discoveries: [], creation, already: [] });
    expect(first.map((badge) => badge.id)).toEqual(expect.arrayContaining(["first-scoop", "double-trouble", "triple-scoop"]));
    const again = evaluateAchievements({ recipesCreated: 1, recipeStar: false, discoveries: [], creation, already: first.map((badge) => badge.id) });
    expect(again).toEqual([]);
  });
});
