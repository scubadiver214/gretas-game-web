import { NAME_MAX } from "../config";
import { catalog } from "../game-data/catalog";
import type { CurrentCreation, IceCreamRecipe, RecipeSort } from "../types";
import { matchingSecrets } from "./secrets";

function clip(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim();
  return trimmed.length <= NAME_MAX ? trimmed : trimmed.slice(0, NAME_MAX).trim();
}

export function suggestNames(creation: CurrentCreation, knownSecretIds: readonly string[] = []): string[] {
  const known = new Set(knownSecretIds);
  const names: string[] = [];
  for (const secret of matchingSecrets(creation)) {
    if (!known.has(secret.id)) names.push(secret.name);
  }
  const flavors = creation.flavorIds
    .map((id) => catalog.flavorById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
  if (flavors.length >= 2) names.push(`${flavors[0]} ${flavors[1]}`);
  if (flavors[0]) names.push(`${flavors[0]} Dream`);
  names.push("Shelby's Special");
  const unique: string[] = [];
  for (const name of names) {
    const next = clip(name);
    if (next.length >= 2 && !unique.includes(next)) unique.push(next);
  }
  return unique.slice(0, 3);
}

export function describeCreation(creation: CurrentCreation): string {
  const container = creation.containerId ? catalog.containerById.get(creation.containerId)?.name : undefined;
  const flavors = creation.flavorIds.map((id) => catalog.flavorById.get(id)?.name).filter(Boolean);
  const toppings = creation.toppingIds.map((id) => catalog.toppingById.get(id)?.name).filter(Boolean);
  const sauces = creation.sauceIds.map((id) => catalog.sauceById.get(id)?.name).filter(Boolean);
  const extras = creation.extraIds.map((id) => catalog.extraById.get(id)?.name).filter(Boolean);
  const parts = [container, flavors.length ? flavors.join(", ") : "", toppings.length ? toppings.join(", ") : "", sauces.length ? sauces.join(", ") : "", extras.length ? extras.join(", ") : ""].filter(Boolean);
  return parts.length ? parts.join(". ") : "An empty ice cream";
}

function ingredientIds(recipe: IceCreamRecipe): string[] {
  return [
    recipe.containerId,
    ...recipe.scoops.map((s) => s.flavorId),
    ...recipe.toppings.map((t) => t.toppingId),
    ...recipe.sauces.map((s) => s.sauceId),
    ...recipe.extras.map((e) => e.extraId),
  ];
}

export function colorScore(recipe: IceCreamRecipe): number {
  const colors = new Set<string>();
  for (const scoop of recipe.scoops) {
    const flavor = catalog.flavorById.get(scoop.flavorId);
    if (flavor) colors.add(flavor.color);
  }
  let score = colors.size;
  const ids = ingredientIds(recipe);
  if (ids.includes("rainbow-sprinkles")) score += 3;
  if (ids.includes("rainbow-sauce")) score += 3;
  if (ids.includes("rainbow")) score += 3;
  if (ids.includes("rainbow-cone") || ids.includes("rainbow-cup")) score += 3;
  if (ids.includes("superman")) score += 2;
  if (ids.includes("birthday-cake")) score += 2;
  if (ids.includes("cotton-candy")) score += 2;
  return score;
}

export function weirdScore(recipe: IceCreamRecipe): number {
  const ids = new Set(ingredientIds(recipe));
  let score = 0;
  if (recipe.mix === "crazy") score += 3;
  if (recipe.scoops.length >= 4) score += 2;
  if (ids.has("gummy-worms") || ids.has("gummy-worm")) score += 2;
  if (ids.has("pop-rocks")) score += 2;
  if (ids.has("blue-raspberry")) score += 1;
  if (ids.has("mystery-cup")) score += 2;
  if (ids.has("blue-moon") && ids.has("cotton-candy")) score += 2;
  if (ids.has("gummy-worms") && ids.has("peanut-butter")) score += 3;
  if (ids.has("peanuts") && ids.has("blue-moon")) score += 2;
  if (recipe.sauces.length >= 3) score += 1;
  for (const scoop of recipe.scoops) {
    const rarity = catalog.flavorById.get(scoop.flavorId)?.rarity;
    if (rarity === "rare" || rarity === "legendary") score += 1;
  }
  return score;
}

export function popularity(recipe: IceCreamRecipe): number {
  return recipe.stats.favorites * 3 + recipe.stats.timesMade;
}

export function sortRecipes(recipes: readonly IceCreamRecipe[], sort: RecipeSort): IceCreamRecipe[] {
  const copy = [...recipes];
  const byName = (a: IceCreamRecipe, b: IceCreamRecipe) => a.name.localeCompare(b.name);
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => popularity(b) - popularity(a) || byName(a, b));
    case "made":
      return copy.sort((a, b) => b.stats.timesMade - a.stats.timesMade || byName(a, b));
    case "favorited":
      return copy.sort((a, b) => b.stats.favorites - a.stats.favorites || byName(a, b));
    case "weird":
      return copy.sort((a, b) => weirdScore(b) - weirdScore(a) || byName(a, b));
    case "colorful":
      return copy.sort((a, b) => colorScore(b) - colorScore(a) || byName(a, b));
    case "shelby":
      return copy.filter((recipe) => recipe.shelbyFavorite).sort((a, b) => b.stats.favorites - a.stats.favorites || byName(a, b));
    case "newest":
    default:
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byName(a, b));
  }
}
