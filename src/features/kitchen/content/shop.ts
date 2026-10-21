import { INGREDIENTS, INGREDIENT_BY_ID, type IngredientId } from "./ingredients";
import { RECIPES, recipeIngredients, type RecipeDef } from "./recipes";

export type UpgradeId = "sneakers" | "sharp-knife" | "turbo-oven" | "comfy-chairs" | "tip-jar" | "extra-oven";

export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  emoji: string;
  description: string;
  price: number;
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: "sneakers", label: "Speedy sneakers", emoji: "👟", description: "Chefs run 15% faster.", price: 150 },
  { id: "sharp-knife", label: "Sharp knife", emoji: "🔪", description: "Rolling, chopping and slicing are 35% faster.", price: 200 },
  { id: "tip-jar", label: "Big tip jar", emoji: "🫙", description: "Customers tip 30% more.", price: 180 },
  { id: "comfy-chairs", label: "Comfy chairs", emoji: "🪑", description: "Customers wait 20% longer.", price: 220 },
  { id: "turbo-oven", label: "Turbo ovens", emoji: "🔥", description: "Pizzas bake 25% faster.", price: 250 },
  { id: "extra-oven", label: "Extra oven", emoji: "♨️", description: "Adds a third oven to the kitchen.", price: 350 },
] as const;

export const UPGRADE_BY_ID: Record<UpgradeId, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

export function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === "string" && value in UPGRADE_BY_ID;
}

/** Gameplay multipliers derived from the owned upgrades. */
export interface KitchenMods {
  moveSpeed: number;
  workSpeed: number;
  bakeSpeed: number;
  patience: number;
  tips: number;
  extraOven: boolean;
}

export const BASE_MODS: KitchenMods = { moveSpeed: 1, workSpeed: 1, bakeSpeed: 1, patience: 1, tips: 1, extraOven: false };

export function modsFor(upgrades: readonly UpgradeId[]): KitchenMods {
  const has = (id: UpgradeId) => upgrades.includes(id);
  return {
    moveSpeed: has("sneakers") ? 1.15 : 1,
    workSpeed: has("sharp-knife") ? 1.35 : 1,
    bakeSpeed: has("turbo-oven") ? 1.25 : 1,
    patience: has("comfy-chairs") ? 1.2 : 1,
    tips: has("tip-jar") ? 1.3 : 1,
    extraOven: has("extra-oven"),
  };
}

export type ShopItem =
  | { kind: "ingredient"; id: IngredientId; label: string; emoji: string; price: number }
  | { kind: "upgrade"; id: UpgradeId; label: string; emoji: string; price: number };

export const SHOP_INGREDIENTS: readonly ShopItem[] = INGREDIENTS.filter((i) => i.price > 0)
  .map((i) => ({ kind: "ingredient" as const, id: i.id, label: i.label, emoji: i.emoji, price: i.price }))
  .sort((a, b) => a.price - b.price);

export const SHOP_UPGRADES: readonly ShopItem[] = UPGRADES.map((u) => ({ kind: "upgrade" as const, id: u.id, label: u.label, emoji: u.emoji, price: u.price }));

/** Recipes that use this ingredient, with whatever else is still missing for each. */
export function recipesUsing(id: IngredientId, owned: readonly IngredientId[]): { recipe: RecipeDef; missing: IngredientId[] }[] {
  const have = new Set([...owned, id]);
  return RECIPES.filter((r) => recipeIngredients(r).includes(id)).map((recipe) => ({
    recipe,
    missing: recipeIngredients(recipe).filter((i) => !have.has(i)),
  }));
}

/** Human summary of what buying an ingredient unlocks, for the shop card. */
export function unlockBlurb(id: IngredientId, owned: readonly IngredientId[]): string {
  const uses = recipesUsing(id, owned);
  if (uses.length === 0) return "A new flavour for the pantry.";
  const ready = uses.filter((u) => u.missing.length === 0).map((u) => u.recipe.name);
  const later = uses.filter((u) => u.missing.length > 0);
  const parts: string[] = [];
  if (ready.length) parts.push(`Unlocks ${ready.join(", ")}`);
  if (later.length) {
    const first = later[0];
    const needs = first.missing.map((m) => INGREDIENT_BY_ID[m].emoji).join("");
    parts.push(`${first.recipe.name} also needs ${needs}`);
  }
  return `${parts.join(". ")}.`;
}
