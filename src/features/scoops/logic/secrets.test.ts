import { describe, expect, it } from "vitest";
import { EMPTY_CREATION } from "../types";
import { matchingSecrets } from "./secrets";

describe("secret recipes", () => {
  it("discovers Super Moon when both flavors are present, even with extras", () => {
    const found = matchingSecrets({
      ...EMPTY_CREATION,
      containerId: "waffle-cone",
      mix: "double",
      flavorIds: ["vanilla", "blue-moon", "superman"],
      extraIds: ["cherry"],
    });
    expect(found.map((secret) => secret.id)).toContain("super-moon");
    expect(found.map((secret) => secret.id)).not.toContain("shelbys-favorite");
  });

  it("needs the graham wafer for Campfire S'more", () => {
    const almost = matchingSecrets({
      ...EMPTY_CREATION,
      containerId: "cake-cone",
      flavorIds: ["chocolate"],
      toppingIds: ["marshmallows"],
    });
    expect(almost.map((secret) => secret.id)).not.toContain("campfire-smore");
    const done = matchingSecrets({ ...almost[0] ? EMPTY_CREATION : EMPTY_CREATION, containerId: "cake-cone", flavorIds: ["chocolate"], toppingIds: ["marshmallows"], extraIds: ["wafer"] });
    expect(done.map((secret) => secret.id)).toContain("campfire-smore");
  });

  it("discovers Shelby's Favorite only in her cup", () => {
    const creation = {
      ...EMPTY_CREATION,
      mix: "double" as const,
      flavorIds: ["superman", "blue-moon"],
      toppingIds: ["rainbow-sprinkles"],
      sauceIds: ["marshmallow"],
      extraIds: ["cherry"],
    };
    expect(matchingSecrets({ ...creation, containerId: "waffle-cone" }).map((secret) => secret.id)).not.toContain("shelbys-favorite");
    const found = matchingSecrets({ ...creation, containerId: "shelby-cup" }).map((secret) => secret.id);
    expect(found).toContain("shelbys-favorite");
    expect(found).toContain("super-moon");
  });
});
