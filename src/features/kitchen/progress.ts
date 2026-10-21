"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ShopItem } from "./content/shop";
import { EMPTY_PROGRESS, creditShift, purchase, sanitizeProgress, type KitchenProgress, type PurchaseResult } from "./shopRules";

interface KitchenProgressState extends KitchenProgress {
  buy: (item: Pick<ShopItem, "kind" | "id">) => PurchaseResult;
  credit: (coins: number, score: number) => void;
}

const pick = (s: KitchenProgress): KitchenProgress => ({
  coins: s.coins,
  ingredients: s.ingredients,
  upgrades: s.upgrades,
  shifts: s.shifts,
  bestScore: s.bestScore,
});

/** Coins, unlocked ingredients and upgrades for the pizzeria, saved on this device. */
export const useKitchenProgress = create<KitchenProgressState>()(
  persist<KitchenProgressState, [], [], KitchenProgress>(
    (set, get) => ({
      ...EMPTY_PROGRESS,
      buy: (item) => {
        const result = purchase(pick(get()), item);
        if (result.ok) set(result.progress);
        return result;
      },
      credit: (coins, score) => set(creditShift(pick(get()), coins, score)),
    }),
    {
      name: "gretas-game:kitchen",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: pick,
      merge: (persisted, current) => ({ ...current, ...sanitizeProgress(persisted) }),
    },
  ),
);
