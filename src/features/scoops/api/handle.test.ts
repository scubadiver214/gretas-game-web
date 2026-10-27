import { describe, expect, it } from "vitest";
import { handleScoops } from "./handle";
import { MemoryRepository } from "../data/memoryRepository";

function call(repo: MemoryRepository, method: string, path: string[], player: string | null, body?: unknown) {
  return handleScoops(repo, { method, path, player, body, query: {} });
}

describe("scoops handler", () => {
  it("refuses a missing nickname", () => {
    const response = call(new MemoryRepository(), "GET", ["me"], null);
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: expect.stringMatching(/nickname/i) });
  });

  it("saves and loads a recipe through the handler", () => {
    const repo = new MemoryRepository();
    const saved = call(repo, "POST", ["recipes"], "Greta", {
      name: "Handler Cone",
      isPublic: true,
      containerId: "sugar-cone",
      mix: "single",
      flavorIds: ["chocolate"],
      toppingIds: ["chocolate-chips"],
      sauceIds: ["hot-fudge"],
      extraIds: [],
    });
    expect(saved.status).toBe(201);
    const id = (saved.body as { recipe: { id: string } }).recipe.id;
    const loaded = call(repo, "GET", ["recipes", id], "Greta");
    expect(loaded.status).toBe(200);
    expect(loaded.body).toMatchObject({ name: "Handler Cone", ownerUserId: "greta" });

    const stolen = call(repo, "DELETE", ["recipes", id], "Berry");
    expect(stolen.status).toBe(403);
    expect(stolen.body).toMatchObject({ message: expect.stringMatching(/someone else/i) });
    expect((stolen.body as { message: string }).message).not.toMatch(/403|SQL|stack/i);
  });

  it("lists flavors from the catalog", () => {
    const response = call(new MemoryRepository(), "GET", ["flavors"], "Greta");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: "vanilla" })]));
  });
});
