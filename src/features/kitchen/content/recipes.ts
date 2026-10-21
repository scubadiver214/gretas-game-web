import type { IngredientId } from "./ingredients";

export type RecipeId =
  | "margherita"
  | "pepperoni"
  | "funghi"
  | "marinara"
  | "double"
  | "veggie"
  | "hawaiian"
  | "pesto-garden"
  | "bbq-chicken"
  | "bianca"
  | "greek"
  | "supreme"
  | "meat-feast"
  | "tropical";

export interface RecipeDef {
  id: RecipeId;
  name: string;
  dough: IngredientId;
  /** null = no sauce on this one. */
  sauce: IngredientId | null;
  /** null = no cheese (marinara). */
  cheese: IngredientId | null;
  toppings: IngredientId[];
  /** Lowest difficulty level that can put it on the menu. */
  minLevel: number;
}

export const RECIPES: readonly RecipeDef[] = [
  { id: "margherita", name: "Margherita", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["basil"], minLevel: 1 },
  { id: "pepperoni", name: "Pepperoni", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["pepperoni"], minLevel: 1 },
  { id: "funghi", name: "Funghi", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["mushroom"], minLevel: 1 },
  { id: "marinara", name: "Marinara", dough: "classic", sauce: "tomato", cheese: null, toppings: ["basil", "olive"], minLevel: 2 },
  { id: "double", name: "Double Trouble", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["pepperoni", "mushroom"], minLevel: 2 },
  { id: "veggie", name: "Veggie", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["mushroom", "pepper", "olive"], minLevel: 2 },
  { id: "hawaiian", name: "Hawaiian", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["ham", "pineapple"], minLevel: 2 },
  { id: "pesto-garden", name: "Pesto Garden", dough: "thin", sauce: "pesto", cheese: "mozzarella", toppings: ["pepper", "basil"], minLevel: 2 },
  { id: "bbq-chicken", name: "BBQ Chicken", dough: "classic", sauce: "bbq", cheese: "cheddar", toppings: ["chicken", "onion"], minLevel: 3 },
  { id: "bianca", name: "Bianca", dough: "classic", sauce: "garlic", cheese: "mozzarella", toppings: ["mushroom", "onion"], minLevel: 3 },
  { id: "greek", name: "Greek", dough: "thin", sauce: "tomato", cheese: "feta", toppings: ["olive", "onion", "pepper"], minLevel: 3 },
  { id: "supreme", name: "Supreme", dough: "classic", sauce: "tomato", cheese: "mozzarella", toppings: ["pepperoni", "mushroom", "pepper", "onion", "olive"], minLevel: 4 },
  { id: "meat-feast", name: "Meat Feast", dough: "deep", sauce: "tomato", cheese: "cheddar", toppings: ["pepperoni", "ham", "chicken"], minLevel: 4 },
  { id: "tropical", name: "Tropical BBQ", dough: "thin", sauce: "bbq", cheese: "mozzarella", toppings: ["ham", "pineapple", "onion"], minLevel: 5 },
] as const;

export const RECIPE_BY_ID: Record<RecipeId, RecipeDef> = Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<RecipeId, RecipeDef>;

/** Every ingredient a recipe needs (dough, sauce, cheese, toppings). */
export function recipeIngredients(r: Pick<RecipeDef, "dough" | "sauce" | "cheese" | "toppings">): IngredientId[] {
  return [r.dough, ...(r.sauce ? [r.sauce] : []), ...(r.cheese ? [r.cheese] : []), ...r.toppings];
}
