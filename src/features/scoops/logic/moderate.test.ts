import { describe, expect, it } from "vitest";
import { moderateRecipeText } from "./moderate";

describe("recipe names", () => {
  it("keeps a friendly name", () => {
    const result = moderateRecipeText("Shelby's Super Moon", "A bright blue swirl");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.name).toBe("Shelby's Super Moon");
  });

  it("rejects a rude word, a link, and a tiny name", () => {
    expect(moderateRecipeText("oh shit").ok).toBe(false);
    expect(moderateRecipeText("look www.example.com").ok).toBe(false);
    expect(moderateRecipeText("a").ok).toBe(false);
    expect(moderateRecipeText("hello").ok).toBe(true);
  });
});
