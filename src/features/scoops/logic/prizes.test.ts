import { describe, expect, it } from "vitest";
import { EMPTY_CREATION } from "../types";
import { avatarPrizesEarned } from "./prizes";

const ids = (recipesCreated: number, creation: Partial<typeof EMPTY_CREATION>, already: string[] = []) =>
  avatarPrizesEarned(
    { recipesCreated, creation: { ...EMPTY_CREATION, ...creation } },
    new Set(already),
  ).map((avatar) => avatar.id);

describe("avatar prizes", () => {
  it("hands out the first-save prizes and skips ones already won", () => {
    const won = ids(1, { containerId: "cake-cone", flavorIds: ["vanilla"] });
    expect(won).toEqual(expect.arrayContaining(["sprinkle-pal", "cone-kid"]));
    expect(won).not.toContain("tower-champ");
    expect(ids(1, { containerId: "cake-cone", flavorIds: ["vanilla"] }, ["sprinkle-pal", "cone-kid"])).not.toContain("sprinkle-pal");
  });

  it("saves a cherry, a tower, and a fancy finish as separate prizes", () => {
    const won = ids(2, {
      containerId: "waffle-cone",
      mix: "triple",
      flavorIds: ["vanilla", "chocolate", "strawberry"],
      toppingIds: ["rainbow-sprinkles"],
      sauceIds: ["hot-fudge"],
      extraIds: ["cherry"],
    });
    expect(won).toEqual(expect.arrayContaining(["cherry-champ", "tower-champ", "rainbow-rider", "fancy-finish", "waffle-wizard"]));
    expect(won).not.toContain("silly-scoop");
    expect(won).not.toContain("shop-star");
  });

  it("keeps the rare faces behind hard cones", () => {
    expect(ids(4, { containerId: "cake-cone", mix: "crazy", flavorIds: ["vanilla", "chocolate", "strawberry", "fudge"] })).toContain("silly-scoop");
    expect(ids(4, { containerId: "cake-cone", flavorIds: ["vanilla"] })).not.toContain("shop-star");
    expect(ids(5, { containerId: "small-cup", flavorIds: ["vanilla"] })).toEqual(expect.arrayContaining(["shop-star", "cup-kid"]));
    expect(ids(10, { containerId: "cake-cone", flavorIds: ["vanilla"] })).toContain("recipe-hero");
    expect(
      ids(3, {
        containerId: "shelby-cup",
        mix: "double",
        flavorIds: ["blue-moon", "superman"],
        toppingIds: ["rainbow-sprinkles"],
        sauceIds: ["marshmallow"],
        extraIds: ["cherry"],
      }),
    ).toEqual(expect.arrayContaining(["moon-ranger", "shelbys-twin"]));
  });
});
