import type { Rng } from "@/lib/rng";
import { CATEGORY_ORDER, INGREDIENT_BY_ID, INGREDIENTS, type IngredientId } from "../content/ingredients";
import { RECIPES, RECIPE_BY_ID, recipeIngredients, type RecipeDef, type RecipeId } from "../content/recipes";
import type { KitchenMods } from "../content/shop";
import { components } from "./pizza";
import { orderValue } from "./scoring";
import type { KitchenDifficulty, Order } from "./types";

/** Recipes this player could cook at this level with what they've unlocked. */
export function availableRecipes(level: number, unlocked: readonly IngredientId[]): RecipeDef[] {
  const have = new Set(unlocked);
  return RECIPES.filter((r) => r.minLevel <= level && recipeIngredients(r).every((i) => have.has(i)));
}

function sortPantry(ids: Iterable<IngredientId>): IngredientId[] {
  const order = new Map(INGREDIENTS.map((i, idx) => [i.id, idx]));
  return [...new Set(ids)].sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(INGREDIENT_BY_ID[a].category);
    const cb = CATEGORY_ORDER.indexOf(INGREDIENT_BY_ID[b].category);
    return ca - cb || (order.get(a) ?? 0) - (order.get(b) ?? 0);
  });
}

/**
 * Today's menu and the pantry that stocks it. Recipes using shop-bought
 * ingredients are favoured so new unlocks actually show up, and the menu
 * never needs more crates than the kitchen has.
 */
export function buildMenu(
  d: KitchenDifficulty,
  unlocked: readonly IngredientId[],
  pantrySlots: number,
  rng: Rng,
): { menu: RecipeId[]; pantry: IngredientId[] } {
  const pool = availableRecipes(d.level, unlocked);
  const weight = (r: RecipeDef) =>
    1 + (recipeIngredients(r).some((i) => INGREDIENT_BY_ID[i].price > 0) ? 1.5 : 0) + (r.minLevel === d.level ? 0.5 : 0);
  const menu: RecipeId[] = [];
  const pantry = new Set<IngredientId>();
  const remaining = [...pool];
  while (menu.length < d.menuSize && remaining.length) {
    const total = remaining.reduce((s, r) => s + weight(r), 0);
    let roll = rng() * total;
    let idx = 0;
    for (; idx < remaining.length - 1; idx++) {
      roll -= weight(remaining[idx]);
      if (roll <= 0) break;
    }
    const pick = remaining.splice(idx, 1)[0];
    const needs = recipeIngredients(pick);
    const merged = new Set([...pantry, ...needs]);
    if (merged.size > pantrySlots) continue;
    menu.push(pick.id);
    for (const i of needs) pantry.add(i);
  }
  if (menu.length === 0) {
    menu.push("margherita");
    for (const i of recipeIngredients(RECIPE_BY_ID.margherita)) pantry.add(i);
  }
  // Crust swaps need a second dough on the shelf.
  if (d.crustSwapChance > 0 && pantry.size < pantrySlots) {
    const extraDough = unlocked.filter((i) => INGREDIENT_BY_ID[i].category === "dough" && !pantry.has(i));
    if (extraDough.length) pantry.add(extraDough[Math.floor(rng() * extraDough.length)]);
  }
  return { menu, pantry: sortPantry(pantry) };
}

const CRUST_NAMES: Partial<Record<IngredientId, string>> = { classic: "classic", thin: "thin crust", deep: "deep dish" };

export interface OrderContext {
  id: number;
  time: number;
  difficulty: KitchenDifficulty;
  menu: readonly RecipeId[];
  pantry: readonly IngredientId[];
  mods: KitchenMods;
  /** Avoid serving up the same recipe twice in a row when the menu allows it. */
  previous?: RecipeId;
}

export function makeOrder(ctx: OrderContext, rng: Rng): Order {
  const choices = ctx.menu.length > 1 && ctx.previous ? ctx.menu.filter((m) => m !== ctx.previous) : [...ctx.menu];
  const recipe = RECIPE_BY_ID[choices[Math.floor(rng() * choices.length)]];
  let dough = recipe.dough;
  let name = recipe.name;
  const doughs = ctx.pantry.filter((i) => INGREDIENT_BY_ID[i].category === "dough" && i !== recipe.dough);
  if (doughs.length && rng() < ctx.difficulty.crustSwapChance) {
    dough = doughs[Math.floor(rng() * doughs.length)];
    name = `${recipe.name} (${CRUST_NAMES[dough] ?? INGREDIENT_BY_ID[dough].label})`;
  }
  const rush = rng() < ctx.difficulty.rushOrderChance;
  const parts = { dough, sauce: recipe.sauce, cheese: recipe.cheese, toppings: [...recipe.toppings] };
  const d = ctx.difficulty;
  const patience = (d.patienceBase + d.patiencePerItem * components(parts).length) * ctx.mods.patience * (rush ? 0.65 : 1);
  return {
    id: ctx.id,
    recipeId: recipe.id,
    name,
    ...parts,
    patience,
    maxPatience: patience,
    rush,
    value: orderValue(parts),
    createdAt: ctx.time,
  };
}
