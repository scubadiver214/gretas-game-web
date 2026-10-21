/**
 * Everything that can go on a pizza. Starter ingredients (price 0) are always
 * stocked; the rest are bought in the shop and then show up in recipes.
 */

export type IngredientCategory = "dough" | "sauce" | "cheese" | "topping";

/** What has to happen to a raw ingredient before it can go on a pizza. */
export type PrepKind = "roll" | "chop" | "grate" | "none";

export type IngredientId =
  | "classic"
  | "thin"
  | "deep"
  | "tomato"
  | "pesto"
  | "bbq"
  | "garlic"
  | "mozzarella"
  | "cheddar"
  | "feta"
  | "pepperoni"
  | "mushroom"
  | "basil"
  | "olive"
  | "pepper"
  | "onion"
  | "pineapple"
  | "ham"
  | "chicken";

export interface IngredientDef {
  id: IngredientId;
  label: string;
  emoji: string;
  category: IngredientCategory;
  prep: PrepKind;
  /** Main colour (sauce spread, cheese melt, topping pieces). */
  color: string;
  /** Colour of the raw, unprepared item when it differs (e.g. a cheese block). */
  rawColor?: string;
  /** Shop price in coins; 0 = stocked from day one. */
  price: number;
  /** Points this component adds to an order's value. */
  value: number;
  /** Dough only: multiplies oven time (thin bakes fast, deep dish slowly). */
  bakeFactor?: number;
}

export const INGREDIENTS: readonly IngredientDef[] = [
  { id: "classic", label: "Classic crust", emoji: "🫓", category: "dough", prep: "roll", color: "#E8C27A", price: 0, value: 5, bakeFactor: 1 },
  { id: "thin", label: "Thin crust", emoji: "🥨", category: "dough", prep: "roll", color: "#F0D49A", price: 120, value: 8, bakeFactor: 0.75 },
  { id: "deep", label: "Deep dish", emoji: "🥧", category: "dough", prep: "roll", color: "#D9A65E", price: 300, value: 14, bakeFactor: 1.35 },

  { id: "tomato", label: "Tomato sauce", emoji: "🍅", category: "sauce", prep: "none", color: "#C8342A", price: 0, value: 5 },
  { id: "pesto", label: "Pesto", emoji: "🌱", category: "sauce", prep: "none", color: "#4E8F2F", price: 150, value: 8 },
  { id: "bbq", label: "BBQ sauce", emoji: "🍯", category: "sauce", prep: "none", color: "#6B2E1A", price: 220, value: 9 },
  { id: "garlic", label: "Garlic cream", emoji: "🧄", category: "sauce", prep: "none", color: "#F4ECD8", price: 180, value: 8 },

  { id: "mozzarella", label: "Mozzarella", emoji: "🧀", category: "cheese", prep: "grate", color: "#FFE8A3", rawColor: "#FFF4D6", price: 0, value: 5 },
  { id: "cheddar", label: "Cheddar", emoji: "🟧", category: "cheese", prep: "grate", color: "#F2A33A", rawColor: "#F5B04D", price: 120, value: 7 },
  { id: "feta", label: "Feta", emoji: "⬜", category: "cheese", prep: "grate", color: "#FAFAF5", rawColor: "#FFFFFF", price: 160, value: 8 },

  { id: "pepperoni", label: "Pepperoni", emoji: "🍕", category: "topping", prep: "chop", color: "#B8322A", rawColor: "#9E2A22", price: 0, value: 6 },
  { id: "mushroom", label: "Mushroom", emoji: "🍄", category: "topping", prep: "chop", color: "#D7B899", rawColor: "#C9A27E", price: 0, value: 6 },
  { id: "basil", label: "Basil", emoji: "🌿", category: "topping", prep: "none", color: "#1E7F4F", price: 0, value: 4 },
  { id: "olive", label: "Olives", emoji: "🫒", category: "topping", prep: "none", color: "#2F3A2F", price: 80, value: 5 },
  { id: "pepper", label: "Peppers", emoji: "🫑", category: "topping", prep: "chop", color: "#3FA34D", price: 100, value: 6 },
  { id: "onion", label: "Onion", emoji: "🧅", category: "topping", prep: "chop", color: "#E9D3E6", rawColor: "#B98AB2", price: 100, value: 6 },
  { id: "pineapple", label: "Pineapple", emoji: "🍍", category: "topping", prep: "chop", color: "#F7D44C", rawColor: "#C9A227", price: 140, value: 7 },
  { id: "ham", label: "Ham", emoji: "🍖", category: "topping", prep: "chop", color: "#F09A9A", rawColor: "#E57F7F", price: 140, value: 7 },
  { id: "chicken", label: "Chicken", emoji: "🍗", category: "topping", prep: "chop", color: "#E3B579", rawColor: "#D49B55", price: 200, value: 9 },
] as const;

export const INGREDIENT_BY_ID: Record<IngredientId, IngredientDef> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
) as Record<IngredientId, IngredientDef>;

export const STARTER_INGREDIENTS: readonly IngredientId[] = INGREDIENTS.filter((i) => i.price === 0).map((i) => i.id);

export const ALL_INGREDIENTS: readonly IngredientId[] = INGREDIENTS.map((i) => i.id);

export const CATEGORY_ORDER: readonly IngredientCategory[] = ["dough", "sauce", "cheese", "topping"];

export function isIngredientId(value: unknown): value is IngredientId {
  return typeof value === "string" && value in INGREDIENT_BY_ID;
}

/** Verb shown in hints and rejections ("Chop it first!"). */
export const PREP_VERB: Record<PrepKind, string> = {
  roll: "Roll",
  chop: "Chop",
  grate: "Grate",
  none: "",
};
