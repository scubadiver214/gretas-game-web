import { describe, expect, it } from "vitest";
import { colorScore, sortRecipes, weirdScore } from "../logic/rank";
import { MemoryRepository } from "./memoryRepository";

function vanilla(name = "Plain Vanilla") {
  return {
    name,
    description: "",
    isPublic: true,
    containerId: "cake-cone",
    mix: "single" as const,
    flavorIds: ["vanilla"],
    toppingIds: ["sprinkles"],
    sauceIds: [],
    extraIds: [],
  };
}

describe("scoops repository", () => {
  it("opens Shelby's book already full", () => {
    const repo = new MemoryRepository();
    const session = repo.ensureUser("Shelby");
    expect(session.user.level).toBeGreaterThanOrEqual(10);
    expect(session.user.displayName).toBe("Shelby");
    expect(session.recipes.map((recipe) => recipe.name)).toEqual(expect.arrayContaining(["Shelby's Super Moon", "Chocolate Explosion"]));
    expect(session.unlocks.flavors).toContain("blue-moon");
  });

  it("starts a new scooper on vanilla and refuses Blue Moon", () => {
    const repo = new MemoryRepository();
    const session = repo.ensureUser("Greta");
    expect(session.user.level).toBe(1);
    expect(session.unlocks.flavors).toContain("vanilla");
    expect(session.unlocks.flavors).not.toContain("blue-moon");
    expect(() =>
      repo.createRecipe("Greta", {
        ...vanilla(),
        flavorIds: ["blue-moon"],
      }),
    ).toThrow(/freezer/i);
  });

  it("saves, reloads, edits, and deletes only the owner's recipe", () => {
    const repo = new MemoryRepository();
    repo.ensureUser("Greta");
    const saved = repo.createRecipe("Greta", vanilla("Greta's First"));
    expect(saved.recipe.ownerUserId).toBe("greta");
    expect(saved.recipe.stats.timesMade).toBe(1);
    expect(saved.rewards.achievements.map((badge) => badge.id)).toContain("first-scoop");
    expect(saved.rewards.avatars.map((avatar) => avatar.id)).toEqual(expect.arrayContaining(["sprinkle-pal", "cone-kid"]));
    expect(saved.session.user.xp).toBeGreaterThan(0);

    const loaded = repo.getRecipe("Greta", saved.recipe.id);
    expect(loaded.name).toBe("Greta's First");

    const edited = repo.updateRecipe("Greta", saved.recipe.id, { ...vanilla("Greta's Second"), toppingIds: ["sprinkles", "cherries"] });
    expect(edited.recipe.name).toBe("Greta's Second");
    expect(edited.rewards.xp).toBeLessThan(saved.rewards.xp);
    expect(repo.ensureUser("Greta").recipes).toHaveLength(1);

    expect(() => repo.updateRecipe("Berry", saved.recipe.id, vanilla("Stolen"))).toThrow(/someone else/i);
    expect(() => repo.deleteRecipe("Berry", saved.recipe.id)).toThrow(/someone else/i);

    repo.deleteRecipe("Greta", saved.recipe.id);
    expect(repo.ensureUser("Greta").recipes).toHaveLength(0);
    expect(() => repo.getRecipe("Greta", saved.recipe.id)).toThrow(/can't find/i);
  });

  it("hides a private recipe from the community and from other scoopers", () => {
    const repo = new MemoryRepository();
    repo.ensureUser("Greta");
    const saved = repo.createRecipe("Greta", { ...vanilla("Secret Snack"), isPublic: false });
    expect(repo.listRecipes("Berry", "community", "newest").some((recipe) => recipe.id === saved.recipe.id)).toBe(false);
    expect(() => repo.getRecipe("Berry", saved.recipe.id)).toThrow(/can't find/i);
  });

  it("favorites, makes, and clones with attribution", () => {
    const repo = new MemoryRepository();
    const loved = repo.favorite("Greta", "recipe_berry_blast");
    expect(loved.favorite).toBe(true);
    expect(loved.recipe.stats.favorites).toBe(3);
    expect(repo.favorite("Greta", "recipe_berry_blast").favorite).toBe(false);

    const made = repo.make("Greta", "recipe_super_moon");
    expect(made.recipe.stats.timesMade).toBe(13);
    expect(made.note).toMatch(/Recipe Star/);
    expect(repo.listAchievements("Greta", "shelby").some((badge) => badge.id === "recipe-star")).toBe(true);

    const copy = repo.clone("Shelby", "recipe_berry_blast");
    expect(copy.recipe.ownerUserId).toBe("shelby");
    expect(copy.recipe.inspiredBy?.owner).toBe("Berry");
    expect(copy.recipe.inspiredBy?.name).toBe("Berry Blast");
    expect(copy.recipe.isPublic).toBe(false);
  });

  it("ranks the weird cup ahead of plain vanilla and the rainbow first for color", () => {
    const repo = new MemoryRepository();
    const community = repo.listRecipes("Greta", "community", "newest");
    const wormy = community.find((recipe) => recipe.id === "recipe_wormy_moon");
    const unicorn = community.find((recipe) => recipe.id === "recipe_rainbow_unicorn");
    const berry = community.find((recipe) => recipe.id === "recipe_berry_blast");
    expect(wormy && berry && weirdScore(wormy)).toBeGreaterThan(weirdScore(berry!));
    expect(unicorn && berry && colorScore(unicorn)).toBeGreaterThan(colorScore(berry!));
    const colorful = sortRecipes(community, "colorful");
    expect(colorful[0]?.id).toBe("recipe_rainbow_unicorn");
    const shelbyPicks = repo.listRecipes("Greta", "community", "shelby");
    expect(shelbyPicks.every((recipe) => recipe.shelbyFavorite)).toBe(true);
    expect(shelbyPicks.length).toBeGreaterThan(0);
  });

  it("discovers Super Moon once Shelby has the flavors, and only once", () => {
    const repo = new MemoryRepository();
    const first = repo.createRecipe("Shelby", {
      name: "Moon Test",
      isPublic: false,
      containerId: "cake-cone",
      mix: "double",
      flavorIds: ["blue-moon", "superman"],
      toppingIds: [],
      sauceIds: [],
      extraIds: [],
    });
    expect(first.rewards.discoveries.map((secret) => secret.id)).not.toContain("super-moon");
    const favorite = repo.createRecipe("Shelby", {
      name: "Back Room",
      isPublic: false,
      containerId: "shelby-cup",
      mix: "double",
      flavorIds: ["blue-moon", "superman"],
      toppingIds: ["rainbow-sprinkles"],
      sauceIds: ["marshmallow"],
      extraIds: ["cherry"],
    });
    expect(favorite.rewards.discoveries.map((secret) => secret.id)).toEqual(expect.arrayContaining(["shelbys-favorite"]));
    expect(favorite.rewards.achievements.map((badge) => badge.id)).toContain("shelbys-favorite");
    expect(favorite.rewards.avatars.map((avatar) => avatar.id)).toContain("shelbys-twin");
    expect(favorite.rewards.levelAfter).toBeGreaterThanOrEqual(favorite.rewards.levelBefore);
  });
});
