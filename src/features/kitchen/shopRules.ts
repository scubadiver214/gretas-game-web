import { INGREDIENT_BY_ID, STARTER_INGREDIENTS, isIngredientId, type IngredientId } from "./content/ingredients";
import { UPGRADE_BY_ID, isUpgradeId, type ShopItem, type UpgradeId } from "./content/shop";

/** What the shop remembers between shifts. Kept on the device for now. */
export interface KitchenProgress {
  coins: number;
  /** Bought ingredients (starters are always available and not listed). */
  ingredients: IngredientId[];
  upgrades: UpgradeId[];
  shifts: number;
  bestScore: number;
}

export const EMPTY_PROGRESS: KitchenProgress = { coins: 0, ingredients: [], upgrades: [], shifts: 0, bestScore: 0 };

export function unlockedIngredients(p: Pick<KitchenProgress, "ingredients">): IngredientId[] {
  return [...new Set([...STARTER_INGREDIENTS, ...p.ingredients])];
}

export function owns(p: KitchenProgress, item: ShopItem): boolean {
  return item.kind === "ingredient" ? unlockedIngredients(p).includes(item.id) : p.upgrades.includes(item.id);
}

export function priceOf(item: Pick<ShopItem, "kind" | "id">): number {
  return item.kind === "ingredient" ? INGREDIENT_BY_ID[item.id as IngredientId].price : UPGRADE_BY_ID[item.id as UpgradeId].price;
}

export type PurchaseResult = { ok: true; progress: KitchenProgress } | { ok: false; reason: "owned" | "coins" };

/** Spend coins on an ingredient or upgrade. Prices come from the catalog, never the caller. */
export function purchase(p: KitchenProgress, item: Pick<ShopItem, "kind" | "id">): PurchaseResult {
  const full = { ...item, label: "", emoji: "", price: 0 } as ShopItem;
  if (owns(p, full)) return { ok: false, reason: "owned" };
  const price = priceOf(item);
  if (p.coins < price) return { ok: false, reason: "coins" };
  return {
    ok: true,
    progress:
      item.kind === "ingredient"
        ? { ...p, coins: p.coins - price, ingredients: [...p.ingredients, item.id as IngredientId] }
        : { ...p, coins: p.coins - price, upgrades: [...p.upgrades, item.id as UpgradeId] },
  };
}

export function creditShift(p: KitchenProgress, coins: number, score: number): KitchenProgress {
  return { ...p, coins: p.coins + Math.max(0, Math.floor(coins)), shifts: p.shifts + 1, bestScore: Math.max(p.bestScore, score) };
}

/** Drops anything unknown from older saves (renamed ingredients, removed upgrades). */
export function sanitizeProgress(raw: unknown): KitchenProgress {
  const p = (raw ?? {}) as Partial<KitchenProgress>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return {
    coins: num(p.coins),
    ingredients: Array.isArray(p.ingredients) ? [...new Set(p.ingredients.filter(isIngredientId))] : [],
    upgrades: Array.isArray(p.upgrades) ? [...new Set(p.upgrades.filter(isUpgradeId))] : [],
    shifts: num(p.shifts),
    bestScore: num(p.bestScore),
  };
}
