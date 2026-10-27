import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileScoopsRepository } from "./fileRepository";
import { createScoopsRepository } from "./serverRepository";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  dirs.length = 0;
});

describe("scoops file store", () => {
  it("reloads a saved recipe from disk", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scoops-"));
    dirs.push(dir);
    const file = path.join(dir, "scoops-db.json");
    const first = new FileScoopsRepository(file);
    first.ensureUser("Greta");
    const saved = first.createRecipe("Greta", {
      name: "Saved Cone",
      isPublic: true,
      containerId: "cake-cone",
      mix: "single",
      flavorIds: ["vanilla"],
      toppingIds: [],
      sauceIds: [],
      extraIds: [],
    });
    const second = new FileScoopsRepository(file);
    expect(second.getRecipe("Greta", saved.recipe.id).name).toBe("Saved Cone");
  });

  it("still serves the community list when the shop file cannot be created", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scoops-"));
    dirs.push(dir);
    const blocker = path.join(dir, "not-a-directory");
    fs.writeFileSync(blocker, "x");
    const repo = createScoopsRepository(path.join(blocker, "scoops-db.json"));
    expect(repo.listRecipes("Shelby", "community", "newest").length).toBeGreaterThan(0);
  });
});
